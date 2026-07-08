-- ============================================================================
-- KSP Crime Intelligence Platform — Database Schema
-- Karnataka State Police | Datathon 2026
--
-- Section 1: Tables exactly as defined in the supplied ER diagram.
-- Section 2: Extended tables added to satisfy problem-statement features
--            (network analysis, financial crime, evidence, RBAC, chat, audit).
--
-- Written in ANSI SQL for portability; adapt types to Catalyst Data Store's
-- column type set when creating tables via the Catalyst console/CLI
-- (Catalyst Data Store supports Text/Varchar/BigInt/Double/DateTime/Bool).
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE FIR SCHEMA (from supplied ER diagram, unmodified)
-- ============================================================================

CREATE TABLE State (
  StateID INT PRIMARY KEY,
  StateName VARCHAR(100) NOT NULL,
  NationalityID INT,
  Active BIT DEFAULT 1
);

CREATE TABLE District (
  DistrictID INT PRIMARY KEY,
  DistrictName VARCHAR(100) NOT NULL,
  StateID INT NOT NULL REFERENCES State(StateID),
  Active BIT DEFAULT 1
);

CREATE TABLE UnitType (
  UnitTypeID INT PRIMARY KEY,
  UnitTypeName VARCHAR(100) NOT NULL,
  CityDistState VARCHAR(20),
  Hierarchy INT,
  Active BIT DEFAULT 1
);

CREATE TABLE Unit (
  UnitID INT PRIMARY KEY,
  UnitName VARCHAR(150) NOT NULL,
  TypeID INT REFERENCES UnitType(UnitTypeID),
  ParentUnit INT REFERENCES Unit(UnitID),
  NationalityID INT,
  StateID INT REFERENCES State(StateID),
  DistrictID INT REFERENCES District(DistrictID),
  Active BIT DEFAULT 1
);

CREATE TABLE Rank (
  RankID INT PRIMARY KEY,
  RankName VARCHAR(100) NOT NULL,
  Hierarchy INT,
  Active BIT DEFAULT 1
);

CREATE TABLE Designation (
  DesignationID INT PRIMARY KEY,
  DesignationName VARCHAR(100) NOT NULL,
  Active BIT DEFAULT 1,
  SortOrder INT
);

CREATE TABLE Employee (
  EmployeeID INT PRIMARY KEY,
  DistrictID INT REFERENCES District(DistrictID),
  UnitID INT REFERENCES Unit(UnitID),
  RankID INT REFERENCES Rank(RankID),
  DesignationID INT REFERENCES Designation(DesignationID),
  KGID VARCHAR(30) UNIQUE,
  FirstName VARCHAR(100) NOT NULL,
  EmployeeDOB DATE,
  GenderID INT,
  BloodGroupID INT,
  PhysicallyChallenged BIT DEFAULT 0,
  AppointmentDate DATE
);

CREATE TABLE Court (
  CourtID INT PRIMARY KEY,
  CourtName VARCHAR(150) NOT NULL,
  DistrictID INT REFERENCES District(DistrictID),
  StateID INT REFERENCES State(StateID),
  Active BIT DEFAULT 1
);

CREATE TABLE CaseCategory (
  CaseCategoryID INT PRIMARY KEY,
  LookupValue VARCHAR(50) NOT NULL -- FIR, UDR, PAR, Zero FIR
);

CREATE TABLE GravityOffence (
  GravityOffenceID INT PRIMARY KEY,
  LookupValue VARCHAR(50) NOT NULL -- Heinous, Non-Heinous
);

CREATE TABLE CrimeHead (
  CrimeHeadID INT PRIMARY KEY,
  CrimeGroupName VARCHAR(150) NOT NULL,
  Active BIT DEFAULT 1
);

CREATE TABLE CrimeSubHead (
  CrimeSubHeadID INT PRIMARY KEY,
  CrimeHeadID INT NOT NULL REFERENCES CrimeHead(CrimeHeadID),
  CrimeHeadName VARCHAR(150) NOT NULL,
  SeqID INT
);

