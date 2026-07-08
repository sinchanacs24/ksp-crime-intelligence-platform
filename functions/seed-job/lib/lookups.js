'use strict';

/**
 * Static lookup data matching every master/lookup table in schema.sql.
 * These are NOT synthetic-random — they're the fixed reference values
 * (states, districts, crime heads, etc.) that the random generator
 * (generate.js) draws foreign keys from.
 */

const STATES = [{ StateID: 1, StateName: 'Karnataka', NationalityID: 1, Active: 1 }];

const DISTRICTS = [
  { DistrictID: 1, DistrictName: 'Bengaluru Urban', StateID: 1, Active: 1 },
  { DistrictID: 2, DistrictName: 'Mysuru', StateID: 1, Active: 1 },
  { DistrictID: 3, DistrictName: 'Mangaluru (Dakshina Kannada)', StateID: 1, Active: 1 },
  { DistrictID: 4, DistrictName: 'Belagavi', StateID: 1, Active: 1 },
  { DistrictID: 5, DistrictName: 'Kalaburagi', StateID: 1, Active: 1 },
  { DistrictID: 6, DistrictName: 'Hubballi-Dharwad', StateID: 1, Active: 1 },
  { DistrictID: 7, DistrictName: 'Shivamogga', StateID: 1, Active: 1 },
  { DistrictID: 8, DistrictName: 'Tumakuru', StateID: 1, Active: 1 }
];

const UNIT_TYPES = [
  { UnitTypeID: 1, UnitTypeName: 'Police Station', CityDistState: 'City', Hierarchy: 3, Active: 1 },
  { UnitTypeID: 2, UnitTypeName: 'Circle Office', CityDistState: 'District', Hierarchy: 2, Active: 1 },
  { UnitTypeID: 3, UnitTypeName: 'District SP Office', CityDistState: 'District', Hierarchy: 1, Active: 1 }
];

// Roughly 20 stations spread across the 8 districts above, seeded toward
// the "~1,100 police stations statewide" figure mentioned in the briefing,
// scaled down for a hackathon-sized synthetic dataset.
const UNITS = Array.from({ length: 24 }, (_, i) => ({
  UnitID: 100 + i,
  UnitName: `${['Cubbon Park', 'Whitefield', 'Yeshwanthpur', 'Jayanagar', 'Mysuru East', 'Mysuru West',
    'Mangaluru City', 'Belagavi Rural', 'Kalaburagi North', 'Hubballi Central', 'Shivamogga Town',
    'Tumakuru City'][i % 12]} PS ${Math.floor(i / 12) + 1}`,
  TypeID: 1,
  ParentUnit: null,
  NationalityID: 1,
  StateID: 1,
  DistrictID: (i % 8) + 1,
  Active: 1
}));

const RANKS = [
  { RankID: 1, RankName: 'Constable', Hierarchy: 6, Active: 1 },
  { RankID: 2, RankName: 'Head Constable', Hierarchy: 5, Active: 1 },
  { RankID: 3, RankName: 'Sub-Inspector', Hierarchy: 4, Active: 1 },
  { RankID: 4, RankName: 'Inspector', Hierarchy: 3, Active: 1 },
  { RankID: 5, RankName: 'Deputy Superintendent of Police (DSP)', Hierarchy: 2, Active: 1 },
  { RankID: 6, RankName: 'Superintendent of Police (SP)', Hierarchy: 1, Active: 1 },
  { RankID: 7, RankName: 'Deputy Inspector General (DIG)', Hierarchy: 0, Active: 1 }
];

const DESIGNATIONS = [
  { DesignationID: 1, DesignationName: 'Investigating Officer', Active: 1, SortOrder: 1 },
  { DesignationID: 2, DesignationName: 'Station House Officer', Active: 1, SortOrder: 2 },
  { DesignationID: 3, DesignationName: 'Beat Officer', Active: 1, SortOrder: 3 },
  { DesignationID: 4, DesignationName: 'Circle Inspector', Active: 1, SortOrder: 4 },
  { DesignationID: 5, DesignationName: 'District Superintendent', Active: 1, SortOrder: 5 }
];

