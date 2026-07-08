'use strict';

const RiskScoringService = require('../src/services/riskScoring.service');

// Minimal fake catalystApp + repositories to test the deterministic
// scoring math in isolation, without a live Catalyst connection.
jest.mock('../src/repositories/accused.repository', () => {
  return jest.fn().mockImplementation(() => ({
    getCriminalHistory: jest.fn().mockResolvedValue([
      { CaseMaster: { CrimeRegisteredDate: new Date().toISOString(), GravityOffenceID: 2 } },
      { CaseMaster: { CrimeRegisteredDate: new Date().toISOString(), GravityOffenceID: 2 } }
    ]),
    getOutcomeTrail: jest.fn().mockResolvedValue([{ ArrestSurrenderID: 1 }])
  }));
});

jest.mock('../src/config/db', () => ({
  table: jest.fn(() => ({ insertRow: jest.fn().mockResolvedValue({ ROWID: 1 }) })),
  runZcql: jest.fn().mockResolvedValue([])
}));

describe('RiskScoringService', () => {
  test('computeRiskScore returns a score between 0 and 100 with factor breakdown', async () => {
    const service = new RiskScoringService({});
    const result = await service.computeRiskScore(1, 'Test Accused');

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['Low', 'Medium', 'High']).toContain(result.riskLevel);
    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.factors.length).toBe(4);
  });

  test('_riskLevel boundaries are correct', () => {
    const service = new RiskScoringService({});
    expect(service._riskLevel(69)).toBe('Medium');
    expect(service._riskLevel(70)).toBe('High');
    expect(service._riskLevel(39)).toBe('Low');
    expect(service._riskLevel(40)).toBe('Medium');
  });
});
