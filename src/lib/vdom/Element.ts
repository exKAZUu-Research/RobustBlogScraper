/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
'use strict';

import * as _ from 'lodash';
import { HTML, IndexMap, MapInfo } from './HTML';
import { isVirtualNode, isVirtualText, VElement, VNode } from './virtual-dom-utility';

export class Element {
  public source: HTML;
  public index: number;
  public node: VElement;

  constructor(source: HTML, index: number, node: VElement) {
    this.source = source;
    this.index = index;
    this.node = node;
  }

  public static FROM_INDEX(source: HTML, index: number): Element {
    return new Element(source, index, asNode(source, index));
  }

  public static FROM_NODE(source: HTML, node: VElement): Element {
    return new Element(source, asIndex(source, node), node);
  }

  public getTagName(): string | null {
    if (isVirtualNode(this.node)) {
      return this.node.tagName;
    }
    return null;
  }

  public getTagNameP(): string | null {
    const tagName = this.getTagName();
    if (tagName) {
      return tagName;
    }

    const parent = this.parent();
    if (parent) {
      return parent.getTagNameP();
    }
    return null;
  }

  public hasClass(className: string): boolean {
    let x: any;
    return (
      isVirtualNode(this.node) &&
      (x = this.node.properties) &&
      (x = x.attributes) &&
      (x = x.class) &&
      x.includes(className)
    );
  }

  public parent(): Element | null {
    if (this.index === 0) {
      return null;
    }
    const map = this.source.indexMap;
    const info = map[this.index];
    if (info.parentIndex === null) {
      return null;
    }
    const parentInfo = map[info.parentIndex];
    return new Element(this.source, info.parentIndex, parentInfo.node);
  }

  public hasChildren(): boolean {
    return (<VNode>this.node).children.some(isVirtualNode);
  }

  public childNodes() {
    return (<VNode>this.node).children.filter(isVirtualNode).map(element => Element.FROM_NODE(this.source, element));
  }

  public contains(other: Element) {
    const startIx = this.index;
    const endIx = startIx + this.node.count;
    return startIx < other.index && other.index <= endIx && this.source.equals(other.source);
  }

  public equals(other: Element | null) {
    return other && this.index === other.index && this.source.path === other.source.path;
  }

  public toString(): string {
    if (isVirtualNode(this.node)) {
      return `${this.index}: <${this.node.tagName}>`;
    }
    if (isVirtualText(this.node)) {
      return `${this.index}: ${fmtVNode(this.node)}`;
    }
    return Object.prototype.toString.call(this);
  }

  public toHTML(): string {
    return fmtVNode(this.node);
  }

  public toText(): string {
    const buff: string[] = [];
    toText(this.node, buff);
    return buff.join('');
  }

  public getSelector(): string {
    return getSelector(this.index, this.source.indexMap, {});
  }
}

// ----- ----- ----- ----- private methods ----- ----- ----- -----

function isVElement(obj: any): obj is VElement {
  return !!obj.type;
}

function asIndex(source: HTML, nodeOrIndex: VElement | number): number {
  if (isVElement(nodeOrIndex)) {
    return nodeOrIndex.index;
  } else if (typeof nodeOrIndex === 'number' || typeof nodeOrIndex === 'string') {
    return nodeOrIndex;
  }
  throw new Error(`Unknown value: ${nodeOrIndex}`);
}

function asNode(source: HTML, nodeOrIndex: VElement | number): VElement {
  if (isVElement(nodeOrIndex)) {
    return nodeOrIndex;
  } else if (typeof nodeOrIndex === 'number' || typeof nodeOrIndex === 'string') {
    const info = source.indexMap[nodeOrIndex];
    if (info) {
      return info.node;
    }
  }
  throw new Error(`Unknown value: ${nodeOrIndex}`);
}

const ELLIPSIS = ['script', 'style', 'noscript'];
const NO_CLOSE = ['br', 'input', 'img'];

function fmtVNode(vnode: VElement | VElement[]): string {
  if (vnode === null) {
    return '';
  }
  if (Array.isArray(vnode)) {
    return vnode.map(fmtVNode).join('');
  }
  if (isVirtualText(vnode)) {
    return vnode.text
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (isVirtualNode(vnode)) {
    if (ELLIPSIS.includes(vnode.tagName)) {
      return `<${vnode.tagName}>...</${vnode.tagName}>`;
    }
    let attr = '';
    Object.keys(vnode.properties).forEach(key => {
      const value = vnode.properties[key];
      if (key === 'attributes') {
        Object.keys(value).forEach(k => {
          attr += ` ${k}="${value[k]}"`;
        });
      } else if (key === 'style') {
        const valuesStr = Object.keys(value)
          .map(k => `${k}:${value[k]}`)
          .join(';');
        attr += ` ${key}="${valuesStr}"`;
      } else {
        attr += ` ${key}="${value}"`;
      }
    });
    if (NO_CLOSE.includes(vnode.tagName)) {
      return `<${vnode.tagName}${attr}>`;
    } else {
      return `<${vnode.tagName}${attr}>${fmtVNode(vnode.children)}</${vnode.tagName}>`;
    }
  }
  throw new Error(`Unknown argument: ${JSON.stringify(vnode)}`);
}

function toText(vnode: VElement, buff: string[]): void {
  if (!vnode) {
    return;
  }
  if (isVirtualText(vnode)) {
    const str = vnode.text
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    buff.push(str);
    return;
  }
  if (isVirtualNode(vnode)) {
    if (ELLIPSIS.includes(vnode.tagName)) {
      return;
    }
    for (const child of vnode.children) {
      toText(child, buff);
    }
  }
}

function bottom2top(map: IndexMap, startIndex: number, f: (arg: MapInfo) => boolean | undefined): void {
  let info: MapInfo | undefined = map[startIndex];
  while (info !== undefined) {
    const isBreak = f(info);
    if (isBreak) {
      break;
    }
    if (info.parentIndex === null) {
      return;
    }
    info = map[info.parentIndex];
  }
}

function getSelector(index: number, map: IndexMap, options: { nth?: boolean; klass?: boolean }): string {
  const revPath: string[] = [];
  bottom2top(map, index, info => {
    const node = info.node;
    if (isVirtualNode(node)) {
      let selector = node.tagName;
      if (selector === 'table') {
        const last = revPath[revPath.length - 1];
        if (_.startsWith(last, 'tr')) {
          revPath.push('tbody');
        }
        if (_.startsWith(last, 'col')) {
          revPath.push('colgroup');
        }
      }
      if (selector !== 'body') {
        const attr = node.properties.attributes;
        if (attr) {
          if (attr.id) {
            revPath.push(`#${attr.id}`);
            return true;
          }
          if (options.klass && attr.class) {
            attr.class.split(' ').forEach((k: string) => {
              const klass = k.trim();
              if (klass.length > 0) {
                selector += `.${klass}`;
              }
            });
          }
        }
        if (options.nth && info.parentIndex !== null) {
          const parentInfo = map[info.parentIndex];
          if (isVirtualNode(parentInfo.node)) {
            const sibling = parentInfo.node.children;
            if (sibling.filter(s => isVirtualNode(s) && s.tagName === node.tagName).length > 1) {
              selector += `:nth-child(${info.siblingIndex + 1})`;
            }
          }
        }
      }
      revPath.push(selector);
    }
  });
  return revPath.reverse().join(' > ');
}
