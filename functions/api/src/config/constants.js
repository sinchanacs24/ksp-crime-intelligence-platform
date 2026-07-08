'use strict';

const TABLES = Object.freeze({
  CASE_MASTER: 'CaseMaster',
  COMPLAINANT_DETAILS: 'ComplainantDetails',
  ACT_SECTION_ASSOCIATION: 'ActSectionAssociation',
  VICTIM: 'Victim',
  ACCUSED: 'Accused',
  ARREST_SURRENDER: 'ArrestSurrender',
  INV_ARREST_SURRENDER_ACCUSED: 'inv_arrestsurrenderaccused',
  ACT: 'Act',
  SECTION: 'Section',
  CRIME_HEAD_ACT_SECTION: 'CrimeHeadActSection',
  CRIME_HEAD: 'CrimeHead',
  CRIME_SUB_HEAD: 'CrimeSubHead',
  CASTE_MASTER: 'CasteMaster',
  RELIGION_MASTER: 'ReligionMaster',
  OCCUPATION_MASTER: 'OccupationMaster',
  CASE_STATUS_MASTER: 'CaseStatusMaster',
  COURT: 'Court',
  DISTRICT: 'District',
  STATE: 'State',
  UNIT: 'Unit',
  UNIT_TYPE: 'UnitType',
  RANK: 'Rank',
  DESIGNATION: 'Designation',
  EMPLOYEE: 'Employee',
  CASE_CATEGORY: 'CaseCategory',
  GRAVITY_OFFENCE: 'GravityOffence',
  CHARGESHEET_DETAILS: 'ChargesheetDetails',

  EVIDENCE: 'Evidence',
  VEHICLE: 'Vehicle',
  PHONE_RECORD: 'PhoneRecord',
  BANK_ACCOUNT: 'BankAccount',
  FINANCIAL_TRANSACTION: 'FinancialTransaction',
  CASE_TIMELINE: 'CaseTimeline',
  OFFENDER_RISK_SCORE: 'OffenderRiskScore',
  CRIMINAL_NETWORK_EDGE: 'CriminalNetworkEdge',
  ATTACHMENT: 'Attachment',
  APP_USER: 'AppUser',
  ROLE: 'Role',
  PERMISSION: 'Permission',
  AUDIT_LOG: 'AuditLog',
  CHAT_CONVERSATION: 'ChatConversation',
  CHAT_MESSAGE: 'ChatMessage',
  CRIME_FORECAST: 'CrimeForecast'
});

const ROLES = Object.freeze({
  INVESTIGATOR: 'Investigator',
  ANALYST: 'Crime Analyst',
  SENIOR_OFFICER: 'Senior Police Officer',
  SUPERVISOR: 'Supervisor',
  SCRB: 'State Crime Records Bureau',
  POLICY_MAKER: 'Policy Maker',
  ADMIN: 'Admin'
});

const MODULES = Object.freeze({
  DASHBOARD: 'dashboard',
  FIR_SEARCH: 'fir_search',
  CRIMINAL_SEARCH: 'criminal_search',
  VICTIM_SEARCH: 'victim_search',
  NETWORK_ANALYSIS: 'network_analysis',
  ANALYTICS: 'analytics',
  PREDICTION: 'prediction',
  FINANCIAL_CRIME: 'financial_crime',
  AI_ASSISTANT: 'ai_assistant',
  ADMIN_PANEL: 'admin_panel',
  AUDIT_LOGS: 'audit_logs'
});

const NODE_TYPES = Object.freeze({
  ACCUSED: 'Accused',
  VICTIM: 'Victim',
  PHONE: 'Phone',
  BANK_ACCOUNT: 'BankAccount',
  VEHICLE: 'Vehicle',
  CASE: 'Case',
  ADDRESS: 'Address'
});

const ARREST_SURRENDER_TYPE = Object.freeze({ ARREST: 1, SURRENDER: 2 });

module.exports = { TABLES, ROLES, MODULES, NODE_TYPES, ARREST_SURRENDER_TYPE };
