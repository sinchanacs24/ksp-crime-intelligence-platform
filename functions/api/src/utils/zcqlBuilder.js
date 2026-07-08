'use strict';

function escapeValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  const escaped = String(value).replace(/'/g, "''");
  return `'${escaped}'`;
}

function buildWhereClause(filters = {}) {
  const clauses = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        const list = value.map(escapeValue).join(', ');
        return `${key} IN (${list})`;
      }
      if (typeof value === 'object' && value.op) {
        return `${key} ${value.op} ${escapeValue(value.value)}`;
      }
      return `${key} = ${escapeValue(value)}`;
    });
  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
}

function buildSelect({ table, columns = ['*'], filters = {}, orderBy = null, limit = 50, offset = 0 }) {
  const where = buildWhereClause(filters);
  let query = `SELECT ${columns.join(', ')} FROM ${table} ${where}`;
  if (orderBy) query += ` ORDER BY ${orderBy}`;
  query += ` LIMIT ${Number(offset)}, ${Number(limit)}`;
  return query.replace(/\s+/g, ' ').trim();
}

module.exports = { escapeValue, buildWhereClause, buildSelect };
