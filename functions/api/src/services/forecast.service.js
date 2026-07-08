'use strict';

const CaseMasterRepository = require('../repositories/caseMaster.repository');
const { table, runZcql } = require('../config/db');
const { TABLES } = require('../config/constants');

/**
 * Catalyst Data Store's DATETIME columns do not accept standard ISO
 * 8601 strings — the accepted format is "YYYY-MM-DD HH:mm:ss" (no
 * 'T'/'Z', no milliseconds). See functions/seed-job/lib/generate.js
 * for the original discovery of this; duplicated here in a minimal
 * form since this service runs in the api function, not seed-job.
 */
function toDatetime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Crime Forecasting & Hotspot Prediction (problem statement section 8,
 * modules 14-15). Uses a transparent moving-average + trend-slope model
 * per (station, crime sub-head) pair rather than an opaque black-box
 * model, satisfying the Explainable AI requirement (section 9) — the
 * forecast can always be traced back to "last N months of counts".
 *
 * This is designed to run inside forecast-job (a Catalyst Job Function
 * with a 15-minute budget, scheduled nightly via Job Scheduling) since
 * it aggregates across the whole CaseMaster table, which could exceed
 * the 30-second Advanced I/O function limit at full data volume.
 */
class ForecastService {
  constructor(catalystApp) {
    this.catalystApp = catalystApp;
    this.caseRepo = new CaseMasterRepository(catalystApp);
  }

  /**
   * Groups historical case counts into monthly buckets per
   * (station, crime sub-head), computes a simple linear trend, and
   * projects forward one month with a risk band.
   */
  async computeForecasts() {
    const query = `SELECT PoliceStationID, CrimeMinorHeadID, CrimeRegisteredDate
      FROM ${TABLES.CASE_MASTER} LIMIT 0, 300`;
    const rows = await runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.CASE_MASTER });

    const series = {};
    rows.forEach((r) => {
      const month = new Date(r.CrimeRegisteredDate).toISOString().slice(0, 7);
      const key = `${r.PoliceStationID}|${r.CrimeMinorHeadID}`;
      series[key] = series[key] || {};
      series[key][month] = (series[key][month] || 0) + 1;
    });

    const forecasts = [];
    const now = new Date();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    for (const [key, monthCounts] of Object.entries(series)) {
      const [unitId, crimeSubHeadId] = key.split('|').map(Number);
      const months = Object.keys(monthCounts).sort();
      const counts = months.map((m) => monthCounts[m]);
      if (counts.length < 3) continue; // not enough history to trend

      const recent = counts.slice(-6); // last 6 months
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const slope = this._linearSlope(recent);
      const projected = Math.max(0, avg + slope);

      let riskLevel = 'Low';
      if (projected >= avg * 1.5 && projected > 3) riskLevel = 'High';
      else if (projected >= avg * 1.15) riskLevel = 'Medium';

      forecasts.push({
        UnitID: unitId,
        CrimeSubHeadID: crimeSubHeadId,
        PredictedWindowStart: nextMonthStart.toISOString().slice(0, 10),
        PredictedWindowEnd: nextMonthEnd.toISOString().slice(0, 10),
        RiskLevel: riskLevel,
        ModelVersion: 'trend-slope-v1',
        GeneratedDate: toDatetime(new Date()),
        _explanation: { recentMonthlyAvg: avg.toFixed(2), trendSlope: slope.toFixed(2), projectedCount: projected.toFixed(2) }
      });
    }

    return forecasts;
  }

  _linearSlope(values) {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    values.forEach((y, x) => {
      num += (x - xMean) * (y - yMean);
      den += (x - xMean) ** 2;
    });
    return den === 0 ? 0 : num / den;
  }

  async persistForecasts(forecasts) {
    const forecastTable = table(this.catalystApp, TABLES.CRIME_FORECAST);
    const results = [];
    for (const f of forecasts) {
      const { _explanation, ...record } = f;
      const inserted = await forecastTable.insertRow(record);
      results.push({ ...inserted, explanation: _explanation });
    }
    return results;
  }

  async runAndPersist() {
    const forecasts = await this.computeForecasts();
    return this.persistForecasts(forecasts);
  }

  async getLatestForecasts(unitId = null) {
    const where = unitId ? `WHERE UnitID = ${Number(unitId)}` : '';
    const query = `SELECT * FROM ${TABLES.CRIME_FORECAST} ${where}
      ORDER BY GeneratedDate DESC LIMIT 0, 200`;
    return runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.CRIME_FORECAST });
  }
}

module.exports = ForecastService;