CREATE TABLE CaseStatusMaster (
  CaseStatusID INT PRIMARY KEY,
  CaseStatusName VARCHAR(100) NOT NULL
);

CREATE TABLE Act (
  ActCode VARCHAR(20) PRIMARY KEY,
  ActDescription VARCHAR(255) NOT NULL,
  ShortName VARCHAR(50),
  Active BIT DEFAULT 1
);

CREATE TABLE Section (
  ActCode VARCHAR(20) NOT NULL REFERENCES Act(ActCode),
  SectionCode VARCHAR(20) NOT NULL,
  SectionDescription VARCHAR(255),
  Active BIT DEFAULT 1,
  PRIMARY KEY (ActCode, SectionCode)
);

CREATE TABLE CrimeHeadActSection (
  CrimeHeadID INT NOT NULL REFERENCES CrimeHead(CrimeHeadID),
  ActCode VARCHAR(20) NOT NULL REFERENCES Act(ActCode),
  SectionCode VARCHAR(20) NOT NULL,
  PRIMARY KEY (CrimeHeadID, ActCode, SectionCode)
);

CREATE TABLE CasteMaster (
  caste_master_id INT PRIMARY KEY,
  caste_master_name VARCHAR(100) NOT NULL
);

CREATE TABLE ReligionMaster (
  ReligionID INT PRIMARY KEY,
  ReligionName VARCHAR(100) NOT NULL
);

CREATE TABLE OccupationMaster (
  OccupationID INT PRIMARY KEY,
  OccupationName VARCHAR(100) NOT NULL
);

CREATE TABLE CaseMaster (
  CaseMasterID INT PRIMARY KEY,
  CrimeNo VARCHAR(30) NOT NULL UNIQUE,
  CaseNo VARCHAR(20) NOT NULL,
  CrimeRegisteredDate DATE NOT NULL,
  PolicePersonID INT NOT NULL REFERENCES Employee(EmployeeID),
  PoliceStationID INT NOT NULL REFERENCES Unit(UnitID),
  CaseCategoryID INT NOT NULL REFERENCES CaseCategory(CaseCategoryID),
  GravityOffenceID INT NOT NULL REFERENCES GravityOffence(GravityOffenceID),
  CrimeMajorHeadID INT NOT NULL REFERENCES CrimeHead(CrimeHeadID),
  CrimeMinorHeadID INT NOT NULL REFERENCES CrimeSubHead(CrimeSubHeadID),
  CaseStatusID INT NOT NULL REFERENCES CaseStatusMaster(CaseStatusID),
  CourtID INT REFERENCES Court(CourtID),
  IncidentFromDate DATETIME,
  IncidentToDate DATETIME,
  InfoReceivedPSDate DATETIME,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  BriefFacts TEXT
);

CREATE INDEX idx_casemaster_date ON CaseMaster (CrimeRegisteredDate);
CREATE INDEX idx_casemaster_station ON CaseMaster (PoliceStationID);
CREATE INDEX idx_casemaster_subhead ON CaseMaster (CrimeMinorHeadID);
CREATE INDEX idx_casemaster_status ON CaseMaster (CaseStatusID);
CREATE INDEX idx_casemaster_geo ON CaseMaster (latitude, longitude);

CREATE TABLE ComplainantDetails (
  ComplainantID INT PRIMARY KEY,
  CaseMasterID INT NOT NULL REFERENCES CaseMaster(CaseMasterID),
  ComplainantName VARCHAR(150) NOT NULL,
  AgeYear INT,
  OccupationID INT REFERENCES OccupationMaster(OccupationID),
  ReligionID INT REFERENCES ReligionMaster(ReligionID),
  CasteID INT REFERENCES CasteMaster(caste_master_id),
  GenderID INT
);
CREATE INDEX idx_complainant_case ON ComplainantDetails (CaseMasterID);

