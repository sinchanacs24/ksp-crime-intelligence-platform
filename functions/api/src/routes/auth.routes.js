'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { success } = require('../utils/response');

const router = express.Router();

/**
 * Returns the currently authenticated officer's profile (resolved by
 * the authenticate middleware from Catalyst Authentication -> AppUser
 * -> Employee -> Role). The frontend calls this once after Catalyst's
 * embedded login flow completes to populate AuthContext.
 */
router.get('/me', authenticate, async (req, res) => {
  return success(res, req.user);
});

module.exports = router;
