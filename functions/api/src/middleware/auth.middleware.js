'use strict';

const { initCatalyst, runZcql } = require('../config/db');
const { TABLES } = require('../config/constants');
const { failure } = require('../utils/response');
const logger = require('../utils/logger');

async function resolveUserProfile(catalystApp, { userId = null, catalystAuthId = null }) {
  const appUserQuery = userId
    ? `SELECT * FROM ${TABLES.APP_USER} WHERE UserID = ${Number(userId)} LIMIT 0, 1`
    : `SELECT * FROM ${TABLES.APP_USER} WHERE CatalystAuthID = '${catalystAuthId}' LIMIT 0, 1`;

  const appUserRows = await runZcql(catalystApp, appUserQuery, { flatten: true, tableName: TABLES.APP_USER });
  if (!appUserRows.length) return null;
  const appUser = appUserRows[0];

  const employeeQuery = `SELECT * FROM ${TABLES.EMPLOYEE} WHERE EmployeeID = ${Number(appUser.EmployeeID)} LIMIT 0, 1`;
  const employeeRows = await runZcql(catalystApp, employeeQuery, { flatten: true, tableName: TABLES.EMPLOYEE });
  if (!employeeRows.length) return null;
  const employee = employeeRows[0];

  const roleQuery = `SELECT * FROM ${TABLES.ROLE} WHERE RoleID = ${Number(appUser.RoleID)} LIMIT 0, 1`;
  const roleRows = await runZcql(catalystApp, roleQuery, { flatten: true, tableName: TABLES.ROLE });
  if (!roleRows.length) return null;
  const role = roleRows[0];

  return {
    userId: appUser.UserID,
    catalystAuthId: appUser.CatalystAuthID,
    employeeId: employee.EmployeeID,
    employeeName: employee.FirstName,
    unitId: employee.UnitID,
    districtId: employee.DistrictID,
    rankId: employee.RankID,
    roleId: role.RoleID,
    roleName: role.RoleName
  };
}

async function tryDemoModeBypass(req) {
  const demoHeader = req.headers['x-demo-mode'];
  const demoSecret = process.env.DEMO_MODE_SECRET;

  if (!demoSecret || !demoHeader || demoHeader !== demoSecret) {
    return null;
  }

  const catalystApp = initCatalyst(req);
  const user = await resolveUserProfile(catalystApp, { userId: 1 });
  if (!user) return null;

  return { catalystApp, user };
}

async function authenticate(req, res, next) {
  try {
    const demoResult = await tryDemoModeBypass(req);
    if (demoResult) {
      req.catalystApp = demoResult.catalystApp;
      req.user = demoResult.user;
      return next();
    }

    const catalystApp = initCatalyst(req);
    req.catalystApp = catalystApp;

    const userManagement = catalystApp.userManagement();
    const currentUser = await userManagement.getCurrentUser();

    if (!currentUser || !currentUser.user_id) {
      return failure(res, 'Unauthorized: no valid Catalyst session', 401);
    }

    const user = await resolveUserProfile(catalystApp, { catalystAuthId: currentUser.user_id });
    if (!user) {
      return failure(res, 'Forbidden: user has no application profile', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('Authentication failed', { error: err.message });
    return failure(res, `Authentication error: ${err.message}`, 401);
  }
}

module.exports = { authenticate };
