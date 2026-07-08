'use strict';

/**
 * Catalyst Job Function: one-time (or re-runnable) database seeding.
 * Run this via `catalyst job:execute seed-job` or trigger it from the
 * console after tables are created via database/schema.sql. Uses a Job
 * Function (15-minute budget) rather than the Advanced I/O "api"
 * function (30-second budget) because inserting thousands of rows
 * across a dozen tables comfortably exceeds 30 seconds.
 *
 * Order of insertion matters — lookup/master tables first, then
 * CaseMaster, then everything that references CaseMaster.
 */

const catalyst = require('zcatalyst-sdk-node');
const {
  STATES, DISTRICTS, UNIT_TYPES, UNITS, RANKS, DESIGNATIONS, COURTS,
  CASE_CATEGORIES, GRAVITY_OFFENCES, CRIME_HEADS, CRIME_SUB_HEADS,
  CASE_STATUSES, ACTS, SECTIONS, RELIGIONS, CASTES, OCCUPATIONS
} = require('./lib/lookups');
const { generateAll } = require('./lib/generate');
const { buildPermissionRows, ROLE_IDS } = require('./lib/permissions');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function bulkInsert(catalystApp, tableName, rows, batchSize = 3) {
  const tableRef = catalystApp.datastore().table(tableName);
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const results = await Promise.all(batch.map(async (row) => {
      try {
        await tableRef.insertRow(row);
        return true;
      } catch (err) {
        await sleep(300);
        try {
          await tableRef.insertRow(row);
          return true;
        } catch (retryErr) {
          console.error(`Insert failed on ${tableName} (after retry)`, retryErr.message, row);
          return false;
        }
      }
    }));

    inserted += results.filter(Boolean).length;
    failed += results.filter((r) => !r).length;

    await sleep(300);
  }

  console.log(`Seeded ${inserted} rows into ${tableName}${failed ? ` (${failed} failed permanently)` : ''}`);
  return inserted;
}

module.exports = async (jobRequest, context) => {
  try {
    const catalystApp = catalyst.initialize(context);
    const caseCount = Number(process.env.SEED_CASE_COUNT) || 250;

    console.log('Seeding lookup/master tables...');
    await bulkInsert(catalystApp, 'State', STATES);
    await bulkInsert(catalystApp, 'District', DISTRICTS);
    await bulkInsert(catalystApp, 'UnitType', UNIT_TYPES);
    await bulkInsert(catalystApp, 'Unit', UNITS);
    await bulkInsert(catalystApp, 'Rank', RANKS);
    await bulkInsert(catalystApp, 'Designation', DESIGNATIONS);
    await bulkInsert(catalystApp, 'Court', COURTS);
    await bulkInsert(catalystApp, 'CaseCategory', CASE_CATEGORIES);
    await bulkInsert(catalystApp, 'GravityOffence', GRAVITY_OFFENCES);
    await bulkInsert(catalystApp, 'CrimeHead', CRIME_HEADS);
    await bulkInsert(catalystApp, 'CrimeSubHead', CRIME_SUB_HEADS);
    await bulkInsert(catalystApp, 'CaseStatusMaster', CASE_STATUSES);
    await bulkInsert(catalystApp, 'Act', ACTS);
    await bulkInsert(catalystApp, 'Section', SECTIONS);
    await bulkInsert(catalystApp, 'ReligionMaster', RELIGIONS);
    await bulkInsert(catalystApp, 'CasteMaster', CASTES);
    await bulkInsert(catalystApp, 'OccupationMaster', OCCUPATIONS);

    console.log('Seeding RBAC permission matrix...');
    await bulkInsert(catalystApp, 'Permission', buildPermissionRows());

    console.log(`Generating ${caseCount} synthetic FIR records...`);
    const data = generateAll({ caseCount });

    console.log('Seeding employees...');
    await bulkInsert(catalystApp, 'Employee', data.employees);

    console.log('Seeding cases and dependents...');
    await bulkInsert(catalystApp, 'CaseMaster', data.cases);
    await bulkInsert(catalystApp, 'ComplainantDetails', data.complainants);
    await bulkInsert(catalystApp, 'Victim', data.victims);
    await bulkInsert(catalystApp, 'Accused', data.accusedList);
    await bulkInsert(catalystApp, 'ArrestSurrender', data.arrestSurrenders);
    await bulkInsert(catalystApp, 'ActSectionAssociation', data.actSections);
    await bulkInsert(catalystApp, 'ChargesheetDetails', data.chargesheets);

    console.log('Seeding extended schema (phones, accounts, transactions, network edges)...');
    await bulkInsert(catalystApp, 'PhoneRecord', data.phones);
    await bulkInsert(catalystApp, 'BankAccount', data.accounts);
    await bulkInsert(catalystApp, 'FinancialTransaction', data.transactions);
    await bulkInsert(catalystApp, 'CriminalNetworkEdge', data.edges);

    console.log('Seed job complete.');
    console.log(`Default admin role ID for first AppUser setup: ${ROLE_IDS.ADMIN}`);
    context.closeWithSuccess();
  } catch (err) {
    console.error('Seed job failed:', err);
    context.closeWithFailure();
  }
};
