'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const { success } = require('../utils/response');
const { MODULES } = require('../config/constants');
const AccusedService = require('../services/accused.service');
const RiskScoringService = require('../services/riskScoring.service');

const router = express.Router();

router.get('/profile', authenticate, requirePermission(MODULES.CRIMINAL_SEARCH, 'read'), auditLog('Accused'),
  async (req, res, next) => {
    try {
      const { name } = req.query;
      const service = new AccusedService(req.catalystApp);
      const profile = await service.getBehavioralProfile(name);
      return success(res, profile);
    } catch (err) { next(err); }
  });

router.get('/repeat-offenders', authenticate, requirePermission(MODULES.CRIMINAL_SEARCH, 'read'),
  async (req, res, next) => {
    try {
      const service = new AccusedService(req.catalystApp);
      const minCases = Number(req.query.minCases) || 2;
      const rows = await service.getRepeatOffenders(minCases);
      return success(res, rows);
    } catch (err) { next(err); }
  });

router.get('/:id/outcomes', authenticate, requirePermission(MODULES.CRIMINAL_SEARCH, 'read'),
  async (req, res, next) => {
    try {
      const service = new AccusedService(req.catalystApp);
      const outcomes = await service.getOutcomeTrail(req.params.id);
      return success(res, outcomes);
    } catch (err) { next(err); }
  });

router.get('/:id/similar-cases', authenticate, requirePermission(MODULES.CRIMINAL_SEARCH, 'read'),
  async (req, res, next) => {
    try {
      const { name, caseMasterId } = req.query;
      const service = new AccusedService(req.catalystApp);
      const rows = await service.findSimilarCases(name, caseMasterId);
      return success(res, rows);
    } catch (err) { next(err); }
  });

router.post('/:id/risk-score', authenticate, requirePermission(MODULES.PREDICTION, 'write'), auditLog('OffenderRiskScore'),
  async (req, res, next) => {
    try {
      const { name } = req.body;
      const service = new RiskScoringService(req.catalystApp);
      const result = await service.computeRiskScore(req.params.id, name);
      return success(res, result, {}, 201);
    } catch (err) { next(err); }
  });

router.get('/:id/risk-score', authenticate, requirePermission(MODULES.PREDICTION, 'read'),
  async (req, res, next) => {
    try {
      const service = new RiskScoringService(req.catalystApp);
      const result = await service.getLatestScore(req.params.id);
      return success(res, result);
    } catch (err) { next(err); }
  });

module.exports = router;
