'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const { success } = require('../utils/response');
const { MODULES } = require('../config/constants');
const NetworkService = require('../services/network.service');

const router = express.Router();

router.get('/accused/:id', authenticate, requirePermission(MODULES.NETWORK_ANALYSIS, 'read'), auditLog('CriminalNetworkEdge'),
  async (req, res, next) => {
    try {
      const depth = Number(req.query.depth) || 2;
      const service = new NetworkService(req.catalystApp);
      const graph = await service.getAccusedNetworkGraph(req.params.id, depth);
      return success(res, graph);
    } catch (err) { next(err); }
  });

router.get('/organized-crime-groups', authenticate, requirePermission(MODULES.NETWORK_ANALYSIS, 'read'),
  async (req, res, next) => {
    try {
      const service = new NetworkService(req.catalystApp);
      const groups = await service.detectOrganizedCrimeGroups({
        minSharedLinks: Number(req.query.minSharedLinks) || 3,
        minGroupSize: Number(req.query.minGroupSize) || 3
      });
      return success(res, groups);
    } catch (err) { next(err); }
  });

router.post('/link', authenticate, requirePermission(MODULES.NETWORK_ANALYSIS, 'write'), auditLog('CriminalNetworkEdge'),
  async (req, res, next) => {
    try {
      const service = new NetworkService(req.catalystApp);
      const result = await service.linkNodes(req.body);
      return success(res, result, {}, 201);
    } catch (err) { next(err); }
  });

module.exports = router;
