'use strict';

const catalyst = require('zcatalyst-sdk-node');

function initCatalyst(req) {
  return catalyst.initialize(req);
}

async function runZcql(catalystApp, query, { flatten = true, tableName = null } = {}) {
  const zcql = catalystApp.zcql();
  const rows = await zcql.executeZCQLQuery(query);
  if (!flatten || !tableName) return rows;
  return rows.map((row) => row[tableName]);
}

function table(catalystApp, tableName) {
  return catalystApp.datastore().table(tableName);
}

/**
 * Catalyst's ZCQL JOIN clause requires an actual defined relationship
 * (a Lookup-type column) between two tables — it does not support
 * generic equality-based joins across plain Big Int foreign-key
 * columns, which is what this schema uses throughout. This helper
 * replaces JOINs everywhere: fetch the related rows for a batch of
 * foreign-key values in one IN-clause query, and return them as a
 * Map keyed by the id column for O(1) lookup while combining results
 * in JavaScript.
 */
async function fetchByIds(catalystApp, tableName, idColumn, ids) {
  const uniqueIds = [...new Set(ids)].filter((id) => id !== null && id !== undefined);
  const map = new Map();
  if (!uniqueIds.length) return map;

  const idList = uniqueIds.map((id) => (typeof id === 'string' ? `'${id.replace(/'/g, "''")}'` : Number(id))).join(', ');
  const query = `SELECT * FROM ${tableName} WHERE ${idColumn} IN (${idList}) LIMIT 0, 300`;
  const rows = await runZcql(catalystApp, query, { flatten: true, tableName });

  rows.forEach((row) => map.set(String(row[idColumn]), row));
  return map;
}

module.exports = { initCatalyst, runZcql, table, fetchByIds };