const COURTS = [
  { CourtID: 1, CourtName: 'Bengaluru City Civil & Sessions Court', DistrictID: 1, StateID: 1, Active: 1 },
  { CourtID: 2, CourtName: 'Mysuru District Court', DistrictID: 2, StateID: 1, Active: 1 },
  { CourtID: 3, CourtName: 'Mangaluru Sessions Court', DistrictID: 3, StateID: 1, Active: 1 },
  { CourtID: 4, CourtName: 'Belagavi District Court', DistrictID: 4, StateID: 1, Active: 1 }
];

const CASE_CATEGORIES = [
  { CaseCategoryID: 1, LookupValue: 'FIR' },
  { CaseCategoryID: 3, LookupValue: 'UDR' },
  { CaseCategoryID: 4, LookupValue: 'PAR' },
  { CaseCategoryID: 8, LookupValue: 'Zero FIR' }
];

const GRAVITY_OFFENCES = [
  { GravityOffenceID: 1, LookupValue: 'Non-Heinous' },
  { GravityOffenceID: 2, LookupValue: 'Heinous' }
];

const CRIME_HEADS = [
  { CrimeHeadID: 1, CrimeGroupName: 'Crimes Against Body', Active: 1 },
  { CrimeHeadID: 2, CrimeGroupName: 'Crimes Against Property', Active: 1 },
  { CrimeHeadID: 3, CrimeGroupName: 'Cyber Crimes', Active: 1 },
  { CrimeHeadID: 4, CrimeGroupName: 'Economic Offences', Active: 1 },
  { CrimeHeadID: 5, CrimeGroupName: 'Crimes Against Women & Children', Active: 1 },
  { CrimeHeadID: 6, CrimeGroupName: 'Narcotics & Prohibition', Active: 1 }
];

const CRIME_SUB_HEADS = [
  { CrimeSubHeadID: 101, CrimeHeadID: 1, CrimeHeadName: 'Murder', SeqID: 1 },
  { CrimeSubHeadID: 102, CrimeHeadID: 1, CrimeHeadName: 'Grievous Hurt', SeqID: 2 },
  { CrimeSubHeadID: 103, CrimeHeadID: 1, CrimeHeadName: 'Assault', SeqID: 3 },
  { CrimeSubHeadID: 201, CrimeHeadID: 2, CrimeHeadName: 'Burglary', SeqID: 1 },
  { CrimeSubHeadID: 202, CrimeHeadID: 2, CrimeHeadName: 'Chain Snatching', SeqID: 2 },
  { CrimeSubHeadID: 203, CrimeHeadID: 2, CrimeHeadName: 'Vehicle Theft', SeqID: 3 },
  { CrimeSubHeadID: 204, CrimeHeadID: 2, CrimeHeadName: 'Robbery', SeqID: 4 },
  { CrimeSubHeadID: 301, CrimeHeadID: 3, CrimeHeadName: 'Online Fraud', SeqID: 1 },
  { CrimeSubHeadID: 302, CrimeHeadID: 3, CrimeHeadName: 'Cryptocurrency Fraud', SeqID: 2 },
  { CrimeSubHeadID: 303, CrimeHeadID: 3, CrimeHeadName: 'Identity Theft', SeqID: 3 },
  { CrimeSubHeadID: 401, CrimeHeadID: 4, CrimeHeadName: 'Cheating / Criminal Breach of Trust', SeqID: 1 },
  { CrimeSubHeadID: 402, CrimeHeadID: 4, CrimeHeadName: 'Money Laundering', SeqID: 2 },
  { CrimeSubHeadID: 501, CrimeHeadID: 5, CrimeHeadName: 'Domestic Violence', SeqID: 1 },
  { CrimeSubHeadID: 502, CrimeHeadID: 5, CrimeHeadName: 'POCSO Offences', SeqID: 2 },
  { CrimeSubHeadID: 601, CrimeHeadID: 6, CrimeHeadName: 'NDPS Possession', SeqID: 1 },
  { CrimeSubHeadID: 602, CrimeHeadID: 6, CrimeHeadName: 'NDPS Trafficking', SeqID: 2 }
];

