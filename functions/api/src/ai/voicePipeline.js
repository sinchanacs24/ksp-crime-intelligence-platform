'use strict';

const fetch = require('node-fetch');
const { getQuickMlAuthHeaders } = require('./quickml');
const logger = require('../utils/logger');

/**
 * Voice Assistant module (module 5). Chains three Catalyst Zia services
 * exactly as recommended in the Catalyst hands-on session:
 *   audio -> speech-to-text -> (optional) translate to English ->
 *   [LLM answers] -> translate back to Kannada -> text-to-speech
 *
 * Each stage is a small independent function so the chat route can call
 * only the stages it needs (e.g. skip translation if the officer is
 * already speaking English).
 */

async function speechToText(catalystApp, audioBase64, languageCode = 'en-IN') {
  const headers = await getQuickMlAuthHeaders(catalystApp);
  const endpoint = process.env.ZIA_SPEECH_TO_TEXT_ENDPOINT;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ audio: audioBase64, language: languageCode })
  });
  if (!response.ok) throw new Error(`Speech-to-text failed: ${response.status}`);
  const data = await response.json();
  return data.transcript || '';
}

async function translateText(catalystApp, text, sourceLang, targetLang) {
  if (sourceLang === targetLang) return text;
  const headers = await getQuickMlAuthHeaders(catalystApp);
  const endpoint = process.env.ZIA_TRANSLATE_ENDPOINT;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, source_language: sourceLang, target_language: targetLang })
  });
  if (!response.ok) throw new Error(`Translation failed: ${response.status}`);
  const data = await response.json();
  return data.translated_text || text;
}

async function textToSpeech(catalystApp, text, languageCode = 'en-IN') {
  const headers = await getQuickMlAuthHeaders(catalystApp);
  const endpoint = process.env.ZIA_TEXT_TO_SPEECH_ENDPOINT;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, language: languageCode })
  });
  if (!response.ok) throw new Error(`Text-to-speech failed: ${response.status}`);
  const data = await response.json();
  return data.audio_base64 || null; // base64-encoded audio for client playback
}

/**
 * Full pipeline: takes officer's spoken audio in `language` and returns
 * the transcript in English (for the LLM) plus the language to translate
 * the final answer back into.
 */
async function processIncomingVoice(catalystApp, audioBase64, language = 'kn-IN') {
  const rawTranscript = await speechToText(catalystApp, audioBase64, language);
  const englishTranscript = language.startsWith('en')
    ? rawTranscript
    : await translateText(catalystApp, rawTranscript, language.slice(0, 2), 'en');
  return { rawTranscript, englishTranscript, originalLanguage: language };
}

/**
 * Converts the LLM's English answer back to the officer's spoken
 * language and synthesizes audio for playback.
 */
async function processOutgoingVoice(catalystApp, englishAnswer, targetLanguage = 'kn-IN') {
  const translated = targetLanguage.startsWith('en')
    ? englishAnswer
    : await translateText(catalystApp, englishAnswer, 'en', targetLanguage.slice(0, 2));
  const audioBase64 = await textToSpeech(catalystApp, translated, targetLanguage);
  return { translatedText: translated, audioBase64 };
}

module.exports = { speechToText, translateText, textToSpeech, processIncomingVoice, processOutgoingVoice };
