'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const { success, failure } = require('../utils/response');
const { MODULES } = require('../config/constants');
const ChatService = require('../services/chat.service');
const CaseMasterRepository = require('../repositories/caseMaster.repository');
const { buildChatTranscriptHtml, buildCaseSummaryHtml } = require('../utils/pdfExport');

const router = express.Router();

/**
 * Returns rendering-ready HTML for a chat transcript. In production this
 * response is fed to Catalyst SmartBrowz (headless browser -> PDF) to
 * produce the actual downloadable PDF; the frontend calls SmartBrowz's
 * render endpoint with this HTML, per module 1's "Save Conversation
 * History in PDF format locally" requirement.
 */
router.get('/chat/:conversationId/export', authenticate, requirePermission(MODULES.AI_ASSISTANT, 'export'),
  auditLog('ChatConversation', 'EXPORT_PDF'),
  async (req, res, next) => {
    try {
      const service = new ChatService(req.catalystApp);
      const conversation = await service.chatRepo.getConversation(req.params.conversationId);
      if (!conversation) return failure(res, 'Conversation not found', 404);

      const messages = await service.getMessages(req.params.conversationId);
      const html = buildChatTranscriptHtml(conversation.Title, messages);
      return success(res, { html });
    } catch (err) { next(err); }
  });

router.get('/case/:caseId/export', authenticate, requirePermission(MODULES.FIR_SEARCH, 'export'),
  auditLog('CaseMaster', 'EXPORT_PDF'),
  async (req, res, next) => {
    try {
      const repo = new CaseMasterRepository(req.catalystApp);
      const caseData = await repo.getFullCaseById(req.params.caseId);
      if (!caseData) return failure(res, 'Case not found', 404);

      const html = buildCaseSummaryHtml(caseData);
      return success(res, { html });
    } catch (err) { next(err); }
  });

module.exports = router;
