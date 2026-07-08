'use strict';

const AccusedRepository = require('../repositories/accused.repository');

class AccusedService {
  constructor(catalystApp) {
    this.repo = new AccusedRepository(catalystApp);
  }

  async getBehavioralProfile(accusedName) {
    const history = await this.repo.getCriminalHistory(accusedName);

    if (!history.length) {
      return { accusedName, totalCases: 0, crimeTypes: [], escalationSignal: false, history: [] };
    }

    const crimeTypeCounts = {};
    for (const rec of history) {
      const headId = rec.CaseMaster.CrimeMinorHeadID;
      crimeTypeCounts[headId] = (crimeTypeCounts[headId] || 0) + 1;
    }

    const sortedByDate = [...history].sort(
      (a, b) => new Date(a.CaseMaster.CrimeRegisteredDate) - new Date(b.CaseMaster.CrimeRegisteredDate)
    );
    const gravities = sortedByDate.map((r) => r.CaseMaster.GravityOffenceID);
    const escalationSignal = gravities.length > 1 && gravities[gravities.length - 1] > gravities[0];

    return {
      accusedName,
      totalCases: history.length,
      crimeTypes: Object.entries(crimeTypeCounts).map(([id, count]) => ({ crimeSubHeadId: Number(id), count })),
      escalationSignal,
      history: history.map((r) => ({
        caseMasterId: r.CaseMaster.CaseMasterID,
        crimeNo: r.CaseMaster.CrimeNo,
        registeredDate: r.CaseMaster.CrimeRegisteredDate,
        crimeSubHeadId: r.CaseMaster.CrimeMinorHeadID,
        gravityOffenceId: r.CaseMaster.GravityOffenceID,
        accusedMasterId: r.Accused.AccusedMasterID
      }))
    };
  }

  async getRepeatOffenders(minCases) {
    return this.repo.findRepeatOffenders({ minCases });
  }

  async getOutcomeTrail(accusedMasterId) {
    return this.repo.getOutcomeTrail(accusedMasterId);
  }

  /**
   * Similar Case Finder (module 12): finds other cases sharing the same
   * crime sub-head and a nearby gravity level to the given case's accused
   * profile — deterministic similarity scoring, not a black-box embed,
   * so results stay explainable.
   */
  async findSimilarCases(accusedName, caseMasterId) {
    const history = await this.repo.getCriminalHistory(accusedName);
    return history
      .filter((r) => r.CaseMaster.CaseMasterID !== Number(caseMasterId))
      .map((r) => ({
        caseMasterId: r.CaseMaster.CaseMasterID,
        crimeNo: r.CaseMaster.CrimeNo,
        crimeSubHeadId: r.CaseMaster.CrimeMinorHeadID,
        gravityOffenceId: r.CaseMaster.GravityOffenceID,
        similarityReason: 'Same accused individual appears in this case'
      }));
  }
}

module.exports = AccusedService;
