'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const { success } = require('../utils/response');
const { MODULES } = require('../config/constants');
const VictimService = require('../services/victim.service');

const router = express.Router();

router.get('/case/:caseId', authenticate, requirePermission(MODULES.VICTIM_SEARCH, 'read'), auditLog('Victim'),
  async (req, res, next) => {
    try {
      const service = new VictimService(req.catalystApp);
      const rows = await service.getCaseVictims(req.params.caseId);
      return success(res, rows);
    } catch (err) { next(err); }
  });

router.get('/demographics', authenticate, requirePermission(MODULES.VICTIM_SEARCH, 'read'),
  async (req, res, next) => {
    try {
      const service = new VictimService(req.catalystApp);
      const rows = await service.getVictimDemographicInsights(req.query);
      return success(res, rows);
    } catch (err) { next(err); }
  });

router.get('/socio-economic', authenticate, requirePermission(MODULES.ANALYTICS, 'read'),
  async (req, res, next) => {
    try {
      const service = new VictimService(req.catalystApp);
      const rows = await service.getSocioEconomicCorrelation(req.query);
      return success(res, rows);
    } catch (err) { next(err); }
  });

module.exports = router;
