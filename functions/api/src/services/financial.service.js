'use strict';

const FinancialRepository = require('../repositories/financial.repository');

class FinancialService {
  constructor(catalystApp) {
    this.repo = new FinancialRepository(catalystApp);
  }

  async getCaseTransactions(caseMasterId) {
    return this.repo.getTransactionsByCase(caseMasterId);
  }

  async traceMoneyTrail(startAccountId, hops = 3) {
    const { accounts, transactions } = await this.repo.traceMoneyTrail(startAccountId, hops);

    const flaggedCount = transactions.filter((t) => t.FlaggedSuspicious).length;
    let suspicionScore = flaggedCount * 25;

    const sorted = [...transactions].sort((a, b) => new Date(a.TxnDate) - new Date(b.TxnDate));
    for (let i = 1; i < sorted.length; i++) {
      const gapHours = (new Date(sorted[i].TxnDate) - new Date(sorted[i - 1].TxnDate)) / 36e5;
      if (gapHours < 24 && sorted[i].FromAccountID === sorted[i - 1].ToAccountID) {
        suspicionScore += 10;
      }
    }
    suspicionScore += Math.min(transactions.length, 10) * 2;
    suspicionScore = Math.min(suspicionScore, 100);

    return {
      startAccountId, accountsInvolved: accounts.length, transactionCount: transactions.length,
      suspicionScore,
      reasons: [
        flaggedCount > 0 ? `${flaggedCount} transaction(s) already flagged suspicious` : null,
        suspicionScore >= 50 ? 'Multiple rapid pass-through transfers detected' : null,
        transactions.length > 8 ? 'Long transaction chain suggests layering' : null
      ].filter(Boolean),
      transactions, accounts
    };
  }

  async getFlaggedTransactions(limit) {
    return this.repo.getFlaggedTransactions({ limit });
  }
}

module.exports = FinancialService;
