/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
const munkres = require('munkres-js');
const _ = require('lodash');

function levenshtein(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const d = [];

  if (len1 === 0) {
    return len2;
  }
  if (len2 === 0) {
    return len1;
  }

  for (let i = 0; i <= len1; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    d[0][j] = j;
  }

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      if (str1[i - 1] === str2[j - 1]) {
        d[i][j] = d[i - 1][j - 1];
      } else {
        d[i][j] = Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]) + 1;
      }
    }
  }
  return d[len1][len2];
}

function cosineSimilarity(map1, map2) {
  let sum = 0;
  let len1 = 0;
  let len2 = 0;
  _.each(map1, (value, key) => {
    sum += value * (map2[key] || 0);
    len1 += value * value;
  });
  _.each(map2, value => {
    len2 += value * value;
  });
  if (len1 * len2 === 0) return 0;
  return sum / Math.sqrt(len1 * len2);
}

function greedyMatching(costMatrix) {
  return _(costMatrix).map((costRow, index) => {
    return [index, _(costRow).indexOf(_(costRow).min())];
  });
}

function match(elements1, elements2, weights, options) {
  options = options || {};
  const maxTextLength = options.maxTextLength || 300;
  const matchingAlgorithm = options.matchingAlgorithm || munkres;
  const costMatrix = _(elements1).map(elem1 => {
    return _(elements2).map(elem2 => {
      return calculateCost(elem1, elem2, weights, maxTextLength);
    });
  });

  const matchings = matchingAlgorithm(costMatrix);
  return _(matchings).map(matching => {
    const elemIndex1 = matching[0];
    const elemIndex2 = matching[1];
    return [elements1[elemIndex1].index || elemIndex1, elements2[elemIndex2].index || elemIndex2];
  });
}

function matchTable(table1, table2, weights, options) {
  options = options || {};
  const maxTextLength = options.maxTextLength || 300;
  const matchingAlgorithm = options.matchingAlgorithm || munkres;
  const costMatrix = _(table1).map(elemList1 => {
    return _(table2).map(elemList2 => {
      const pairs = _.zip(elemList1, elemList2);
      let cnt = 0;
      let total = 0;
      _.each(pairs, pair => {
        const e1 = pair[0];
        const e2 = pair[1];
        if (e1 && e2) {
          total += calculateCost(e1, e2, weights, maxTextLength);
          cnt += 1;
        }
      });
      return cnt === 0 ? 1 : total / cnt;
    });
  });

  const matchings = matchingAlgorithm(costMatrix);
  return _(matchings).map(matching => {
    const elemIndex1 = matching[0];
    const elemIndex2 = matching[1];
    return [table1[elemIndex1], table2[elemIndex2]];
  });
}

function calculateCost(elem1, elem2, weights, maxTextLength) {
  let cost = 0;
  for (const key in weights) {
    const value1 = elem1[key];
    const value2 = elem2[key];

    if (typeof value1 === 'string' && typeof value2 === 'string') {
      const str1 = value1.slice(0, maxTextLength);
      const str2 = value2.slice(0, maxTextLength);
      const distance = levenshtein(str1, str2);
      if (distance !== 0) {
        cost += distance * weights[key] / Math.max(str1.length, str2.length);
      }
    } else if (typeof value1 === 'object' && typeof value2 === 'object') {
      cost += (1 - cosineSimilarity(value1, value2)) * weights[key];
    }
  }
  return cost;
}

exports.match = match;
exports.matchTable = matchTable;
exports.munkres = munkres;
exports.greedyMatching = greedyMatching;
