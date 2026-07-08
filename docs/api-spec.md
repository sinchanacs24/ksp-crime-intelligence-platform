# API Specification

Base URL (local/deployed): `{VITE_API_BASE_URL}` — the Catalyst Advanced I/O function's invocation URL for `api`, e.g. `https://your-project.development.catalystserverless.com/server/api`

All responses follow the envelope:
```json
{ "success": true, "data": {...}, "meta": {...}, "error": null }
```
or on failure:
```json
{ "success": false, "data": null, "error": { "message": "...", "details": null } }
```

Auth: every route except `/health` requires a valid Catalyst Authentication session (cookie-based, handled by `authenticate` middleware). Most routes additionally require an RBAC permission on a specific module — see `functions/api/src/config/constants.js` `MODULES` and `database/seed-data-generator/permissions.js` for the default matrix.

## Auth
| Method | Path | Description |
|---|---|---|
| GET | `/auth/me` | Returns the current officer's resolved profile (employee, role, unit) |

## FIR
| Method | Path | Description |
|---|---|---|
| GET | `/fir?crimeNo=&unitId=&crimeSubHeadId=&caseStatusId=&gravityOffenceId=&dateFrom=&dateTo=&limit=&offset=` | Search FIRs |
| GET | `/fir/:id` | Full case detail (joined with all lookups) |
| GET | `/fir/:id/timeline` | Investigation timeline (explicit + derived events) |
| GET | `/fir/:id/summary` | Auto-generated case summary |
| POST | `/fir/:id/timeline` | Add a manual timeline event `{ eventType, description }` |

## Accused / Criminal Search
| Method | Path | Description |
|---|---|---|
| GET | `/accused/profile?name=` | Behavioral profile + criminal history |
| GET | `/accused/repeat-offenders?minCases=` | Repeat offenders list |
| GET | `/accused/:id/outcomes` | Arrest/surrender outcome trail |
| GET | `/accused/:id/similar-cases?name=&caseMasterId=` | Similar Case Finder |
| POST | `/accused/:id/risk-score` | Compute + persist risk score `{ name }` |
| GET | `/accused/:id/risk-score` | Latest risk score |

## Victim
| Method | Path | Description |
|---|---|---|
| GET | `/victim/case/:caseId` | Victims for a case |
| GET | `/victim/demographics?dateFrom=&dateTo=&crimeSubHeadId=` | Age/gender/crime-type cross-tab |
| GET | `/victim/socio-economic?dateFrom=&dateTo=` | Complainant socio-economic correlation |

## Network Analysis
| Method | Path | Description |
|---|---|---|
| GET | `/network/accused/:id?depth=2` | Subgraph centered on an accused person |
| GET | `/network/organized-crime-groups?minSharedLinks=&minGroupSize=` | Suspected organized crime clusters |
| POST | `/network/link` | Manually link two nodes `{ caseMasterId, nodeAType, nodeARefId, nodeBType, nodeBRefId, relationType, weight }` |

## Financial Crime
| Method | Path | Description |
|---|---|---|
| GET | `/financial/case/:caseId/transactions` | Transactions tied to a case |
| GET | `/financial/trace/:accountId?hops=3` | Money trail trace + suspicion score |
| GET | `/financial/flagged?limit=` | Recently flagged transactions |

## Analytics
| Method | Path | Description |
|---|---|---|
| GET | `/analytics/dashboard-summary` | Total case counts by status |
| GET | `/analytics/crime-trend?unitId=&dateFrom=&dateTo=` | Monthly trend series per crime sub-head |
| GET | `/analytics/heatmap?dateFrom=&dateTo=&crimeSubHeadId=` | Geo-tagged case points |
| GET | `/analytics/sociological-insights` | Combined demographic + socio-economic view |

## Prediction
| Method | Path | Description |
|---|---|---|
| GET | `/prediction/forecasts?unitId=` | Latest persisted forecasts |
| POST | `/prediction/forecasts/recompute` | Manually trigger forecast recompute (demo only; production uses the nightly job) |

## AI Assistant
| Method | Path | Description |
|---|---|---|
| GET | `/chat/conversations` | List the officer's conversations |
| GET | `/chat/conversations/:id/messages` | Message history for a conversation |
| POST | `/chat/message` | Send a text turn `{ conversationId, question, language }` |
| POST | `/chat/voice-message` | Send a voice turn `{ conversationId, audioBase64, language }` |

## Reports
| Method | Path | Description |
|---|---|---|
| GET | `/reports/chat/:conversationId/export` | Chat transcript as renderable HTML (feed to Catalyst SmartBrowz for PDF) |
| GET | `/reports/case/:caseId/export` | Case summary as renderable HTML |

## Admin
| Method | Path | Description |
|---|---|---|
| GET / POST | `/admin/users` | List / create application users |
| PUT | `/admin/users/:id/role` | Change a user's role |
| GET | `/admin/roles` | List roles |
| GET | `/admin/permissions/:roleId` | Permission matrix for a role |
| PUT | `/admin/permissions/:permissionId` | Toggle a permission's read/write/export flags |
| GET | `/admin/audit-logs?limit=&offset=` | Audit log trail |
