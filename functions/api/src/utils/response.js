'use strict';

function success(res, data, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, meta, error: null });
}

function failure(res, error, statusCode = 400, details = null) {
  return res.status(statusCode).json({ success: false, data: null, error: { message: error, details } });
}

module.exports = { success, failure };
