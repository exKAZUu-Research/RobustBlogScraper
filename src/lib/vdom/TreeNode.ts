/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
'use strict';

import { Element } from './Element';
import { HTML, IndexMap } from './HTML';

enum OutputFormat {
  Html,
  Text,
}

export class TreeNode {
  public index: number;
  public weight: number;
  public totalWeight: number;
  public parent: TreeNode | null;
  public children: TreeNode[];

  constructor(index: number, weight: number) {
    this.index = index;
    this.weight = weight;
    this.totalWeight = weight;
    this.parent = null;
    this.children = [];
  }

  public static BUILD_TREE(elements: Element[], weightCalc = (elem: Element) => 1): TreeNode | null {
    if (elements.length === 0) {
      return null;
    }

    const trunk = new TreeNode(0, 0);
    const firstElem = elements[0];
    const map = firstElem.source.indexMap;

    let lastNode = new TreeNode(firstElem.index, 1);
    if (lastNode.index === 0) {
      return lastNode;
    }
    trunk.appendChild(lastNode);

    for (let i = 1; i < elements.length; i++) {
      const elem = elements[i];
      const bIndex = branchIndex(map, lastNode.index, elem.index);
      const branch = lastNode.insertAncestor(bIndex);

      lastNode = new TreeNode(elem.index, weightCalc(elem));
      branch.appendChild(lastNode);
    }
    trunk.updateTotalWeight();
    return trunk;
  }

  public appendChild(node: TreeNode): void {
    console.assert(
      this.index < node.index,
      `child's index(${node.index}) must be less than parent's index(${this.index})`
    );

    node.parent = this;
    this.children.push(node);
  }

  public insertAncestor(index: number): TreeNode {
    let cursor: TreeNode = this; // tslint:disable-line:no-this-assignment
    while (!(cursor.index <= index)) {
      const next = cursor.parent;
      if (next === null) {
        throw new Error('Unreachable!');
      }
      cursor = next;
    }
    if (cursor.index === index) {
      return cursor;
    }

    const node = new TreeNode(index, 0);
    const poped = cursor.replaceLastChild(node);
    node.appendChild(poped);
    return node;
  }

  public replaceLastChild(node: TreeNode): TreeNode {
    console.assert(this.children.length > 0, 'node must have at least one child');

    const last = this.children.length - 1;
    const poped = this.children[last];
    console.assert(this.index < node.index && node.index < poped.index, 'invalid order: index');
    this.children[last] = node;
    node.parent = this;
    poped.parent = null;
    return poped;
  }

  public updateTotalWeight(): number {
    if (this.totalWeight === 0) {
      let sum = this.weight;
      for (const child of this.children) {
        sum += child.updateTotalWeight();
      }
      this.totalWeight = sum;
    }
    return this.totalWeight;
  }

  public validate(parent: TreeNode | null): void {
    if (this.parent !== parent) {
      throw new Error(`Expect ${parent}, but ${this.parent}`);
    }
    for (const child of this.children) {
      child.validate(this);
    }
  }

  public getMainContent(html: HTML, threshold: number, htmlInsteadOfText: boolean): string {
    let content = '';
    for (const child of this.children) {
      content += child.getMainContent(html, threshold, htmlInsteadOfText);
    }
    if (content) {
      return content;
    }
    if (this.totalWeight >= threshold) {
      const elem = html.fromIndex(this.index);
      return htmlInsteadOfText ? elem.toHTML() : elem.toText();
    }
    return '';
  }

  public getDebugInfoWhenSelectingMainContent(html: any, threshold: number): string {
    const ret = { output: '' };
    this.getDebugInfoWhenSelectingMainContentPrivate(html, threshold, '', '', ret);
    return ret.output;
  }

  private getDebugInfoWhenSelectingMainContentPrivate(
    html: any,
    threshold: number,
    indent: string,
    delimiter: string,
    debugInfo: { output: string }
  ): void {
    const isMainContent = this.totalWeight >= threshold;
    const elem = html.FROM_INDEX(this.index);
    let output = indent;
    output += isMainContent ? '+ ' : '- ';
    output += this.totalWeight > 1 ? `${this.totalWeight}) ` : '';
    output += elem.node.tagName ? `<${elem.node.tagName}>` : '';
    output += elem.toText().substring(0, 20);
    output += delimiter;
    debugInfo.output += output;

    for (const child of this.children) {
      child.getDebugInfoWhenSelectingMainContentPrivate(html, threshold, `${indent}  `, '\n', debugInfo);
    }
  }
}

function branchIndex(map: IndexMap, index1: number, index2: number): number {
  let info1 = map[index1];
  let info2 = map[index2];
  for (;;) {
    if (info1.index === info2.index) {
      return info1.index;
    } else if (info1.index > info2.index) {
      if (info1.parentIndex === null) {
        throw new Error('unreachable');
      }
      info1 = map[info1.parentIndex];
    } else {
      if (info2.parentIndex === null) {
        throw new Error('unreachable');
      }
      info2 = map[info2.parentIndex];
    }
  }
}
