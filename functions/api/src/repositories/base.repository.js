'use strict';

const { runZcql, table } = require('../config/db');
const { buildSelect } = require('../utils/zcqlBuilder');

class BaseRepository {
  constructor(catalystApp, tableName) {
    this.catalystApp = catalystApp;
    this.tableName = tableName;
  }

  async findById(idColumn, id) {
    const query = buildSelect({ table: this.tableName, filters: { [idColumn]: id }, limit: 1 });
    const rows = await runZcql(this.catalystApp, query, { flatten: true, tableName: this.tableName });
    return rows[0] || null;
  }

  async find(filters = {}, { orderBy = null, limit = 50, offset = 0 } = {}) {
    const query = buildSelect({ table: this.tableName, filters, orderBy, limit, offset });
    return runZcql(this.catalystApp, query, { flatten: true, tableName: this.tableName });
  }

  async insert(record) {
    return table(this.catalystApp, this.tableName).insertRow(record);
  }

  async update(idColumn, id, changes) {
    // Catalyst's updateRow requires the actual internal ROWID, not a
    // regular column — look it up first rather than assuming idColumn
    // works directly (it silently inserts a duplicate row instead of
    // updating if you pass the wrong field).
    const existing = await this.findById(idColumn, id);
    if (!existing) return null;
    return table(this.catalystApp, this.tableName).updateRow({ ROWID: existing.ROWID, ...changes });
  }

  async delete(id) {
    return table(this.catalystApp, this.tableName).deleteRow(id);
  }
}

module.exports = BaseRepository;