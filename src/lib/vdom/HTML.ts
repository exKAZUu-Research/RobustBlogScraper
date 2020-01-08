/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
'use strict';

import * as fs from 'fs';
import * as _ from 'lodash';
import { Element } from './Element';
import { diff, DiffInfo, html2vdom, isVirtualNode, VElement, VNode, VText } from './virtual-dom-utility';

const convertHTML = html2vdom({ VNode: VNode, VText: VText });

export interface MapInfo {
  index: number;
  parentIndex: number | null;
  siblingIndex: number;
  node: VElement;
}

export interface IndexMap {
  [key: string]: MapInfo;

  [key: number]: MapInfo;
}

export class HTML {
  public path: string;
  public vroot: VElement;
  public indexMap: IndexMap;

  constructor(path: string, vroot: VElement, indexMap: IndexMap) {
    this.path = path;
    this.vroot = vroot;
    this.indexMap = indexMap;
  }

  public static FROM_PATH(path: string): HTML {
    const node = path2node(path);
    const map = getIndexMap(node);
    return new HTML(path, node, map);
  }

  public static FROM_HTML(html: string): HTML {
    const node = html2node(html);
    const map = getIndexMap(node);
    return new HTML('(on memory)', node, map);
  }

  public static PARTIAL_DIFF(elemA: Element, elemB: Element) {
    return diff(elemA.node, elemB.node);
  }

  public rootElement(): Element {
    return new Element(this, 0, this.vroot);
  }

  public diff(other: HTML): DiffInfo {
    return diff(this.vroot, other.vroot);
  }

  public fromIndex(index: number): Element {
    return Element.FROM_INDEX(this, index);
  }

  public equals(other: HTML) {
    return this.path === other.path;
  }
}

// ----- ----- ----- ----- private methods ----- ----- ----- -----

function path2node(path: string): VElement {
  const html = fs.readFileSync(path).toString();
  return html2node(html);
}

function html2node(html: string): VNode {
  const nodes = convertHTML(html);
  if (isVirtualNode(nodes)) {
    return nodes;
  }
  if (_.isArray(nodes)) {
    for (const node of nodes) {
      if (isVirtualNode(node)) {
        return node;
      }
    }
  }
  throw new Error('element is not found.');
}

function getIndexMap(node: VElement): IndexMap {
  const dist: IndexMap = {};
  trie({ index: 0, node: node, parentIndex: null, siblingIndex: 0 });
  return dist;

  function trie(option: MapInfo) {
    dist[option.index] = option;
    option.node.index = option.index;

    if (isVirtualNode(option.node)) {
      let ix = option.index + 1;
      let siblingIndex = 0;
      option.node.children.forEach((child, i) => {
        trie({
          index: ix + i,
          node: child,
          parentIndex: option.index,
          siblingIndex: siblingIndex,
        });

        if (isVirtualNode(child)) {
          siblingIndex++;
        }
        ix += child.count || 0;
      });
    }
  }
}
