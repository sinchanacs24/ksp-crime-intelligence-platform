'use strict';

/**
 * Catalyst Job Function: processes one AI Assistant chat turn.
 *
 * Moved here from the "api" Advanced I/O function because that
 * function has a hard 30-second timeout, and QuickML's LLM Serving
 * endpoint (a 30B-parameter model) can take longer than that to
 * respond — especially on a cold start. Job Functions have a
 * 15-minute budget instead, comfortably covering this.
 *
 * Triggered programmatically from functions/api/src/routes/chat.routes.js
 * via catalystApp.jobScheduling().JOB.submitJob(...). The frontend gets
 * an immediate "processing" response from the api function (the user's
 * message is already saved by then), then polls
 * GET /chat/conversations/:id/messages until this job's result (the
 * assistant's reply row) appears.
 */

const catalyst = require('zcatalyst-sdk-node');
const ChatService = require('./src/services/chat.service');

module.exports = async (jobRequest, context) => {
  try {
    const catalystApp = catalyst.initialize(context);

    const params = jobRequest.getAllJobParams();
    const conversationId = params.conversationId;
    const question = params.question;
    const language = params.language || 'en';
    const roleName = params.roleName || 'Investigator';

    console.log(`Generating assistant reply for conversation ${conversationId}`);

    const chatService = new ChatService(catalystApp);
    const result = await chatService.generateAssistantReply({ conversationId, question, language, roleName });

    console.log(`Reply saved for conversation ${result.conversationId}, intent: ${result.intent}`);
    context.closeWithSuccess();
  } catch (err) {
    console.error('Chat job failed:', err.message, err.stack);
    context.closeWithFailure();
  }
};
