'use strict';

const ChatRepository = require('../repositories/chat.repository');
const CaseMasterRepository = require('../repositories/caseMaster.repository');
const AccusedRepository = require('../repositories/accused.repository');
const VictimRepository = require('../repositories/victim.repository');
const FinancialRepository = require('../repositories/financial.repository');
const { chatCompletion } = require('../ai/quickml');
const { queryKnowledgeBase } = require('../ai/ragClient');
const { buildSystemPrompt, buildStructuredQueryUserPrompt } = require('../ai/prompts');
const { toDatetime } = require('../utils/datetime');
const logger = require('../utils/logger');

/**
 * Agentic Conversational Crime Intelligence service (problem statement
 * section 1). Split into two phases across two different Catalyst
 * functions because QuickML's LLM call can exceed the Advanced I/O
 * function's hard 30-second timeout:
 *
 *   Phase 1 (runs in the "api" function, fast, synchronous):
 *     ensureConversationAndUserMessage() — creates the conversation if
 *     needed and saves the officer's message immediately, so the UI
 *     can show it right away and start polling for the reply.
 *
 *   Phase 2 (runs in the "chat-job" Job Function, slow, async):
 *     generateAssistantReply() — classifies intent, retrieves grounding
 *     data, calls the LLM, and saves the assistant's reply. Has a
 *     15-minute budget instead of 30 seconds.
 *
 * This file is duplicated (not shared) into functions/chat-job/src —
 * Catalyst functions can't share a node_modules/src tree across
 * function boundaries, so keep both copies in sync if you change it.
 */
class ChatService {
  constructor(catalystApp) {
    this.catalystApp = catalystApp;
    this.chatRepo = new ChatRepository(catalystApp);
    this.caseRepo = new CaseMasterRepository(catalystApp);
    this.accusedRepo = new AccusedRepository(catalystApp);
    this.victimRepo = new VictimRepository(catalystApp);
    this.financialRepo = new FinancialRepository(catalystApp);
  }

  _classifyIntent(question) {
    const q = question.toLowerCase();
    if (/repeat offender|more than \d+ cases|multiple cases/.test(q)) return 'repeat_offenders_lookup';
    if (/\bfir\b|crime no|case (status|number)/.test(q)) return 'case_lookup';
    if (/accused|offender|criminal/.test(q)) return 'accused_lookup';
    if (/victim/.test(q)) return 'victim_lookup';
    if (/transaction|bank|money|financial|account/.test(q)) return 'financial_lookup';
    if (/document|order|policy|circular|manual/.test(q)) return 'document_rag';
    return 'general';
  }

  async _retrieveContext(intent, question) {
    const nameMatch = question.match(/(?:named?|called)\s+([A-Za-z]+(?:\s[A-Za-z]+)?)/i)
      || question.match(/\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/);
    const crimeNoMatch = question.match(/\b\d{18}\b/);

    switch (intent) {
      case 'repeat_offenders_lookup': {
        const minCasesMatch = question.match(/more than (\d+)/i);
        const minCases = minCasesMatch ? Number(minCasesMatch[1]) : 2;
        const rows = await this.accusedRepo.findRepeatOffenders({ minCases, limit: 20 });
        return { rows, sourceType: 'Accused (repeat offenders)' };
      }
      case 'case_lookup': {
        if (crimeNoMatch) {
          const rows = await this.caseRepo.searchCases({ crimeNo: crimeNoMatch[0] }, { limit: 5 });
          return { rows, sourceType: 'CaseMaster' };
        }
        const rows = await this.caseRepo.searchCases({}, { limit: 10 });
        return { rows, sourceType: 'CaseMaster' };
      }
      case 'accused_lookup': {
        const name = nameMatch ? nameMatch[1] : '';
        const rows = name ? await this.accusedRepo.getCriminalHistory(name) : [];
        return { rows, sourceType: 'Accused+CaseMaster' };
      }
      case 'victim_lookup': {
        const rows = await this.victimRepo.getDemographicBreakdown({});
        return { rows: rows.slice(0, 25), sourceType: 'Victim+CaseMaster' };
      }
      case 'financial_lookup': {
        const rows = await this.financialRepo.getFlaggedTransactions({ limit: 15 });
        return { rows, sourceType: 'FinancialTransaction' };
      }
      default:
        return { rows: [], sourceType: 'none' };
    }
  }

