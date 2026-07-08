'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { success } = require('../utils/response');
const { MODULES } = require('../config/constants');
const CaseMasterService = require('../services/caseMaster.service');
const VictimService = require('../services/victim.service');

const router = express.Router();

router.get('/dashboard-summary', authenticate, requirePermission(MODULES.DASHBOARD, 'read'),
  async (req, res, next) => {
    try {
      const service = new CaseMasterService(req.catalystApp);
      const summary = await service.getDashboardSummary();
      return success(res, summary);
    } catch (err) { next(err); }
  });

router.get('/crime-trend', authenticate, requirePermission(MODULES.ANALYTICS, 'read'),
  async (req, res, next) => {
    try {
      const service = new CaseMasterService(req.catalystApp);
      const trend = await service.getCrimeTrendSeries(req.query);
      return success(res, trend);
    } catch (err) { next(err); }
  });

router.get('/heatmap', authenticate, requirePermission(MODULES.ANALYTICS, 'read'),
  async (req, res, next) => {
    try {
      const service = new CaseMasterService(req.catalystApp);
      const points = await service.getHeatmapPoints(req.query);
      return success(res, points);
    } catch (err) { next(err); }
  });

router.get('/sociological-insights', authenticate, requirePermission(MODULES.ANALYTICS, 'read'),
  async (req, res, next) => {
    try {
      const service = new VictimService(req.catalystApp);
      const demographics = await service.getVictimDemographicInsights(req.query);
      const socioEconomic = await service.getSocioEconomicCorrelation(req.query);
      return success(res, { demographics, socioEconomic });
    } catch (err) { next(err); }
  });

module.exports = router;