const CASE_STATUSES = [
  { CaseStatusID: 1, CaseStatusName: 'Registered' },
  { CaseStatusID: 2, CaseStatusName: 'Under Investigation' },
  { CaseStatusID: 3, CaseStatusName: 'Chargesheeted' },
  { CaseStatusID: 4, CaseStatusName: 'Closed - Undetected' },
  { CaseStatusID: 5, CaseStatusName: 'Closed - False Case' },
  { CaseStatusID: 6, CaseStatusName: 'Court Trial' }
];

const ACTS = [
  { ActCode: 'BNS', ActDescription: 'Bharatiya Nyaya Sanhita', ShortName: 'BNS', Active: 1 },
  { ActCode: 'NDPS', ActDescription: 'Narcotic Drugs and Psychotropic Substances Act', ShortName: 'NDPS', Active: 1 },
  { ActCode: 'ITACT', ActDescription: 'Information Technology Act', ShortName: 'IT Act', Active: 1 },
  { ActCode: 'POCSO', ActDescription: 'Protection of Children from Sexual Offences Act', ShortName: 'POCSO', Active: 1 }
];

const SECTIONS = [
  { ActCode: 'BNS', SectionCode: '103', SectionDescription: 'Murder', Active: 1 },
  { ActCode: 'BNS', SectionCode: '115', SectionDescription: 'Voluntarily causing hurt', Active: 1 },
  { ActCode: 'BNS', SectionCode: '303', SectionDescription: 'Theft', Active: 1 },
  { ActCode: 'BNS', SectionCode: '309', SectionDescription: 'Robbery', Active: 1 },
  { ActCode: 'BNS', SectionCode: '318', SectionDescription: 'Cheating', Active: 1 },
  { ActCode: 'NDPS', SectionCode: '20', SectionDescription: 'Possession of narcotic substance', Active: 1 },
  { ActCode: 'ITACT', SectionCode: '66C', SectionDescription: 'Identity theft', Active: 1 },
  { ActCode: 'ITACT', SectionCode: '66D', SectionDescription: 'Cheating by personation using computer', Active: 1 },
  { ActCode: 'POCSO', SectionCode: '4', SectionDescription: 'Penetrative sexual assault', Active: 1 }
];

const RELIGIONS = [
  { ReligionID: 1, ReligionName: 'Hindu' },
  { ReligionID: 2, ReligionName: 'Muslim' },
  { ReligionID: 3, ReligionName: 'Christian' },
  { ReligionID: 4, ReligionName: 'Jain' },
  { ReligionID: 5, ReligionName: 'Other' }
];

const CASTES = [
  { caste_master_id: 1, caste_master_name: 'General' },
  { caste_master_id: 2, caste_master_name: 'OBC' },
  { caste_master_id: 3, caste_master_name: 'SC' },
  { caste_master_id: 4, caste_master_name: 'ST' }
];

const OCCUPATIONS = [
  { OccupationID: 1, OccupationName: 'Farmer' },
  { OccupationID: 2, OccupationName: 'Government Employee' },
  { OccupationID: 3, OccupationName: 'Private Sector Employee' },
  { OccupationID: 4, OccupationName: 'Daily Wage Labourer' },
  { OccupationID: 5, OccupationName: 'Business Owner' },
  { OccupationID: 6, OccupationName: 'Student' },
  { OccupationID: 7, OccupationName: 'Unemployed' },
  { OccupationID: 8, OccupationName: 'IT Professional' }
];

module.exports = {
  STATES, DISTRICTS, UNIT_TYPES, UNITS, RANKS, DESIGNATIONS, COURTS,
  CASE_CATEGORIES, GRAVITY_OFFENCES, CRIME_HEADS, CRIME_SUB_HEADS,
  CASE_STATUSES, ACTS, SECTIONS, RELIGIONS, CASTES, OCCUPATIONS
};
