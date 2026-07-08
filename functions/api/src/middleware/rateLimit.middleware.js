'use strict';

const rateLimit = require('express-rate-limit');

const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, slow down.' } }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'AI request limit reached. Please wait a minute.' } }
});

module.exports = { standardLimiter, aiLimiter };
