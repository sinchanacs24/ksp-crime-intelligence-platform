'use strict';

const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const { aiLimiter } = require('../middleware/rateLimit.middleware');
const { validate } = require('../middleware/validation.middleware');
const { success, failure } = require('../utils/response');
const { MODULES } = require('../config/constants');
const ChatService = require('../services/chat.service');
const { processIncomingVoice, processOutgoingVoice } = require('../ai/voicePipeline');

const router = express.Router();

/**
 * Submits the slow "generate assistant reply" work to the chat-job
 * Job Function (15-minute budget), since QuickML's LLM call can
 * exceed the api function's hard 30-second Advanced I/O timeout.
 * Fire-and-forget from this function's perspective — the job writes
 * its result directly to the ChatMessage table, and the frontend polls
 * GET /conversations/:id/messages until it appears.
 */
async function submitChatJob(catalystApp, { conversationId, question, language, roleName }) {
  await catalystApp.jobScheduling().JOB.submitJob({
    job_name: `c${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    target_type: 'Function',
    target_name: 'chat-job',
    jobpool_name: 'seedpool',
    params: {
      conversationId: String(conversationId),
      question,
      language,
      roleName
    }
  });
}

router.get('/conversations', authenticate, requirePermission(MODULES.AI_ASSISTANT, 'read'),
  async (req, res, next) => {
    try {
      const service = new ChatService(req.catalystApp);
      const conversations = await service.listConversations(req.user.userId);
      return success(res, conversations);
    } catch (err) { next(err); }
  });

router.get('/conversations/:id/messages', authenticate, requirePermission(MODULES.AI_ASSISTANT, 'read'),
  async (req, res, next) => {
    try {
      const service = new ChatService(req.catalystApp);
      const messages = await service.getMessages(req.params.id);
      return success(res, messages);
    } catch (err) { next(err); }
  });

/**
 * Returns immediately once the officer's question is saved, WITHOUT
 * waiting for the AI's reply — the actual LLM call happens in the
 * chat-job Job Function. The frontend polls /conversations/:id/messages
 * to pick up the reply once it's ready.
 */
router.post('/message', authenticate, requirePermission(MODULES.AI_ASSISTANT, 'read'), aiLimiter,
  auditLog('ChatMessage', 'AI_QUERY'),
  validate(Joi.object({
    conversationId: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null),
    question: Joi.string().min(1).max(2000).required(),
    language: Joi.string().valid('en', 'kn').default('en')
  })),
  async (req, res, next) => {
    try {
      const service = new ChatService(req.catalystApp);
      const conversationId = await service.ensureConversationAndUserMessage({
        conversationId: req.body.conversationId,
        userId: req.user.userId,
        question: req.body.question,
        language: req.body.language
      });

      await submitChatJob(req.catalystApp, {
        conversationId,
        question: req.body.question,
        language: req.body.language,
        roleName: req.user.roleName
      });

      return success(res, { conversationId, status: 'processing' }, {}, 202);
    } catch (err) { next(err); }
  });

/**
 * Voice turn: transcribes + translates the officer's audio to English
 * synchronously (fast), saves it as the user message, then submits the
 * same chat-job for the reply. Audio synthesis of the reply happens via
 * a separate endpoint (/voice-reply/:conversationId) once the frontend
 * sees the text reply appear through polling — voice replies are
 * generated on demand rather than blocking this request.
 */
router.post('/voice-message', authenticate, requirePermission(MODULES.AI_ASSISTANT, 'read'), aiLimiter,
  auditLog('ChatMessage', 'AI_VOICE_QUERY'),
  validate(Joi.object({
    conversationId: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null),
    audioBase64: Joi.string().required(),
    language: Joi.string().valid('en-IN', 'kn-IN').default('kn-IN')
  })),
  async (req, res, next) => {
    try {
      const { englishTranscript } = await processIncomingVoice(req.catalystApp, req.body.audioBase64, req.body.language);
      const language = req.body.language.startsWith('kn') ? 'kn' : 'en';

      const service = new ChatService(req.catalystApp);
      const conversationId = await service.ensureConversationAndUserMessage({
        conversationId: req.body.conversationId,
        userId: req.user.userId,
        question: englishTranscript,
        language
      });

      await submitChatJob(req.catalystApp, {
        conversationId, question: englishTranscript, language, roleName: req.user.roleName
      });

      return success(res, { conversationId, status: 'processing', transcript: englishTranscript }, {}, 202);
    } catch (err) { next(err); }
  });

/**
 * Called by the frontend once polling reveals the assistant's text
 * reply is ready. Synthesizes speech for just that one message —
 * a much faster operation than the LLM call itself, so it comfortably
 * fits within the api function's 30-second limit on its own.
 */
router.post('/voice-reply/:conversationId', authenticate, requirePermission(MODULES.AI_ASSISTANT, 'read'),
  validate(Joi.object({
    text: Joi.string().required(),
    language: Joi.string().valid('en-IN', 'kn-IN').default('kn-IN')
  })),
  async (req, res, next) => {
    try {
      const voiceOut = await processOutgoingVoice(req.catalystApp, req.body.text, req.body.language);
      return success(res, { audioReplyBase64: voiceOut.audioBase64 });
    } catch (err) { next(err); }
  });

module.exports = router;