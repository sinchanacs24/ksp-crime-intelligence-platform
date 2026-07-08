'use strict';

const fetch = require('node-fetch');
const logger = require('../utils/logger');

/**
 * Thin client around Catalyst QuickML's LLM Serving endpoint
 * (crm-di-glm47b_30b_it / GLM-4.7-Flash).
 *
 * Auth uses the classic Connector pattern (client_id/client_secret/
 * refresh_token from a Self Client registered at api-console.zoho.in)
 * since this SDK version's connection() API doesn't support the
 * newer console-managed Connections feature.
 *
 * Access tokens are cached in module scope across warm invocations
 * of the same function instance (tokens last ~3600s per Zoho's OAuth
 * response) so most requests skip the OAuth round-trip entirely —
 * this matters because Advanced I/O functions have a hard 30-second
 * timeout, and an unnecessary token refresh on every single chat
 * message was eating into that budget.
 */
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getQuickMlAuthHeaders(catalystApp) {
  const now = Date.now();

  if (cachedToken && now < cachedTokenExpiresAt) {
    return {
      'Authorization': `Zoho-oauthtoken ${cachedToken}`,
      'CATALYST-ORG': process.env.QUICKML_ORG_ID,
      'Content-Type': 'application/json'
    };
  }

  const connection = catalystApp.connection({
    quickml: {
      client_id: process.env.QUICKML_CLIENT_ID,
      client_secret: process.env.QUICKML_CLIENT_SECRET,
      auth_url: 'https://accounts.zoho.in/oauth/v2/token',
      refresh_url: 'https://accounts.zoho.in/oauth/v2/token',
      refresh_token: process.env.QUICKML_REFRESH_TOKEN
    }
  }).getConnector('quickml');

  const accessToken = await connection.getAccessToken();
  cachedToken = accessToken;
  // Refresh 5 minutes early to be safe rather than exactly at expiry.
  cachedTokenExpiresAt = now + (55 * 60 * 1000);

  return {
    'Authorization': `Zoho-oauthtoken ${accessToken}`,
    'CATALYST-ORG': process.env.QUICKML_ORG_ID,
    'Content-Type': 'application/json'
  };
}

/**
 * Calls the LLM with a system prompt + conversation history + optional
 * grounding context. An explicit 20-second timeout on the fetch itself
 * ensures a slow LLM response surfaces as a clear, catchable error
 * well before Catalyst's hard 30-second function timeout silently
 * kills the whole request with no diagnostic information.
 */
async function chatCompletion(catalystApp, { systemPrompt, messages, temperature = 0.3, maxTokens = 150 }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const headers = await getQuickMlAuthHeaders(catalystApp);
    const endpoint = process.env.QUICKML_LLM_ENDPOINT;

    const payload = {
      model: 'crm-di-glm47b_30b_it',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature,
      max_tokens: maxTokens,
      // Disables the model's visible chain-of-thought reasoning trace —
      // without this, the "response" field contains raw step-by-step
      // internal reasoning text instead of a clean final answer.
      chat_template_kwargs: { enable_thinking: false }
    };

    const response = await fetch(endpoint, {
      method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`QuickML LLM error ${response.status}: ${errText}`);
    }
    const data = await response.json();
    // This QuickML deployment's actual response shape is
    // { response: "...", tool_calls: [...], usage: {...} } — NOT the
    // OpenAI-style { choices: [{ message: { content } }] } shape
    // originally assumed. Checking both, preferring the real one.
    return {
      text: data.response || data.choices?.[0]?.message?.content || data.output_text || '',
      usage: data.usage || null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err.name === 'AbortError'
      ? 'QuickML LLM request timed out after 25 seconds'
      : err.message;
    logger.error('QuickML chatCompletion failed', { error: message });
    throw new Error(message);
  }
}

module.exports = { chatCompletion, getQuickMlAuthHeaders };
