/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
const _ = require('lodash');

exports.parentText = function(elem) {
  const textBuff = [];
  const tagBuff = [];
  const classBuff = [];
  const parent = elem.parent().parent();
  storeTextTagClass(parent.node, textBuff, tagBuff, classBuff);
  // var classList = _.chain(classBuff).sortBy(function(x){return x;}).uniq().value();
  return textBuff.join('');
};

exports.parentTags = function(elem) {
  const textBuff = [];
  const tagBuff = [];
  const classBuff = [];
  const parent = elem.parent().parent();
  storeTextTagClass(parent.node, textBuff, tagBuff, classBuff);
  return tagBuff;
};

function storeTextTagClass(vnode, textBuff, tagBuff, classBuff) {
  let x;
  if (vnode === null) {
    return;
  }
  if (_.isArray(vnode)) {
    _.each(vnode, n => {
      storeTextTagClass(n, textBuff, tagBuff, classBuff);
    });
  }
  if (vnode.type === 'VirtualText') {
    const text = vnode.text
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    textBuff.push(text);
    return;
  }
  if (vnode.type === 'VirtualNode') {
    if (vnode.tagName === 'script' || vnode.tagName === 'style') {
      return;
    }
    tagBuff.push(vnode.tagName);
    if ((x = vnode.properties) && (x = x.attributes) && x.class) {
      const classList = x.class.split(' ');
      _.each(classList, className => {
        if (className) {
          classBuff.push(className);
        }
      });
    }
    storeTextTagClass(vnode.children, textBuff, tagBuff, classBuff);
  }
}
