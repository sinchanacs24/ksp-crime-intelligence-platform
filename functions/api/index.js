'use strict';

/**
 * Entry point for the "api" Catalyst Advanced I/O function.
 * Catalyst boots this file and forwards every incoming HTTP request to
 * the exported Express app. Route prefix "/server/api" matches the
 * default Advanced I/O function invocation path
 * (https://<project>.catalystserverless.com/server/<function-name>/...).
 */

const express = require('express');
// cors package no longer imported — see note near app.use() below
const helmet = require('helmet');

const { standardLimiter } = require('./src/middleware/rateLimit.middleware');
const { errorHandler } = require('./src/middleware/errorHandler.middleware');
const logger = require('./src/utils/logger');

const authRoutes = require('./src/routes/auth.routes');
const firRoutes = require('./src/routes/fir.routes');
const accusedRoutes = require('./src/routes/accused.routes');
const victimRoutes = require('./src/routes/victim.routes');
const networkRoutes = require('./src/routes/network.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const predictionRoutes = require('./src/routes/prediction.routes');
const financialRoutes = require('./src/routes/financial.routes');
const chatRoutes = require('./src/routes/chat.routes');
const reportsRoutes = require('./src/routes/reports.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();

app.use(helmet());
// CORS is handled entirely by Catalyst's own domain whitelisting
// (Authentication -> Additional Settings -> Authorized Domains).
// Adding an app-level CORS middleware here as well causes duplicate
// Access-Control-Allow-Origin headers, which browsers reject outright.
app.use(express.json({ limit: '10mb' })); // 10mb to accommodate base64 voice-message audio payloads
app.use(standardLimiter);

app.use((req, res, next) => {
  logger.info('Incoming request', { method: req.method, path: req.path });
  next();
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'ksp-crime-intelligence-api' }));

app.use('/auth', authRoutes);
app.use('/fir', firRoutes);
app.use('/accused', accusedRoutes);
app.use('/victim', victimRoutes);
app.use('/network', networkRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/prediction', predictionRoutes);
app.use('/financial', financialRoutes);
app.use('/chat', chatRoutes);
app.use('/reports', reportsRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: { message: 'Route not found' } });
});

app.use(errorHandler);

module.exports = app;

// Catalyst Advanced I/O functions expect the module to also handle the
// (req, res, context) signature directly when not run through a local
// Express server; wrapping app as the default export is sufficient for
// Catalyst's Node runtime, which mounts Express apps automatically.
