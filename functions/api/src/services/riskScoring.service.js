'use strict';

const AccusedRepository = require('../repositories/accused.repository');
const { table, runZcql } = require('../config/db');
const { TABLES } = require('../config/constants');
const { toDatetime } = require('../utils/datetime');

class RiskScoringService {
  constructor(catalystApp) {
    this.catalystApp = catalystApp;
    this.accusedRepo = new AccusedRepository(catalystApp);
  }

  async computeRiskScore(accusedMasterId, accusedName) {
    const history = await this.accusedRepo.getCriminalHistory(accusedName);
    const outcomes = await this.accusedRepo.getOutcomeTrail(accusedMasterId);

    const factors = [];
    let score = 0;

    const caseCountPoints = Math.min(history.length * 8, 40);
    factors.push({ factor: 'Prior case count', value: history.length, points: caseCountPoints });
    score += caseCountPoints;

    const avgGravity = history.length
      ? history.reduce((sum, r) => sum + (r.CaseMaster.GravityOffenceID || 1), 0) / history.length
      : 0;
    const gravityPoints = Math.min(Math.round(avgGravity * 10), 30);
    factors.push({ factor: 'Average offence gravity', value: avgGravity.toFixed(2), points: gravityPoints });
    score += gravityPoints;

    const mostRecent = history
      .map((r) => new Date(r.CaseMaster.CrimeRegisteredDate))
      .sort((a, b) => b - a)[0];
    const monthsSinceLast = mostRecent ? (Date.now() - mostRecent) / (1000 * 60 * 60 * 24 * 30) : 999;
    const recencyPoints = monthsSinceLast < 6 ? 20 : monthsSinceLast < 12 ? 10 : 0;
    factors.push({ factor: 'Recency of last offence', value: `${Math.round(monthsSinceLast)} months ago`, points: recencyPoints });
    score += recencyPoints;

    const arrestCount = outcomes.length;
    const arrestPoints = Math.min(arrestCount * 5, 10);
    factors.push({ factor: 'Prior arrest/surrender events', value: arrestCount, points: arrestPoints });
    score += arrestPoints;

    score = Math.min(score, 100);

    const record = {
      AccusedMasterID: accusedMasterId, Score: score, ModelVersion: 'weighted-factor-v1',
      ComputedDate: toDatetime(new Date()), ExplanationJSON: JSON.stringify(factors)
    };
    await table(this.catalystApp, TABLES.OFFENDER_RISK_SCORE).insertRow(record);

    return { accusedMasterId, score, riskLevel: this._riskLevel(score), factors };
  }

  _riskLevel(score) {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  }

  async getLatestScore(accusedMasterId) {
    const query = `SELECT * FROM ${TABLES.OFFENDER_RISK_SCORE}
      WHERE AccusedMasterID = ${Number(accusedMasterId)}
      ORDER BY ComputedDate DESC LIMIT 0, 1`;
    const rows = await runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.OFFENDER_RISK_SCORE });
    return rows[0] || null;
  }
}

module.exports = RiskScoringService;