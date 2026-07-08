'use strict';

const BaseRepository = require('./base.repository');
const { TABLES } = require('../config/constants');
const { runZcql, fetchByIds } = require('../config/db');

class AccusedRepository extends BaseRepository {
  constructor(catalystApp) {
    super(catalystApp, TABLES.ACCUSED);
  }

  /**
   * Rewritten without JOIN (see db.js fetchByIds for why) — finds
   * matching Accused rows by name, then batch-fetches their related
   * CaseMaster rows in one IN-clause query, combining them in JS into
   * the same { Accused, CaseMaster } shape callers already expect.
   */
  async getCriminalHistory(accusedName) {
    const nameEscaped = String(accusedName).replace(/'/g, "''");
    const query = `SELECT * FROM ${TABLES.ACCUSED}
      WHERE AccusedName LIKE '*${nameEscaped}*'
      LIMIT 0, 200`;
    const accusedRows = await runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.ACCUSED });
    if (!accusedRows.length) return [];

    const caseMap = await fetchByIds(
      this.catalystApp, TABLES.CASE_MASTER, 'CaseMasterID', accusedRows.map((a) => a.CaseMasterID)
    );

    return accusedRows
      .map((accused) => ({ Accused: accused, CaseMaster: caseMap.get(String(accused.CaseMasterID)) }))
      .filter((r) => r.CaseMaster)
      .sort((a, b) => new Date(b.CaseMaster.CrimeRegisteredDate) - new Date(a.CaseMaster.CrimeRegisteredDate));
  }

  async getByCaseId(caseMasterId) {
    return this.find({ CaseMasterID: caseMasterId }, { limit: 100 });
  }

  async findRepeatOffenders({ minCases = 2, limit = 100 } = {}) {
    const query = `SELECT AccusedName, COUNT(AccusedName) as caseCount
      FROM ${TABLES.ACCUSED}
      GROUP BY AccusedName
      HAVING COUNT(AccusedName) >= ${Number(minCases)}
      ORDER BY COUNT(AccusedName) DESC
      LIMIT 0, ${Number(limit)}`;
    const rows = await runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.ACCUSED });
    return rows.map((row) => ({ AccusedName: row.AccusedName, caseCount: Number(row['COUNT(AccusedName)']) }));
  }

  async getOutcomeTrail(accusedMasterId) {
    const query = `SELECT * FROM ${TABLES.ARREST_SURRENDER}
      WHERE AccusedMasterID = ${Number(accusedMasterId)}
      ORDER BY ArrestSurrenderDate ASC
      LIMIT 0, 300`;
    return runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.ARREST_SURRENDER });
  }
}

module.exports = AccusedRepository;
