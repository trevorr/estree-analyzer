'use strict';

const analyze = require('./src/analyze');
const format = require('./src/format');
const Scope = require('./src/scope');
const types = require('./src/types');

module.exports = {
  analyze,
  format,
  Scope,
  types
};
