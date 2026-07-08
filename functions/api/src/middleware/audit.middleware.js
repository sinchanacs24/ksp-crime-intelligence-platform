'use strict';

const { table } = require('../config/db');
const { TABLES } = require('../config/constants');
const logger = require('../utils/logger');

function toDatetime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function auditLog(entityType, actionOverride = null) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;

      const action = actionOverride || `${req.method}:${entityType}`;
      const entityId = req.params.id || req.body?.CaseMasterID || null;

      const record = {
        UserID: req.user?.userId || null,
        Action: action,
        EntityType: entityType,
        EntityID: entityId,
        EventTime: toDatetime(new Date()),
        IPAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
      };

      table(req.catalystApp, TABLES.AUDIT_LOG)
        .insertRow(record)
        .catch((err) => logger.error('Audit log write failed', { error: err.message, record }));
    });
    next();
  };
}

module.exports = { auditLog };
