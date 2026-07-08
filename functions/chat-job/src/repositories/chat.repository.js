'use strict';

const BaseRepository = require('./base.repository');
const { TABLES } = require('../config/constants');
const { runZcql } = require('../config/db');
const { toDatetime } = require('../utils/datetime');

class ChatRepository extends BaseRepository {
  constructor(catalystApp) {
    super(catalystApp, TABLES.CHAT_MESSAGE);
    this.conversationTable = TABLES.CHAT_CONVERSATION;
  }

  async createConversation(userId, title) {
    const convoRepo = new BaseRepository(this.catalystApp, this.conversationTable);
    return convoRepo.insert({ UserID: userId, Title: title, CreatedDate: toDatetime(new Date()) });
  }

  async getConversation(conversationId) {
    const convoRepo = new BaseRepository(this.catalystApp, this.conversationTable);
    return convoRepo.findById('ConversationID', conversationId);
  }

  async listConversations(userId) {
    const convoRepo = new BaseRepository(this.catalystApp, this.conversationTable);
    return convoRepo.find({ UserID: userId }, { orderBy: 'CreatedDate DESC', limit: 50 });
  }

  /**
   * Returns the last N messages for a conversation, oldest first — this
   * is what gives the assistant "memory" of prior turns (agentic context).
   */
  async getRecentMessages(conversationId, limit = 20) {
    const query = `SELECT * FROM ${TABLES.CHAT_MESSAGE}
      WHERE ConversationID = ${conversationId}
      ORDER BY CreatedDate DESC LIMIT 0, ${Number(limit)}`;
    const rows = await runZcql(this.catalystApp, query, { flatten: true, tableName: TABLES.CHAT_MESSAGE });
    return rows.reverse();
  }

  async addMessage(message) {
    return this.insert(message);
  }
}

module.exports = ChatRepository;
