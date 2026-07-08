'use strict';

const fetch = require('node-fetch');
const { getQuickMlAuthHeaders } = require('./quickml');
const logger = require('../utils/logger');

/**
 * Client for Catalyst QuickML's RAG feature — used for document-grounded
 * Q&A (e.g. standing orders, case-law references, uploaded case files)
 * as distinct from the structured-DB chat path in quickml.js. Mirrors
 * the "knowledge base" demo shown in the Catalyst hands-on session.
 */
async function queryKnowledgeBase(catalystApp, question, documentId = process.env.QUICKML_RAG_DOCUMENT_ID) {
  try {
    const headers = await getQuickMlAuthHeaders(catalystApp);
    const endpoint = process.env.QUICKML_RAG_ENDPOINT;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ document_id: documentId, query: question })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`QuickML RAG error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      answer: data.answer || data.output_text || '',
      sourceDocument: data.document_name || documentId,
      matchedChunks: data.matched_chunks || []
    };
  } catch (err) {
    logger.error('RAG query failed', { error: err.message });
    throw err;
  }
}

module.exports = { queryKnowledgeBase };
