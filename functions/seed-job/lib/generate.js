'use strict';

/**
 * Synthetic FIR dataset generator.
 *
 * Per the Datathon briefing: KSP will NOT provide real crime data (privacy /
 * DPDP Act) — only table schemas/headers, and teams are expected to generate
 * their own synthetic data against that schema. This script produces a
 * realistic, internally-consistent dataset (correct CrimeNo format, valid
 * FK relationships, plausible date/geo distributions) sized for a hackathon
 * prototype.
 *
 * Usage: node generate.js > seed-output.json
 *        or require() it from functions/seed-job/index.js to insert directly.
 */

const {
  STATES, DISTRICTS, UNITS, RANKS, DESIGNATIONS, COURTS,
  CASE_CATEGORIES, GRAVITY_OFFENCES, CRIME_SUB_HEADS,
  CASE_STATUSES, SECTIONS, RELIGIONS, CASTES, OCCUPATIONS
} = require('./lookups');

const KARNATAKA_BOUNDS = { latMin: 11.6, latMax: 18.4, lngMin: 74.0, lngMax: 78.6 };

const FIRST_NAMES = ['Ravi', 'Suresh', 'Anita', 'Lakshmi', 'Manjunath', 'Kavya', 'Prakash', 'Deepa',
  'Naveen', 'Shwetha', 'Ganesh', 'Priya', 'Srinivas', 'Roopa', 'Kumar', 'Ashwini', 'Raju', 'Divya'];
const LAST_NAMES = ['Gowda', 'Reddy', 'Rao', 'Naik', 'Shetty', 'Hegde', 'Iyer', 'Patil', 'Kumar', 'Murthy'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDateBetween(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function randomName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }
function pad(num, len) { return String(num).padStart(len, '0'); }

/**
 * Catalyst Data Store's DATETIME columns do NOT accept standard ISO 8601
 * strings (e.g. "2025-04-24T11:14:09.973Z"). Per Catalyst's own API
 * response examples, the expected format is "YYYY-MM-DD HH:mm:ss:SSS"
 * (space-separated, colon before milliseconds, no 'T'/'Z'). This
 * formats a JS Date into that exact shape.
 */
function toDatetime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1, 2);
  const dd = pad(d.getDate(), 2);
  const hh = pad(d.getHours(), 2);
  const mi = pad(d.getMinutes(), 2);
  const ss = pad(d.getSeconds(), 2);
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

const RANGE_START = new Date('2021-01-01');
const RANGE_END = new Date('2026-06-30');

function buildCrimeNo(categoryCode, districtId, unitId, year, serial) {
  return `${categoryCode}${pad(districtId, 4)}${pad(unitId, 4)}${year}${pad(serial, 5)}`;
}

function generateEmployees(count = 150) {
  const employees = [];
  for (let i = 1; i <= count; i++) {
    const unit = pick(UNITS);
    employees.push({
      EmployeeID: i,
      DistrictID: unit.DistrictID,
      UnitID: unit.UnitID,
      RankID: pick(RANKS).RankID,
      DesignationID: pick(DESIGNATIONS).DesignationID,
      KGID: `KGID${pad(i, 6)}`,
      FirstName: randomName(),
      EmployeeDOB: randomDateBetween(new Date('1970-01-01'), new Date('2000-01-01')).toISOString().slice(0, 10),
      GenderID: pick([1, 2]),
      BloodGroupID: randInt(1, 8),
      PhysicallyChallenged: Math.random() < 0.02 ? 1 : 0,
      AppointmentDate: randomDateBetween(new Date('1995-01-01'), new Date('2022-01-01')).toISOString().slice(0, 10)
    });
  }
  return employees;
}

