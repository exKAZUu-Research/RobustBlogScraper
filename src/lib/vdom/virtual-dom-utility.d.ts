/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
export let VNode: any;
export let VText: any;
export function isVirtualNode(x: any): x is VNode;
export function isVirtualText(x: any): x is VText;

export function diff(left: any, right: any): DiffInfo;
export function html2vdom(option: any): HTml2VDom;

interface VNode {
  type: 'VirtualNode';
  index: number;
  count: number;

  tagName: string;
  properties: any;
  children: VElement[];
}

interface VText {
  type: 'VirtualText';
  index: number;
  count: number;

  text: string;
}

interface DiffInfo {
  [key: string]: Patch;
  a: any;
}

interface Patch {
  vNode: VElement | undefined;
  patch: VElement | VElement[] | undefined;
}

export type VElement = VNode | VText;
type HTml2VDom = (arg: string) => VElement | VElement[];
