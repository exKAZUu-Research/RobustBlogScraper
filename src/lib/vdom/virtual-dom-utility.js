/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
'use strict';

exports.VNode = require('virtual-dom/vnode/vnode');
exports.VText = require('virtual-dom/vnode/vtext');
exports.isVirtualNode = require('virtual-dom/vnode/is-vnode');
exports.isVirtualText = require('virtual-dom/vnode/is-vtext');
exports.diff = require('virtual-dom/diff');
exports.html2vdom = require('html-to-vdom');
