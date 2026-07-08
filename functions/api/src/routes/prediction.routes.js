'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { success } = require('../utils/response');
const { MODULES } = require('../config/constants');
const ForecastService = require('../services/forecast.service');

const router = express.Router();

router.get('/forecasts', authenticate, requirePermission(MODULES.PREDICTION, 'read'),
  async (req, res, next) => {
    try {
      const service = new ForecastService(req.catalystApp);
      const forecasts = await service.getLatestForecasts(req.query.unitId || null);
      return success(res, forecasts);
    } catch (err) { next(err); }
  });

// Manual trigger for demo purposes — production relies on the nightly
// forecast-job cron instead of this endpoint.
router.post('/forecasts/recompute', authenticate, requirePermission(MODULES.PREDICTION, 'write'),
  async (req, res, next) => {
    try {
      const service = new ForecastService(req.catalystApp);
      const results = await service.runAndPersist();
      return success(res, results, { count: results.length }, 201);
    } catch (err) { next(err); }
  });

module.exports = router;
