'use strict';

const { initCatalyst, runZcql } = require('../config/db');
const { TABLES } = require('../config/constants');
const { failure } = require('../utils/response');

function requirePermission(module, action = 'read') {
  return async (req, res, next) => {
    try {
      if (!req.user) return failure(res, 'Unauthorized', 401);

      const catalystApp = req.catalystApp || initCatalyst(req);
      const columnMap = { read: 'CanRead', write: 'CanWrite', export: 'CanExport' };
      const column = columnMap[action] || 'CanRead';

      const query = `SELECT * FROM ${TABLES.PERMISSION}
        WHERE RoleID = ${req.user.roleId} AND Module = '${module}' LIMIT 0, 1`;

      const rows = await runZcql(catalystApp, query, { flatten: true, tableName: 'Permission' });

      // Catalyst returns boolean-like columns as the strings "1"/"0"
      // (not real JS booleans) — "0" is truthy as a string, so a plain
      // `!rows[0][column]` check always evaluated false and silently
      // allowed access regardless of the actual permission value.
      const hasAccess = rows.length && (rows[0][column] === true || rows[0][column] === 1 || rows[0][column] === '1');

      if (!hasAccess) {
        return failure(res, `Forbidden: role '${req.user.roleName}' lacks '${action}' access to '${module}'`, 403);
      }
      next();
    } catch (err) {
      return failure(res, 'Authorization check failed', 500, err.message);
    }
  };
}

module.exports = { requirePermission };