function generateCases(count, employees) {
  const cases = [];
  const complainants = [];
  const victims = [];
  const accusedList = [];
  const arrestSurrenders = [];
  const actSections = [];
  const chargesheets = [];
  const serialByStationYear = {};

  for (let i = 1; i <= count; i++) {
    const unit = pick(UNITS);
    const district = DISTRICTS.find((d) => d.DistrictID === unit.DistrictID);
    const regDate = randomDateBetween(RANGE_START, RANGE_END);
    const year = regDate.getFullYear();
    const category = pick(CASE_CATEGORIES);
    const categoryCode = { 1: '1', 3: '3', 4: '4', 8: '8' }[category.CaseCategoryID];

    const serialKey = `${unit.UnitID}-${category.CaseCategoryID}-${year}`;
    serialByStationYear[serialKey] = (serialByStationYear[serialKey] || 0) + 1;
    const serial = serialByStationYear[serialKey];

    const crimeNo = buildCrimeNo(categoryCode, district.DistrictID, unit.UnitID, year, serial);
    const caseNo = `${year}${pad(serial, 5)}`;

    const subHead = pick(CRIME_SUB_HEADS);
    const officer = pick(employees.filter((e) => e.UnitID === unit.UnitID)) || pick(employees);
    const status = pick(CASE_STATUSES);
    const gravity = subHead.CrimeHeadID === 1 || subHead.CrimeHeadID === 5
      ? GRAVITY_OFFENCES[1]
      : pick(GRAVITY_OFFENCES);

    const caseMasterId = i;

    cases.push({
      CaseMasterID: caseMasterId,
      CrimeNo: crimeNo,
      CaseNo: caseNo,
      CrimeRegisteredDate: regDate.toISOString().slice(0, 10),
      PolicePersonID: officer.EmployeeID,
      PoliceStationID: unit.UnitID,
      CaseCategoryID: category.CaseCategoryID,
      GravityOffenceID: gravity.GravityOffenceID,
      CrimeMajorHeadID: subHead.CrimeHeadID,
      CrimeMinorHeadID: subHead.CrimeSubHeadID,
      CaseStatusID: status.CaseStatusID,
      CourtID: pick(COURTS).CourtID,
      IncidentFromDate: toDatetime(regDate),
      IncidentToDate: toDatetime(regDate),
      InfoReceivedPSDate: toDatetime(regDate),
      latitude: (KARNATAKA_BOUNDS.latMin + Math.random() * (KARNATAKA_BOUNDS.latMax - KARNATAKA_BOUNDS.latMin)).toFixed(6),
      longitude: (KARNATAKA_BOUNDS.lngMin + Math.random() * (KARNATAKA_BOUNDS.lngMax - KARNATAKA_BOUNDS.lngMin)).toFixed(6),
      BriefFacts: `Synthetic case record: ${subHead.CrimeHeadName} reported at ${unit.UnitName}.`
    });

    complainants.push({
      ComplainantID: caseMasterId,
      CaseMasterID: caseMasterId,
      ComplainantName: randomName(),
      AgeYear: randInt(18, 75),
      OccupationID: pick(OCCUPATIONS).OccupationID,
      ReligionID: pick(RELIGIONS).ReligionID,
      CasteID: pick(CASTES).caste_master_id,
      GenderID: pick([1, 2])
    });

    const victimCount = randInt(1, 2);
    for (let v = 0; v < victimCount; v++) {
      victims.push({
        VictimMasterID: caseMasterId * 10 + v,
        CaseMasterID: caseMasterId,
        VictimName: randomName(),
        AgeYear: randInt(5, 80),
        GenderID: pick([1, 2, 3]),
        VictimPolice: Math.random() < 0.01 ? 1 : 0
      });
    }

    const accusedCount = randInt(1, 3);
    for (let a = 0; a < accusedCount; a++) {
      const accusedMasterId = caseMasterId * 10 + a;
      accusedList.push({
        AccusedMasterID: accusedMasterId,
        CaseMasterID: caseMasterId,
        AccusedName: randomName(),
        AgeYear: randInt(16, 65),
        GenderID: pick(['M', 'F']),
        PersonID: `A${a + 1}`
      });

      if (Math.random() < 0.6) {
        arrestSurrenders.push({
          ArrestSurrenderID: accusedMasterId,
          CaseMasterID: caseMasterId,
          ArrestSurrenderTypeID: Math.random() < 0.8 ? 1 : 2,
          ArrestSurrenderDate: randomDateBetween(regDate, RANGE_END).toISOString().slice(0, 10),
          ArrestSurrenderStateId: 1,
          ArrestSurrenderDistrictId: district.DistrictID,
          PoliceStationID: unit.UnitID,
          IOID: officer.EmployeeID,
          CourtID: pick(COURTS).CourtID,
          AccusedMasterID: accusedMasterId,
          IsAccused: 1,
          IsComplainantAccused: 0
        });
      }
    }

    const sectionCount = randInt(1, 2);
    for (let s = 0; s < sectionCount; s++) {
      const section = pick(SECTIONS);
      actSections.push({
        CaseMasterID: caseMasterId,
        ActID: section.ActCode,
        SectionID: section.SectionCode,
        ActOrderID: s + 1,
        SectionOrderID: s + 1
      });
    }

    if (status.CaseStatusID === 3 || status.CaseStatusID === 4 || status.CaseStatusID === 5) {
      chargesheets.push({
        CSID: caseMasterId,
        CaseMasterID: caseMasterId,
        csdate: toDatetime(randomDateBetween(regDate, RANGE_END)),
        cstype: status.CaseStatusID === 3 ? 'A' : status.CaseStatusID === 5 ? 'B' : 'C',
        PolicePersonID: officer.EmployeeID
      });
    }
  }

  return { cases, complainants, victims, accusedList, arrestSurrenders, actSections, chargesheets };
}

