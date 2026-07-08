'use strict';

const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const { validate } = require('../middleware/validation.middleware');
const { success, failure } = require('../utils/response');
const { MODULES, TABLES } = require('../config/constants');
const { table, runZcql, fetchByIds } = require('../config/db');

const router = express.Router();

// --- User management ---
router.get('/users', authenticate, requirePermission(MODULES.ADMIN_PANEL, 'read'), async (req, res, next) => {
  try {
    const usersQuery = `SELECT * FROM ${TABLES.APP_USER} LIMIT 0, 300`;
    const appUsers = await runZcql(req.catalystApp, usersQuery, { flatten: true, tableName: TABLES.APP_USER });

    const [employeeMap, roleMap] = await Promise.all([
      fetchByIds(req.catalystApp, TABLES.EMPLOYEE, 'EmployeeID', appUsers.map((u) => u.EmployeeID)),
      fetchByIds(req.catalystApp, TABLES.ROLE, 'RoleID', appUsers.map((u) => u.RoleID))
    ]);

    const rows = appUsers.map((u) => ({
      AppUser: u,
      Employee: employeeMap.get(String(u.EmployeeID)),
      Role: roleMap.get(String(u.RoleID))
    }));

    return success(res, rows);
  } catch (err) { next(err); }
});

router.post('/users', authenticate, requirePermission(MODULES.ADMIN_PANEL, 'write'), auditLog('AppUser', 'CREATE_USER'),
  validate(Joi.object({
    employeeId: Joi.number().required(),
    catalystAuthId: Joi.string().required(),
    roleId: Joi.number().required()
  })),
  async (req, res, next) => {
    try {
      const result = await table(req.catalystApp, TABLES.APP_USER).insertRow({
        EmployeeID: req.body.employeeId, CatalystAuthID: req.body.catalystAuthId, RoleID: req.body.roleId
      });
      return success(res, result, {}, 201);
    } catch (err) { next(err); }
  });

router.put('/users/:id/role', authenticate, requirePermission(MODULES.ADMIN_PANEL, 'write'), auditLog('AppUser', 'CHANGE_ROLE'),
  validate(Joi.object({ roleId: Joi.number().required() })),
  async (req, res, next) => {
    try {
      const lookupQuery = `SELECT * FROM ${TABLES.APP_USER} WHERE UserID = ${Number(req.params.id)} LIMIT 0, 1`;
      const existingRows = await runZcql(req.catalystApp, lookupQuery, { flatten: true, tableName: TABLES.APP_USER });
      if (!existingRows.length) return failure(res, 'User not found', 404);

      const result = await table(req.catalystApp, TABLES.APP_USER).updateRow({
        ROWID: existingRows[0].ROWID, RoleID: req.body.roleId
      });
      return success(res, result);
    } catch (err) { next(err); }
  });

// --- Roles & permissions ---
router.get('/roles', authenticate, requirePermission(MODULES.ADMIN_PANEL, 'read'), async (req, res, next) => {
  try {
    const query = `SELECT * FROM ${TABLES.ROLE} LIMIT 0, 50`;
    const rows = await runZcql(req.catalystApp, query, { flatten: true, tableName: TABLES.ROLE });
    return success(res, rows);
  } catch (err) { next(err); }
});

router.get('/permissions/:roleId', authenticate, requirePermission(MODULES.ADMIN_PANEL, 'read'), async (req, res, next) => {
  try {
    const query = `SELECT * FROM ${TABLES.PERMISSION} WHERE RoleID = ${Number(req.params.roleId)} LIMIT 0, 50`;
    const rows = await runZcql(req.catalystApp, query, { flatten: true, tableName: TABLES.PERMISSION });
    return success(res, rows);
  } catch (err) { next(err); }
});

router.put('/permissions/:rowId', authenticate, requirePermission(MODULES.ADMIN_PANEL, 'write'),
  auditLog('Permission', 'UPDATE_PERMISSION'),
  validate(Joi.object({ canRead: Joi.boolean(), canWrite: Joi.boolean(), canExport: Joi.boolean() })),
  async (req, res, next) => {
    try {
      const changes = {};
      if (req.body.canRead !== undefined) changes.CanRead = req.body.canRead;
      if (req.body.canWrite !== undefined) changes.CanWrite = req.body.canWrite;
      if (req.body.canExport !== undefined) changes.CanExport = req.body.canExport;

      const result = await table(req.catalystApp, TABLES.PERMISSION).updateRow({
        ROWID: req.params.rowId, ...changes
      });
      return success(res, result);
    } catch (err) { next(err); }
  });

// --- Audit logs ---
router.get('/audit-logs', authenticate, requirePermission(MODULES.AUDIT_LOGS, 'read'), async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const query = `SELECT * FROM ${TABLES.AUDIT_LOG} ORDER BY EventTime DESC LIMIT ${Number(offset)}, ${Number(limit)}`;
    const rows = await runZcql(req.catalystApp, query, { flatten: true, tableName: TABLES.AUDIT_LOG });
    return success(res, rows);
  } catch (err) { next(err); }
});

module.exports = router;