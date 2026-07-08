'use strict';

const logger = require('../utils/logger');
const { failure } = require('../utils/response');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error('Unhandled request error', {
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.userId
  });
  const statusCode = err.statusCode || 500;
  return failure(res, err.message || 'Internal server error', statusCode);
}

module.exports = { errorHandler };