  async startConversation(userId, title = 'New Investigation Chat') {
    return this.chatRepo.createConversation(userId, title);
  }

  async listConversations(userId) {
    return this.chatRepo.listConversations(userId);
  }

  async getMessages(conversationId) {
    return this.chatRepo.getRecentMessages(conversationId, 50);
  }

  /**
   * Phase 1 — fast, synchronous. Creates the conversation if needed
   * and immediately saves the officer's question. Returns right away
   * so the "api" function can respond well within its 30-second limit.
   */
  async ensureConversationAndUserMessage({ conversationId, userId, question, language = 'en' }) {
    let convoId = conversationId;
    if (!convoId) {
      const created = await this.startConversation(userId, question.slice(0, 60));
      convoId = created.ROWID || created.CONVERSATIONID || created.ConversationID;
    }

    await this.chatRepo.addMessage({
      ConversationID: convoId, Role: 'user', Content: question, Language: language,
      CreatedDate: toDatetime(new Date()), SourceRefsJSON: null
    });

    return convoId;
  }

  /**
   * Phase 2 — slow, runs inside the chat-job Job Function (15-minute
   * budget). Classifies intent, retrieves grounding data, calls the
   * LLM, and saves the assistant's reply. Assumes the user's message
   * was already saved by ensureConversationAndUserMessage().
   */
  async generateAssistantReply({ conversationId, question, language = 'en', roleName = 'Investigator' }) {
    const priorMessages = await this.chatRepo.getRecentMessages(conversationId, 10);
    const intent = this._classifyIntent(question);

    let contextRows = [];
    let sourceType = 'none';
    let ragAnswer = null;

    if (intent === 'document_rag') {
      try {
        ragAnswer = await queryKnowledgeBase(this.catalystApp, question);
      } catch (err) {
        logger.error('RAG lookup failed, falling back to structured path', { error: err.message });
      }
    } else {
      const retrieved = await this._retrieveContext(intent, question);
      contextRows = retrieved.rows;
      sourceType = retrieved.sourceType;
    }

    const systemPrompt = buildSystemPrompt({ language, roleName });
    // Exclude the just-saved user question from history since it's
    // passed separately as the current turn's prompt below.
    const conversationHistory = priorMessages
      .filter((m) => m.Content !== question)
      .map((m) => ({ role: m.Role, content: m.Content }));

    let assistantText;
    let sourceRefs;

    if (ragAnswer) {
      assistantText = ragAnswer.answer;
      sourceRefs = { type: 'document', document: ragAnswer.sourceDocument, chunks: ragAnswer.matchedChunks };
    } else {
      const userPrompt = buildStructuredQueryUserPrompt(question, contextRows);
      const result = await chatCompletion(this.catalystApp, {
        systemPrompt,
        messages: [...conversationHistory, { role: 'user', content: userPrompt }],
        maxTokens: language === 'kn' ? 1400 : 900
      });
      assistantText = result.text;
      sourceRefs = { type: sourceType, rowCount: contextRows.length, sampleIds: this._extractIds(contextRows) };
    }

    await this.chatRepo.addMessage({
      ConversationID: conversationId, Role: 'assistant', Content: assistantText, Language: language,
      CreatedDate: toDatetime(new Date()), SourceRefsJSON: JSON.stringify(sourceRefs)
    });

    return { conversationId, answer: assistantText, sourceRefs, intent };
  }

  _extractIds(rows) {
    return rows.slice(0, 5).map((r) => r.CaseMasterID || r.CaseMaster?.CaseMasterID || r.AccusedMasterID || null)
      .filter(Boolean);
  }
}

module.exports = ChatService;
