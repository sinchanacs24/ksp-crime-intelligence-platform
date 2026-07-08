'use strict';

const BaseRepository = require('./base.repository');
const { TABLES } = require('../config/constants');
const { runZcql, fetchByIds } = require('../config/db');

class VictimRepository extends BaseRepository {
  constructor(catalystApp) {
    super(catalystApp, TABLES.VICTIM);
  }

  async getByCaseId(caseMasterId) {
    return this.find({ CaseMasterID: caseMasterId }, { limit: 100 });
  }

  /**
   * Rewritten without JOIN — fetches all victims, batch-fetches their
   * related cases, then applies the date/crime-type filters in JS.
   * Fine at this dataset's scale (a few hundred rows); would need a
   * different approach at much larger volumes.
   */
  async getDemographicBreakdown({ dateFrom, dateTo, crimeSubHeadId } = {}) {
    const victimQuery = `SELECT * FROM ${TABLES.VICTIM} LIMIT 0, 300`;
    const victims = await runZcql(this.catalystApp, victimQuery, { flatten: true, tableName: TABLES.VICTIM });
    if (!victims.length) return [];

    const caseMap = await fetchByIds(
      this.catalystApp, TABLES.CASE_MASTER, 'CaseMasterID', victims.map((v) => v.CaseMasterID)
    );

    return victims
      .map((victim) => ({ Victim: victim, CaseMaster: caseMap.get(String(victim.CaseMasterID)) }))
      .filter((r) => {
        if (!r.CaseMaster) return false;
        if (dateFrom && r.CaseMaster.CrimeRegisteredDate < dateFrom) return false;
        if (dateTo && r.CaseMaster.CrimeRegisteredDate > dateTo) return false;
        if (crimeSubHeadId && Number(r.CaseMaster.CrimeMinorHeadID) !== Number(crimeSubHeadId)) return false;
        return true;
      });
  }

  /**
   * Rewritten without JOIN — fetches complainants, then batch-fetches
   * occupation/religion/caste/case lookups, combining in JS.
   */
  async getComplainantSocioProfile({ dateFrom, dateTo } = {}) {
    const complainantQuery = `SELECT * FROM ${TABLES.COMPLAINANT_DETAILS} LIMIT 0, 300`;
    const complainants = await runZcql(
      this.catalystApp, complainantQuery, { flatten: true, tableName: TABLES.COMPLAINANT_DETAILS }
    );
    if (!complainants.length) return [];

    const [occupationMap, religionMap, casteMap, caseMap] = await Promise.all([
      fetchByIds(this.catalystApp, TABLES.OCCUPATION_MASTER, 'OccupationID', complainants.map((c) => c.OccupationID)),
      fetchByIds(this.catalystApp, TABLES.RELIGION_MASTER, 'ReligionID', complainants.map((c) => c.ReligionID)),
      fetchByIds(this.catalystApp, TABLES.CASTE_MASTER, 'caste_master_id', complainants.map((c) => c.CasteID)),
      fetchByIds(this.catalystApp, TABLES.CASE_MASTER, 'CaseMasterID', complainants.map((c) => c.CaseMasterID))
    ]);

    return complainants
      .map((c) => ({
        ComplainantDetails: c,
        OccupationMaster: occupationMap.get(String(c.OccupationID)),
        ReligionMaster: religionMap.get(String(c.ReligionID)),
        CasteMaster: casteMap.get(String(c.CasteID)),
        CaseMaster: caseMap.get(String(c.CaseMasterID))
      }))
      .filter((r) => {
        if (!r.CaseMaster || !r.OccupationMaster) return false;
        if (dateFrom && r.CaseMaster.CrimeRegisteredDate < dateFrom) return false;
        if (dateTo && r.CaseMaster.CrimeRegisteredDate > dateTo) return false;
        return true;
      });
  }
}

module.exports = VictimRepository;
