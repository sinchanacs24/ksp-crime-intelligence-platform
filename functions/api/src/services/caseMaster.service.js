'use strict';

const CaseMasterRepository = require('../repositories/caseMaster.repository');

class CaseMasterService {
  constructor(catalystApp) {
    this.repo = new CaseMasterRepository(catalystApp);
  }

  async getCaseDetail(caseMasterId) {
    const caseData = await this.repo.getFullCaseById(caseMasterId);
    if (!caseData) {
      const err = new Error('Case not found');
      err.statusCode = 404;
      err.expose = true;
      throw err;
    }
    return caseData;
  }

  async search(filters, pagination) {
    return this.repo.searchCases(filters, pagination);
  }

  async getCrimeTrendSeries(params) {
    const rows = await this.repo.getCrimeTrend(params);
    const buckets = {};
    for (const row of rows) {
      const month = new Date(row.CrimeRegisteredDate).toISOString().slice(0, 7);
      const key = `${row.CrimeMinorHeadID}|${month}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    return Object.entries(buckets).map(([key, count]) => {
      const [crimeSubHeadId, month] = key.split('|');
      return { crimeSubHeadId: Number(crimeSubHeadId), month, count };
    });
  }

  async getHeatmapPoints(params) {
    const rows = await this.repo.getGeoTaggedCases(params);
    return rows.map((r) => ({
      caseMasterId: r.CaseMasterID,
      lat: parseFloat(r.latitude),
      lng: parseFloat(r.longitude),
      crimeSubHeadId: r.CrimeMinorHeadID,
      date: r.CrimeRegisteredDate
    }));
  }

  async getDashboardSummary() {
    const rows = await this.repo.getDashboardCounts();
    const byStatus = {};
    rows.forEach((r) => { byStatus[r.CaseStatusID] = (byStatus[r.CaseStatusID] || 0) + 1; });
    return { totalCases: rows.length, byStatus };
  }
}

module.exports = CaseMasterService;
