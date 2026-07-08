'use strict';

const BaseRepository = require('./base.repository');
const { TABLES } = require('../config/constants');
const { runZcql } = require('../config/db');

class FinancialRepository extends BaseRepository {
  constructor(catalystApp) {
    super(catalystApp, TABLES.FINANCIAL_TRANSACTION);
  }

  async getTransactionsByCase(caseMasterId) {
    return this.find({ CaseMasterID: caseMasterId }, { orderBy: 'TxnDate ASC', limit: 500 });
  }

  async getAccountsForPerson(personType, personRefId) {
    const bankRepo = new BaseRepository(this.catalystApp, TABLES.BANK_ACCOUNT);
    return bankRepo.find({ PersonType: personType, PersonRefID: personRefId }, { limit: 100 });
  }

  async traceMoneyTrail(startAccountId, hops = 3) {
    let frontier = [Number(startAccountId)];
    const visitedAccounts = new Set(frontier);
    const trail = [];

    for (let i = 0; i < hops; i++) {
      if (!frontier.length) break;
      const idList = frontier.join(', ');

      const query = `SELECT * FROM ${TABLES.FINANCIAL_TRANSACTION}
        WHERE FromAccountID IN (${idList}) OR ToAccountID IN (${idList})
        LIMIT 0, 300`;

      const rows = await runZcql(this.catalystApp, query, {
        flatten: true, tableName: TABLES.FINANCIAL_TRANSACTION
      });

      const nextFrontier = [];
      for (const txn of rows) {
        trail.push(txn);
        [txn.FromAccountID, txn.ToAccountID].forEach((acc) => {
          if (!visitedAccounts.has(acc)) {
            visitedAccounts.add(acc);
            nextFrontier.push(acc);
          }
        });
      }
      frontier = nextFrontier;
    }

    return { accounts: Array.from(visitedAccounts), transactions: trail };
  }

  async getFlaggedTransactions({ limit = 100 } = {}) {
    return this.find({ FlaggedSuspicious: true }, { orderBy: 'TxnDate DESC', limit });
  }
}

module.exports = FinancialRepository;