CREATE TABLE ActSectionAssociation (
  CaseMasterID INT NOT NULL REFERENCES CaseMaster(CaseMasterID),
  ActID VARCHAR(20) NOT NULL REFERENCES Act(ActCode),
  SectionID VARCHAR(20) NOT NULL,
  ActOrderID INT,
  SectionOrderID INT,
  PRIMARY KEY (CaseMasterID, ActID, SectionID)
);

CREATE TABLE Victim (
  VictimMasterID INT PRIMARY KEY,
  CaseMasterID INT NOT NULL REFERENCES CaseMaster(CaseMasterID),
  VictimName VARCHAR(150) NOT NULL,
  AgeYear INT,
  GenderID INT,
  VictimPolice BIT DEFAULT 0
);
CREATE INDEX idx_victim_case ON Victim (CaseMasterID);

CREATE TABLE Accused (
  AccusedMasterID INT PRIMARY KEY,
  CaseMasterID INT NOT NULL REFERENCES CaseMaster(CaseMasterID),
  AccusedName VARCHAR(150) NOT NULL,
  AgeYear INT,
  GenderID VARCHAR(1),
  PersonID VARCHAR(10) -- A1, A2, A3...
);
CREATE INDEX idx_accused_case ON Accused (CaseMasterID);
CREATE INDEX idx_accused_name ON Accused (AccusedName);

CREATE TABLE ArrestSurrender (
  ArrestSurrenderID INT PRIMARY KEY,
  CaseMasterID INT NOT NULL REFERENCES CaseMaster(CaseMasterID),
  ArrestSurrenderTypeID INT, -- 1=Arrest, 2=Surrender
  ArrestSurrenderDate DATE,
  ArrestSurrenderStateId INT REFERENCES State(StateID),
  ArrestSurrenderDistrictId INT REFERENCES District(DistrictID),
  PoliceStationID INT REFERENCES Unit(UnitID),
  IOID INT REFERENCES Employee(EmployeeID),
  CourtID INT REFERENCES Court(CourtID),
  AccusedMasterID INT REFERENCES Accused(AccusedMasterID),
  IsAccused BIT DEFAULT 1,
  IsComplainantAccused BIT DEFAULT 0
);
CREATE INDEX idx_arrestsurrender_accused ON ArrestSurrender (AccusedMasterID);

CREATE TABLE inv_arrestsurrenderaccused (
  ArrestSurrenderID INT NOT NULL REFERENCES ArrestSurrender(ArrestSurrenderID),
  AccusedMasterID INT NOT NULL REFERENCES Accused(AccusedMasterID),
  PRIMARY KEY (ArrestSurrenderID, AccusedMasterID)
);

CREATE TABLE ChargesheetDetails (
  CSID INT PRIMARY KEY,
  CaseMasterID INT NOT NULL REFERENCES CaseMaster(CaseMasterID),
  csdate DATETIME,
  cstype CHAR(1), -- A=Chargesheet, B=False Case, C=Undetected
  PolicePersonID INT REFERENCES Employee(EmployeeID)
);
CREATE INDEX idx_chargesheet_case ON ChargesheetDetails (CaseMasterID);

-- ============================================================================
-- SECTION 2: EXTENDED SCHEMA (added for problem-statement feature coverage)
-- ============================================================================

CREATE TABLE Evidence (
  EvidenceID INT PRIMARY KEY,
  CaseMasterID INT NOT NULL REFERENCES CaseMaster(CaseMasterID),
  Type VARCHAR(50), -- Physical, Digital, Document, Forensic
  StratusFileID VARCHAR(100),
  CollectedByID INT REFERENCES Employee(EmployeeID),
  CollectedDate DATETIME,
  ChainOfCustodyNotes TEXT
);
CREATE INDEX idx_evidence_case ON Evidence (CaseMasterID);

