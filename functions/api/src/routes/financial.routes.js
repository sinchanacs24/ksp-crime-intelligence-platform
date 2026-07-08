'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const { success } = require('../utils/response');
const { MODULES } = require('../config/constants');
const FinancialService = require('../services/financial.service');

const router = express.Router();

router.get('/case/:caseId/transactions', authenticate, requirePermission(MODULES.FINANCIAL_CRIME, 'read'), auditLog('FinancialTransaction'),
  async (req, res, next) => {
    try {
      const service = new FinancialService(req.catalystApp);
      const rows = await service.getCaseTransactions(req.params.caseId);
      return success(res, rows);
    } catch (err) { next(err); }
  });

router.get('/trace/:accountId', authenticate, requirePermission(MODULES.FINANCIAL_CRIME, 'read'), auditLog('FinancialTransaction'),
  async (req, res, next) => {
    try {
      const hops = Number(req.query.hops) || 3;
      const service = new FinancialService(req.catalystApp);
      const trail = await service.traceMoneyTrail(req.params.accountId, hops);
      return success(res, trail);
    } catch (err) { next(err); }
  });

router.get('/flagged', authenticate, requirePermission(MODULES.FINANCIAL_CRIME, 'read'),
  async (req, res, next) => {
    try {
      const service = new FinancialService(req.catalystApp);
      const rows = await service.getFlaggedTransactions(Number(req.query.limit) || 50);
      return success(res, rows);
    } catch (err) { next(err); }
  });

module.exports = router;
