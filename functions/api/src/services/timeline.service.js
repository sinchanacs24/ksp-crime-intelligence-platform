'use strict';

const TimelineRepository = require('../repositories/timeline.repository');
const CaseMasterRepository = require('../repositories/caseMaster.repository');
const AccusedRepository = require('../repositories/accused.repository');
const { toDatetime } = require('../utils/datetime');

/**
 * Investigation Timeline (module 11) + automated case summary generation
 * (problem statement section 6). Builds a chronological event list by
 * merging explicit CaseTimeline entries with implicit milestones derivable
 * from CaseMaster/Accused/ArrestSurrender/ChargesheetDetails, so a case
 * has a meaningful timeline even before an officer manually logs events.
 */
class TimelineService {
  constructor(catalystApp) {
    this.timelineRepo = new TimelineRepository(catalystApp);
    this.caseRepo = new CaseMasterRepository(catalystApp);
    this.accusedRepo = new AccusedRepository(catalystApp);
  }

  async getCaseTimeline(caseMasterId) {
    const explicitEvents = await this.timelineRepo.getByCaseId(caseMasterId);
    const caseData = await this.caseRepo.getFullCaseById(caseMasterId);

    const derivedEvents = [];
    if (caseData) {
      derivedEvents.push({
        EventDate: caseData.CaseMaster.CrimeRegisteredDate,
        EventType: 'FIR Filed',
        Description: `FIR ${caseData.CaseMaster.CrimeNo} registered at ${caseData.Unit.UnitName}`
      });
    }

    const accused = await this.accusedRepo.getByCaseId(caseMasterId);
    for (const acc of accused) {
      const outcomes = await this.accusedRepo.getOutcomeTrail(acc.AccusedMasterID);
      outcomes.forEach((o) => {
        derivedEvents.push({
          EventDate: o.ArrestSurrenderDate,
          EventType: o.ArrestSurrenderTypeID === 1 ? 'Arrest' : 'Surrender',
          Description: `${acc.AccusedName} (${acc.PersonID}) - ${o.ArrestSurrenderTypeID === 1 ? 'arrested' : 'surrendered'}`
        });
      });
    }

    const merged = [...explicitEvents, ...derivedEvents]
      .filter((e) => e.EventDate)
      .sort((a, b) => new Date(a.EventDate) - new Date(b.EventDate));

    return merged;
  }

  async addManualEvent(caseMasterId, eventType, description, employeeId) {
    return this.timelineRepo.addEvent({
      CaseMasterID: caseMasterId, EventDate: toDatetime(new Date()),
      EventType: eventType, Description: description, CreatedByID: employeeId
    });
  }

  /**
   * Deterministic, template-based case summary — the auditable "ground
   * truth" that the LLM layer narrates in natural language rather than
   * generating facts from scratch. Keeps the case-summary feature
   * explainable end-to-end.
   */
  async generateCaseSummary(caseMasterId) {
    const caseData = await this.caseRepo.getFullCaseById(caseMasterId);
    if (!caseData) {
      const err = new Error('Case not found');
      err.statusCode = 404;
      err.expose = true;
      throw err;
    }
    const timeline = await this.getCaseTimeline(caseMasterId);
    const accused = await this.accusedRepo.getByCaseId(caseMasterId);

    return {
      caseMasterId,
      crimeNo: caseData.CaseMaster.CrimeNo,
      status: caseData.CaseStatusMaster.CaseStatusName,
      crimeType: `${caseData.CrimeHead.CrimeGroupName} / ${caseData.CrimeSubHead.CrimeHeadName}`,
      registeredDate: caseData.CaseMaster.CrimeRegisteredDate,
      station: caseData.Unit.UnitName,
      investigatingOfficer: caseData.Employee.FirstName,
      accusedCount: accused.length,
      timelineEventCount: timeline.length,
      timeline,
      briefFacts: caseData.CaseMaster.BriefFacts
    };
  }
}

module.exports = TimelineService;