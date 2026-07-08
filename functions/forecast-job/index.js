'use strict';

/**
 * Catalyst Job Function: nightly crime forecast recompute (module 15,
 * Hotspot Forecast). Scheduled via Catalyst Job Scheduling / Cloud Cron
 * at "0 2 * * *" (2 AM daily) as declared in the root catalyst.json.
 *
 * Self-contained (doesn't import from the api function) since Catalyst
 * deploys each function independently — the forecasting logic here is
 * a standalone copy of functions/api/src/services/forecast.service.js's
 * algorithm, kept in sync manually. If you change the trend model,
 * update both places.
 */

const catalyst = require('zcatalyst-sdk-node');

function linearSlope(values) {
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

async function computeForecasts(catalystApp) {
  const zcql = catalystApp.zcql();
  const rows = await zcql.executeZCQLQuery(
    'SELECT PoliceStationID, CrimeMinorHeadID, CrimeRegisteredDate FROM CaseMaster LIMIT 0, 20000'
  );
  const flatRows = rows.map((r) => r.CaseMaster);

  const series = {};
  flatRows.forEach((r) => {
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
    if (counts.length < 3) continue;

    const recent = counts.slice(-6);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const slope = linearSlope(recent);
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
      GeneratedDate: new Date().toISOString()
    });
  }
  return forecasts;
}

module.exports = async (jobRequest, context) => {
  try {
    const catalystApp = catalyst.initialize(context);
    console.log('Computing nightly crime forecasts...');
    const forecasts = await computeForecasts(catalystApp);

    const table = catalystApp.datastore().table('CrimeForecast');
    let inserted = 0;
    for (const f of forecasts) {
      // eslint-disable-next-line no-await-in-loop
      await table.insertRow(f).catch((err) => console.error('Forecast insert failed', err.message));
      inserted += 1;
    }

    console.log(`Forecast job complete: ${inserted} forecast rows written.`);
    context.closeWithSuccess();
  } catch (err) {
    console.error('Forecast job failed:', err);
    context.closeWithFailure();
  }
};
