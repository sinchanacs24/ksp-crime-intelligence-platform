'use strict';

/**
 * Builds simple HTML documents for case summaries and chat transcripts,
 * intended to be rendered to PDF via Catalyst SmartBrowz (headless
 * browser -> PDF) from the reports.routes.js handler. Kept as plain
 * HTML string generation (no heavy PDF library) so it runs comfortably
 * inside a 30-second serverless function.
 */

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function buildChatTranscriptHtml(conversationTitle, messages, language = 'en') {
  const rows = messages.map((m) => `
    <div class="msg ${m.Role}">
      <div class="role">${m.Role === 'user' ? 'Officer' : 'AI Assistant'}</div>
      <div class="content">${escapeHtml(m.Content)}</div>
      <div class="timestamp">${new Date(m.CreatedDate).toLocaleString()}</div>
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(conversationTitle)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { font-size: 20px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
  .msg { margin-bottom: 16px; padding: 12px; border-radius: 6px; }
  .msg.user { background: #eef3f8; border-left: 4px solid #1e3a5f; }
  .msg.assistant { background: #f7f7f7; border-left: 4px solid #7a8b99; }
  .role { font-weight: 600; font-size: 12px; text-transform: uppercase; color: #555; }
  .content { margin-top: 4px; white-space: pre-wrap; }
  .timestamp { margin-top: 6px; font-size: 11px; color: #999; }
  footer { margin-top: 40px; font-size: 10px; color: #999; }
</style>
</head>
<body>
  <h1>KSP Crime Intelligence Platform — Conversation Export</h1>
  <p><strong>Title:</strong> ${escapeHtml(conversationTitle)}</p>
  ${rows}
  <footer>Generated on ${new Date().toLocaleString()} — Confidential, for authorized law enforcement use only.</footer>
</body>
</html>`;
}

function buildCaseSummaryHtml(caseData) {
  const { CaseMaster, CaseCategory, CrimeHead, CrimeSubHead, CaseStatusMaster, Employee, Unit } = caseData;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Case Summary - ${escapeHtml(CaseMaster.CrimeNo)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { font-size: 20px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  td { padding: 8px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
  td.label { font-weight: 600; width: 220px; color: #444; }
  .brief { margin-top: 20px; padding: 12px; background: #f7f7f7; border-radius: 6px; }
</style>
</head>
<body>
  <h1>Case Summary Report</h1>
  <table>
    <tr><td class="label">Crime Number</td><td>${escapeHtml(CaseMaster.CrimeNo)}</td></tr>
    <tr><td class="label">Case Number</td><td>${escapeHtml(CaseMaster.CaseNo)}</td></tr>
    <tr><td class="label">Registered Date</td><td>${escapeHtml(CaseMaster.CrimeRegisteredDate)}</td></tr>
    <tr><td class="label">Category</td><td>${escapeHtml(CaseCategory.LookupValue)}</td></tr>
    <tr><td class="label">Crime Head</td><td>${escapeHtml(CrimeHead.CrimeGroupName)} / ${escapeHtml(CrimeSubHead.CrimeHeadName)}</td></tr>
    <tr><td class="label">Status</td><td>${escapeHtml(CaseStatusMaster.CaseStatusName)}</td></tr>
    <tr><td class="label">Investigating Officer</td><td>${escapeHtml(Employee.FirstName)}</td></tr>
    <tr><td class="label">Police Station</td><td>${escapeHtml(Unit.UnitName)}</td></tr>
  </table>
  <div class="brief"><strong>Brief Facts:</strong><br/>${escapeHtml(CaseMaster.BriefFacts)}</div>
</body>
</html>`;
}

module.exports = { buildChatTranscriptHtml, buildCaseSummaryHtml, escapeHtml };
