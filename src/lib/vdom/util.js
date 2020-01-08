/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
'use strict';

const process = require('process');
const _ = require('lodash');

function leftpad(str, len, ch) {
  str = String(str);
  const padLen = len - str.length;
  if (padLen <= 0) return str;
  if (!ch && ch !== 0) ch = ' ';
  return String(ch).repeat(padLen) + str;
}

function transpose(matrix) {
  const ret = [];
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    for (let j = 0; j < row.length; j++) {
      ret[j] = ret[j] || [];
      ret[j][i] = row[j];
    }
  }
  return ret;
}

function tableMap(table, f) {
  return _.map(table, row => _.map(row, cell => f(cell)));
}

exports.leftpad = leftpad;
exports.transpose = transpose;
exports.tableMap = tableMap;

const colors = { red: 31, green: 32, yellow: 33, blue: 34, purple: 35, cyan: 36 };
_.each(colors, (color, key) => {
  exports[key] = function(str, out) {
    out = out || process.stdout;
    return out.isTTY ? '\u001B[' + color + 'm' + str + '\u001B[0m' : str;
  };
});
