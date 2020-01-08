/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import * as _ from 'lodash';
import { Element } from './Element';
import { HTML } from './HTML';
import { isVirtualNode, isVirtualText, Patch } from './virtual-dom-utility';

function isReplace(vPatch: Patch) {
  const a = vPatch.vNode;
  const b = vPatch.patch;

  if (isVirtualText(a)) {
    if (isVirtualText(b)) {
      return (a.text || '').trim().length !== 0 || (b.text || '').trim().length !== 0;
    }
    return isVirtualNode(b);
  }
  if (isVirtualNode(a)) {
    return isVirtualText(b) || isVirtualNode(b);
  }
  return false;
}

interface Candidate {
  row: (Element | null)[];
  goodElementIndex: number;
}

export function findCandidates(htmls: string[], opts: { includeElement?: boolean } = {}): Candidate[] {
  const { includeElement } = opts;

  const roots = htmls.map(html => HTML.FROM_HTML(html).rootElement());
  const table = multiDiff(roots);
  const ret: Candidate[] = [];
  table.forEach(row => {
    if (row[0] == null) {
      return;
    }
    const ix = row.findIndex(x => fitForCandidate(x, includeElement));
    if (ix >= 0) {
      ret.push({ row: row, goodElementIndex: ix });
    }
  });
  return ret;
}

const IGNORE_CANDIDATE_TAGS = ['script', 'style'];

function fitForCandidate(element: Element | null, includeElement?: boolean): boolean {
  if (element === null) {
    return false;
  }
  if (!includeElement && !isVirtualText(element.node)) {
    return false;
  }
  const tagName = element.getTagNameP();
  if (IGNORE_CANDIDATE_TAGS.includes(tagName)) {
    return false;
  }
  return element.toText().length !== 0;
}

type Args = HTML[] | Element[] | string[];

export function multiDiff(args: Args): (Element | null)[][] {
  const SIZE = args.length;
  const elements = convertToElements(args);
  const table: (Element | null)[][] = [];
  const elem0 = elements[0];

  for (let i = 1; i < SIZE; i++) {
    const elem = elements[i];
    const elems0 = getDiffElements(elem0, elem);
    const elemsN = getDiffElements(elem, elem0);

    for (let j = 0; j < elemsN.length; j++) {
      const e0 = elems0[j];
      const eN = elemsN[j];
      let row = table.find(x => e0.equals(x[0]));
      if (!row) {
        row = _.times(SIZE, () => null);
        row[0] = e0;
        table.push(row);
      }
      row[i] = eN;
    }
  }

  // この時点で、0番目の要素とdiffが出ているものだけテーブルが埋まっているので、
  // 残りのセルを埋める処理を行う。
  table.forEach((row, rowIx) => {
    let nullableElemIx: number | null = null; // 0とはdiffが出たnodesのindex
    for (let i = 1; i < SIZE; i++) {
      if (row[i] !== null) {
        nullableElemIx = i;
        break;
      }
    }
    if (nullableElemIx === null) {
      return;
    }
    const elemIx: number = nullableElemIx;
    const elemN = elements[elemIx];
    for (let i = 1; i < SIZE; i++) {
      if (row[i] != null) {
        continue;
      }

      const elemI = elements[i];
      const elemsN = getDiffElements(elemN, elemI);
      const elemsI = getDiffElements(elemI, elemN);

      for (let j = 0; j < elemsN.length; j++) {
        const eI = elemsI[j];
        const eN = elemsN[j];
        const row2 = table.find(x => eN.equals(x[elemIx]));
        if (row2) {
          row2[i] = eI;
        }
      }
    }
  });

  return table.sort((elems1, elems2) => avgOfIndex(elems1) - avgOfIndex(elems2)); // 出現順序でソート

  function getDiffElements(elemA: Element, elemB: Element): Element[] {
    const diff = HTML.PARTIAL_DIFF(elemA, elemB);
    const ret: Element[] = [];
    Object.keys(diff).forEach(key => {
      if (key === 'a') {
        return;
      }
      if (isReplace(diff[key])) {
        const index = elemA.index + Number(key);
        const e = elemA.source.fromIndex(index);
        ret.push(e);
      }
    });
    return ret;
  }

  function avgOfIndex(elems: (Element | null)[]): number {
    const list = elems.filter(e => !!e);
    if (list.length === 0) {
      return 0;
    }
    return list.reduce((acc, e) => acc + e.index, 0) / list.length;
  }

  function convertToElements(values: Args): Element[] {
    const first = values[0];
    if (first instanceof Element) {
      return <Element[]>values;
    }
    if (first instanceof HTML) {
      return (<HTML[]>values).map(x => x.rootElement());
    }
    if (typeof first === 'string') {
      return (<string[]>values).map(p => HTML.FROM_PATH(p).rootElement());
    }
    throw new Error('Unknown type');
  }
}
