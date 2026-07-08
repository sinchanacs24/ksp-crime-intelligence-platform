'use strict';

const BaseRepository = require('./base.repository');
const { TABLES } = require('../config/constants');

class TimelineRepository extends BaseRepository {
  constructor(catalystApp) {
    super(catalystApp, TABLES.CASE_TIMELINE);
  }

  async getByCaseId(caseMasterId) {
    return this.find({ CaseMasterID: caseMasterId }, { orderBy: 'EventDate ASC', limit: 200 });
  }

  async addEvent(event) {
    return this.insert(event);
  }
}

module.exports = TimelineRepository;
