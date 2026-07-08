'use strict';

const VictimRepository = require('../repositories/victim.repository');

function bucketAge(age) {
  if (age == null) return 'Unknown';
  if (age < 12) return '0-11';
  if (age < 18) return '12-17';
  if (age < 30) return '18-29';
  if (age < 45) return '30-44';
  if (age < 60) return '45-59';
  return '60+';
}

class VictimService {
  constructor(catalystApp) {
    this.repo = new VictimRepository(catalystApp);
  }

  async getCaseVictims(caseMasterId) {
    return this.repo.getByCaseId(caseMasterId);
  }

  async getVictimDemographicInsights(params) {
    const rows = await this.repo.getDemographicBreakdown(params);
    const crossTab = {};
    for (const row of rows) {
      const ageBand = bucketAge(row.Victim.AgeYear);
      const gender = row.Victim.GenderID || 'Unknown';
      const crimeSubHeadId = row.CaseMaster.CrimeMinorHeadID;
      const key = `${ageBand}|${gender}|${crimeSubHeadId}`;
      crossTab[key] = (crossTab[key] || 0) + 1;
    }
    return Object.entries(crossTab).map(([key, count]) => {
      const [ageBand, gender, crimeSubHeadId] = key.split('|');
      return { ageBand, gender, crimeSubHeadId: Number(crimeSubHeadId), count };
    });
  }

  async getSocioEconomicCorrelation(params) {
    const rows = await this.repo.getComplainantSocioProfile(params);
    const summary = {};
    for (const row of rows) {
      const occupation = row.OccupationMaster.OccupationName;
      const crimeSubHeadId = row.CaseMaster.CrimeMinorHeadID;
      const key = `${occupation}|${crimeSubHeadId}`;
      summary[key] = (summary[key] || 0) + 1;
    }
    return Object.entries(summary).map(([key, count]) => {
      const [occupation, crimeSubHeadId] = key.split('|');
      return { occupation, crimeSubHeadId: Number(crimeSubHeadId), count };
    });
  }
}

module.exports = VictimService;
