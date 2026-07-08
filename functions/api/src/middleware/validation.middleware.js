'use strict';

const { failure } = require('../utils/response');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message);
      return failure(res, 'Validation failed', 422, details);
    }
    req[source] = value;
    next();
  };
}

module.exports = { validate };