CREATE TABLE Vehicle (
  VehicleID INT PRIMARY KEY,
  CaseMasterID INT REFERENCES CaseMaster(CaseMasterID),
  RegistrationNo VARCHAR(20),
  Make VARCHAR(50),
  Model VARCHAR(50),
  LinkedAccusedID INT REFERENCES Accused(AccusedMasterID)
);
CREATE INDEX idx_vehicle_regno ON Vehicle (RegistrationNo);

CREATE TABLE PhoneRecord (
  PhoneID INT PRIMARY KEY,
  CaseMasterID INT REFERENCES CaseMaster(CaseMasterID),
  PersonType VARCHAR(20), -- Accused, Victim, Complainant
  PersonRefID INT,
  Number VARCHAR(20),
  IMEI VARCHAR(30)
);
CREATE INDEX idx_phone_number ON PhoneRecord (Number);
CREATE INDEX idx_phone_person ON PhoneRecord (PersonType, PersonRefID);

CREATE TABLE BankAccount (
  AccountID INT PRIMARY KEY,
  PersonType VARCHAR(20),
  PersonRefID INT,
  AccountNo VARCHAR(30),
  BankName VARCHAR(100),
  IFSC VARCHAR(15)
);
CREATE INDEX idx_bankaccount_person ON BankAccount (PersonType, PersonRefID);

CREATE TABLE FinancialTransaction (
  TxnID INT PRIMARY KEY,
  FromAccountID INT REFERENCES BankAccount(AccountID),
  ToAccountID INT REFERENCES BankAccount(AccountID),
  Amount DECIMAL(14,2),
  TxnDate DATETIME,
  CaseMasterID INT REFERENCES CaseMaster(CaseMasterID),
  FlaggedSuspicious BIT DEFAULT 0
);
CREATE INDEX idx_txn_accounts ON FinancialTransaction (FromAccountID, ToAccountID);
CREATE INDEX idx_txn_date ON FinancialTransaction (TxnDate);

CREATE TABLE CaseTimeline (
  TimelineID INT PRIMARY KEY,
  CaseMasterID INT NOT NULL REFERENCES CaseMaster(CaseMasterID),
  EventDate DATETIME,
  EventType VARCHAR(50), -- FIR Filed, Evidence Collected, Arrest, Chargesheet, Court Hearing, Closure
  Description TEXT,
  CreatedByID INT REFERENCES Employee(EmployeeID)
);
CREATE INDEX idx_timeline_case ON CaseTimeline (CaseMasterID);

CREATE TABLE OffenderRiskScore (
  RiskID INT PRIMARY KEY,
  AccusedMasterID INT NOT NULL REFERENCES Accused(AccusedMasterID),
  Score INT,
  ModelVersion VARCHAR(30),
  ComputedDate DATETIME,
  ExplanationJSON TEXT
);
CREATE INDEX idx_risk_accused ON OffenderRiskScore (AccusedMasterID);

CREATE TABLE CriminalNetworkEdge (
  EdgeID INT PRIMARY KEY,
  CaseMasterID INT REFERENCES CaseMaster(CaseMasterID),
  NodeAType VARCHAR(20) NOT NULL, -- Accused, Victim, Phone, BankAccount, Vehicle, Address
  NodeARefID INT NOT NULL,
  NodeBType VARCHAR(20) NOT NULL,
  NodeBRefID INT NOT NULL,
  RelationType VARCHAR(50), -- co-accused, owns, called, transacted_with, registered_to
  Weight DECIMAL(5,2) DEFAULT 1
);
CREATE INDEX idx_edge_nodeA ON CriminalNetworkEdge (NodeAType, NodeARefID);
CREATE INDEX idx_edge_nodeB ON CriminalNetworkEdge (NodeBType, NodeBRefID);

