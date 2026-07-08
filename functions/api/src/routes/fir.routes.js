'use strict';

const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const { validate } = require('../middleware/validation.middleware');
const { success, failure } = require('../utils/response');
const { MODULES } = require('../config/constants');
const CaseMasterService = require('../services/caseMaster.service');
const TimelineService = require('../services/timeline.service');

const router = express.Router();

const searchSchema = Joi.object({
  crimeNo: Joi.string().allow('', null),
  unitId: Joi.number().allow(null),
  crimeSubHeadId: Joi.number().allow(null),
  caseStatusId: Joi.number().allow(null),
  gravityOffenceId: Joi.number().allow(null),
  dateFrom: Joi.string().allow('', null),
  dateTo: Joi.string().allow('', null),
  limit: Joi.number().default(50),
  offset: Joi.number().default(0)
});

router.get('/', authenticate, requirePermission(MODULES.FIR_SEARCH, 'read'), auditLog('CaseMaster'),
  validate(searchSchema, 'query'), async (req, res, next) => {
    try {
      const { limit, offset, ...filters } = req.query;
      const service = new CaseMasterService(req.catalystApp);
      const rows = await service.search(filters, { limit, offset });
      return success(res, rows, { count: rows.length });
    } catch (err) { next(err); }
  });

router.get('/:id', authenticate, requirePermission(MODULES.FIR_SEARCH, 'read'), auditLog('CaseMaster'),
  async (req, res, next) => {
    try {
      const service = new CaseMasterService(req.catalystApp);
      const caseData = await service.getCaseDetail(req.params.id);
      return success(res, caseData);
    } catch (err) { next(err); }
  });

router.get('/:id/timeline', authenticate, requirePermission(MODULES.FIR_SEARCH, 'read'),
  async (req, res, next) => {
    try {
      const service = new TimelineService(req.catalystApp);
      const timeline = await service.getCaseTimeline(req.params.id);
      return success(res, timeline);
    } catch (err) { next(err); }
  });

router.get('/:id/summary', authenticate, requirePermission(MODULES.FIR_SEARCH, 'read'),
  async (req, res, next) => {
    try {
      const service = new TimelineService(req.catalystApp);
      const summary = await service.generateCaseSummary(req.params.id);
      return success(res, summary);
    } catch (err) { next(err); }
  });

router.post('/:id/timeline', authenticate, requirePermission(MODULES.FIR_SEARCH, 'write'), auditLog('CaseTimeline'),
  validate(Joi.object({ eventType: Joi.string().required(), description: Joi.string().required() })),
  async (req, res, next) => {
    try {
      const service = new TimelineService(req.catalystApp);
      const result = await service.addManualEvent(req.params.id, req.body.eventType, req.body.description, req.user.employeeId);
      return success(res, result, {}, 201);
    } catch (err) { next(err); }
  });

module.exports = router;
