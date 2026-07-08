'use strict';

const BaseRepository = require('./base.repository');
const { TABLES } = require('../config/constants');
const { runZcql } = require('../config/db');
const { buildWhereClause } = require('../utils/zcqlBuilder');

class CaseMasterRepository extends BaseRepository {
  constructor(catalystApp) {
    super(catalystApp, TABLES.CASE_MASTER);
  }

  /**
   * Catalyst's ZCQL JOIN requires an actual Lookup-type relationship
   * between tables, which this schema doesn't use — so the full case
   * view is built from one query per related table instead, combined
   * here into the same { CaseMaster, CaseCategory, ... } shape the
   * rest of the codebase (routes, PDF export) already expects.
   */
  async getFullCaseById(caseMasterId) {
    const caseMaster = await this.findById('CaseMasterID', caseMasterId);
    if (!caseMaster) return null;

    const [category, gravity, crimeHead, crimeSubHead, status, court, employee, unit] = await Promise.all([
      new BaseRepository(this.catalystApp, TABLES.CASE_CATEGORY).findById('CaseCategoryID', caseMaster.CaseCategoryID),
      new BaseRepository(this.catalystApp, TABLES.GRAVITY_OFFENCE).findById('GravityOffenceID', caseMaster.GravityOffenceID),
      new BaseRepository(this.catalystApp, TABLES.CRIME_HEAD).findById('CrimeHeadID', caseMaster.CrimeMajorHeadID),
      new BaseRepository(this.catalystApp, TABLES.CRIME_SUB_HEAD).findById('CrimeSubHeadID', caseMaster.CrimeMinorHeadID),
      new BaseRepository(this.catalystApp, TABLES.CASE_STATUS_MASTER).findById('CaseStatusID', caseMaster.CaseStatusID),
      new BaseRepository(this.catalystApp, TABLES.COURT).findById('CourtID', caseMaster.CourtID),
      new BaseRepository(this.catalystApp, TABLES.EMPLOYEE).findById('EmployeeID', caseMaster.PolicePersonID),
      new BaseRepository(this.catalystApp, TABLES.UNIT).findById('UnitID', caseMaster.PoliceStationID)
    ]);

    return {
      CaseMaster: caseMaster,
      CaseCategory: category,
      GravityOffence: gravity,
      CrimeHead: crimeHead,
      CrimeSubHead: crimeSubHead,
      CaseStatusMaster: status,
      Court: court,
      Employee: employee,
      Unit: unit
    };
  }

  async searchCases(filters = {}, { limit = 50, offset = 0 } = {}) {
    const {
      crimeNo, unitId, crimeSubHeadId, caseStatusId, gravityOffenceId, dateFrom, dateTo
    } = filters;

    const conditions = {};
    if (crimeNo) conditions.CrimeNo = { op: 'LIKE', value: `*${crimeNo}*` };
    if (unitId) conditions.PoliceStationID = unitId;
    if (crimeSubHeadId) conditions.CrimeMinorHeadID = crimeSubHeadId;
    if (caseStatusId) conditions.CaseStatusID = caseStatusId;
    if (gravityOffenceId) conditions.GravityOffenceID = gravityOffenceId;

    const where = buildWhereClause(conditions);
    let dateFilter = '';
    if (dateFrom) dateFilter += ` AND CrimeRegisteredDate >= '${dateFrom}'`;
    if (dateTo) dateFilter += ` AND CrimeRegisteredDate <= '${dateTo}'`;

    const query = `SELECT * FROM ${TABLES.CASE_MASTER} ${where} ${dateFilter}
      ORDER BY CrimeRegisteredDate DESC LIMIT ${offset}, ${limit}`;

    return runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.CASE_MASTER });
  }

  async getCrimeTrend({ unitId = null, dateFrom, dateTo }) {
    const conditions = [];
    if (unitId) conditions.push(`PoliceStationID = ${Number(unitId)}`);
    if (dateFrom) conditions.push(`CrimeRegisteredDate >= '${dateFrom}'`);
    if (dateTo) conditions.push(`CrimeRegisteredDate <= '${dateTo}'`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `SELECT CrimeMinorHeadID, CrimeRegisteredDate, CaseMasterID
      FROM ${TABLES.CASE_MASTER} ${where}
      ORDER BY CrimeRegisteredDate ASC LIMIT 0, 300`;

    return runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.CASE_MASTER });
  }

  async getGeoTaggedCases({ dateFrom, dateTo, crimeSubHeadId }) {
    const conditions = ['latitude IS NOT NULL', 'longitude IS NOT NULL'];
    if (dateFrom) conditions.push(`CrimeRegisteredDate >= '${dateFrom}'`);
    if (dateTo) conditions.push(`CrimeRegisteredDate <= '${dateTo}'`);
    if (crimeSubHeadId) conditions.push(`CrimeMinorHeadID = ${Number(crimeSubHeadId)}`);

    const query = `SELECT CaseMasterID, latitude, longitude, CrimeMinorHeadID, CrimeRegisteredDate
      FROM ${TABLES.CASE_MASTER} WHERE ${conditions.join(' AND ')} LIMIT 0, 300`;

    return runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.CASE_MASTER });
  }

  async getDashboardCounts() {
    const query = `SELECT CaseStatusID, CaseMasterID FROM ${TABLES.CASE_MASTER} LIMIT 0, 300`;
    return runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.CASE_MASTER });
  }
}

module.exports = CaseMasterRepository;