CREATE TABLE Attachment (
  AttachmentID INT PRIMARY KEY,
  CaseMasterID INT NOT NULL REFERENCES CaseMaster(CaseMasterID),
  StratusFileID VARCHAR(100),
  FileType VARCHAR(30),
  UploadedByID INT REFERENCES Employee(EmployeeID),
  UploadedDate DATETIME
);
CREATE INDEX idx_attachment_case ON Attachment (CaseMasterID);

CREATE TABLE Role (
  RoleID INT PRIMARY KEY,
  RoleName VARCHAR(50) NOT NULL UNIQUE
  -- Investigator, Crime Analyst, Senior Police Officer, Supervisor,
  -- State Crime Records Bureau, Policy Maker, Admin
);

CREATE TABLE Permission (
  PermissionID INT PRIMARY KEY,
  RoleID INT NOT NULL REFERENCES Role(RoleID),
  Module VARCHAR(50) NOT NULL,
  CanRead BIT DEFAULT 0,
  CanWrite BIT DEFAULT 0,
  CanExport BIT DEFAULT 0
);
CREATE UNIQUE INDEX idx_permission_role_module ON Permission (RoleID, Module);

CREATE TABLE AppUser (
  UserID INT PRIMARY KEY,
  EmployeeID INT NOT NULL REFERENCES Employee(EmployeeID),
  CatalystAuthID VARCHAR(100) NOT NULL UNIQUE,
  RoleID INT NOT NULL REFERENCES Role(RoleID),
  LastLogin DATETIME
);

CREATE TABLE AuditLog (
  LogID INT PRIMARY KEY,
  UserID INT REFERENCES AppUser(UserID),
  Action VARCHAR(100),
  EntityType VARCHAR(50),
  EntityID VARCHAR(50),
  EventTime DATETIME,
  IPAddress VARCHAR(50)
);
CREATE INDEX idx_audit_user ON AuditLog (UserID);
CREATE INDEX idx_audit_timestamp ON AuditLog (EventTime);

CREATE TABLE ChatConversation (
  ConversationID INT PRIMARY KEY,
  UserID INT NOT NULL REFERENCES AppUser(UserID),
  Title VARCHAR(200),
  CreatedDate DATETIME
);
CREATE INDEX idx_chatconv_user ON ChatConversation (UserID);

CREATE TABLE ChatMessage (
  MessageID INT PRIMARY KEY,
  ConversationID INT NOT NULL REFERENCES ChatConversation(ConversationID),
  Role VARCHAR(10), -- user, assistant
  Content TEXT,
  Language VARCHAR(10) DEFAULT 'en',
  CreatedDate DATETIME,
  SourceRefsJSON TEXT -- CaseMasterIDs / rows the answer was grounded in, for Explainable AI
);
CREATE INDEX idx_chatmsg_conv ON ChatMessage (ConversationID);

CREATE TABLE CrimeForecast (
  ForecastID INT PRIMARY KEY,
  UnitID INT REFERENCES Unit(UnitID),
  CrimeSubHeadID INT REFERENCES CrimeSubHead(CrimeSubHeadID),
  PredictedWindowStart DATE,
  PredictedWindowEnd DATE,
  RiskLevel VARCHAR(20), -- Low, Medium, High
  ModelVersion VARCHAR(30),
  GeneratedDate DATETIME
);
CREATE INDEX idx_forecast_unit ON CrimeForecast (UnitID);

-- ============================================================================
-- SEED: default roles + baseline permission matrix
-- ============================================================================

INSERT INTO Role (RoleID, RoleName) VALUES
  (1, 'Investigator'),
  (2, 'Crime Analyst'),
  (3, 'Senior Police Officer'),
  (4, 'Supervisor'),
  (5, 'State Crime Records Bureau'),
  (6, 'Policy Maker'),
  (7, 'Admin');

-- Baseline permissions: Investigators get read/write on case-level modules,
-- Analysts get read + export on analytics, Admin gets everything.
-- (Full matrix generated by database/seed-data-generator/permissions.js)