function generateExtendedData(accusedList) {
  const phones = [];
  const accounts = [];
  const transactions = [];
  const edges = [];
  let edgeId = 1;
  let phoneId = 1;
  let accountId = 1;
  let txnId = 1;

  const sharedPhonePool = Array.from({ length: 40 }, () => `9${randInt(100000000, 999999999)}`);
  const sharedAccountPool = Array.from({ length: 30 }, () => `KA${randInt(10000000, 99999999)}`);

  accusedList.forEach((accused) => {
    if (Math.random() < 0.7) {
      const phoneNumber = Math.random() < 0.3 ? pick(sharedPhonePool) : `9${randInt(100000000, 999999999)}`;
      const phone = {
        PhoneID: phoneId++,
        CaseMasterID: accused.CaseMasterID,
        PersonType: 'Accused',
        PersonRefID: accused.AccusedMasterID,
        Number: phoneNumber,
        IMEI: `${randInt(100000000000000, 999999999999999)}`
      };
      phones.push(phone);
      edges.push({
        EdgeID: edgeId++, CaseMasterID: accused.CaseMasterID,
        NodeAType: 'Accused', NodeARefID: accused.AccusedMasterID,
        NodeBType: 'Phone', NodeBRefID: phone.PhoneID,
        RelationType: 'owns', Weight: 1
      });
    }

    if (Math.random() < 0.5) {
      const accNo = Math.random() < 0.25 ? pick(sharedAccountPool) : `KA${randInt(10000000, 99999999)}`;
      const account = {
        AccountID: accountId++,
        PersonType: 'Accused',
        PersonRefID: accused.AccusedMasterID,
        AccountNo: accNo,
        BankName: pick(['SBI', 'Canara Bank', 'HDFC', 'ICICI', 'Karnataka Bank']),
        IFSC: `BANK0${randInt(100000, 999999)}`
      };
      accounts.push(account);
      edges.push({
        EdgeID: edgeId++, CaseMasterID: accused.CaseMasterID,
        NodeAType: 'Accused', NodeARefID: accused.AccusedMasterID,
        NodeBType: 'BankAccount', NodeBRefID: account.AccountID,
        RelationType: 'owns', Weight: 1
      });
    }
  });

  for (let i = 0; i < Math.floor(accounts.length * 1.5); i++) {
    if (accounts.length < 2) break;
    const from = pick(accounts);
    const to = pick(accounts);
    if (to.AccountID === from.AccountID) continue;
    transactions.push({
      TxnID: txnId++,
      FromAccountID: from.AccountID,
      ToAccountID: to.AccountID,
      Amount: randInt(500, 500000),
      TxnDate: toDatetime(randomDateBetween(RANGE_START, RANGE_END)),
      CaseMasterID: null,
      FlaggedSuspicious: Math.random() < 0.1 ? 1 : 0
    });
  }

  const byCase = {};
  accusedList.forEach((a) => {
    byCase[a.CaseMasterID] = byCase[a.CaseMasterID] || [];
    byCase[a.CaseMasterID].push(a);
  });
  Object.values(byCase).forEach((group) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        edges.push({
          EdgeID: edgeId++, CaseMasterID: group[i].CaseMasterID,
          NodeAType: 'Accused', NodeARefID: group[i].AccusedMasterID,
          NodeBType: 'Accused', NodeBRefID: group[j].AccusedMasterID,
          RelationType: 'co-accused', Weight: 2
        });
      }
    }
  });

  return { phones, accounts, transactions, edges };
}

function generateAll({ caseCount = 2000, employeeCount = 150 } = {}) {
  const employees = generateEmployees(employeeCount);
  const caseData = generateCases(caseCount, employees);
  const extended = generateExtendedData(caseData.accusedList);

  return {
    employees,
    ...caseData,
    ...extended
  };
}

module.exports = { generateAll };

if (require.main === module) {
  const caseCount = Number(process.argv[2]) || 2000;
  const data = generateAll({ caseCount });
  process.stdout.write(JSON.stringify(data, null, 2));
}
