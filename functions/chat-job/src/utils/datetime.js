'use strict';

/**
 * Catalyst Data Store's DATETIME columns do not accept standard ISO
 * 8601 strings (e.g. "2025-04-24T11:14:09.973Z") — the accepted
 * format is "YYYY-MM-DD HH:mm:ss" (no 'T'/'Z', no milliseconds).
 * Every insertRow() call writing to a DATETIME column anywhere in
 * this codebase should format its value through this function
 * instead of calling .toISOString() directly.
 */
function toDatetime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

module.exports = { toDatetime };
