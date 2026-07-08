'use strict';

const { escapeValue, buildWhereClause, buildSelect } = require('../src/utils/zcqlBuilder');

describe('zcqlBuilder', () => {
  test('escapeValue escapes single quotes', () => {
    expect(escapeValue("O'Brien")).toBe("'O''Brien'");
  });

  test('escapeValue handles null/undefined as NULL', () => {
    expect(escapeValue(null)).toBe('NULL');
    expect(escapeValue(undefined)).toBe('NULL');
  });

  test('escapeValue handles numbers and booleans', () => {
    expect(escapeValue(42)).toBe('42');
    expect(escapeValue(true)).toBe('1');
    expect(escapeValue(false)).toBe('0');
  });

  test('buildWhereClause builds AND-joined conditions', () => {
    const clause = buildWhereClause({ CaseStatusID: 2, PoliceStationID: 100 });
    expect(clause).toBe('WHERE CaseStatusID = 2 AND PoliceStationID = 100');
  });

  test('buildWhereClause skips undefined/null/empty values', () => {
    const clause = buildWhereClause({ CrimeNo: undefined, CaseStatusID: null, PoliceStationID: 100 });
    expect(clause).toBe('WHERE PoliceStationID = 100');
  });

  test('buildWhereClause supports IN with arrays', () => {
    const clause = buildWhereClause({ CaseStatusID: [1, 2, 3] });
    expect(clause).toBe('WHERE CaseStatusID IN (1, 2, 3)');
  });

  test('buildWhereClause supports operator objects (LIKE, >=)', () => {
    const clause = buildWhereClause({ CrimeNo: { op: 'LIKE', value: '%1044%' } });
    expect(clause).toBe("WHERE CrimeNo LIKE '%1044%'");
  });

  test('buildSelect produces a full paginated query', () => {
    const query = buildSelect({ table: 'CaseMaster', filters: { CaseStatusID: 2 }, limit: 10, offset: 0 });
    expect(query).toBe('SELECT * FROM CaseMaster WHERE CaseStatusID = 2 LIMIT 0, 10');
  });

  test('escapeValue prevents naive injection via quote-breaking', () => {
    const malicious = "1'; DROP TABLE CaseMaster; --";
    const escaped = escapeValue(malicious);
    // The escaped value should not contain an unescaped single quote that
    // could terminate the string literal early.
    expect(escaped.slice(1, -1)).not.toMatch(/(?<!')'(?!')/);
  });
});
