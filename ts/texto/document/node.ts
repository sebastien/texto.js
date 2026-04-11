// Node creation and manipulation

import { Node, Position } from '../utils/types.ts';

export function createElement(
  tagName: string,
  attributes: Record<string, string> = {},
  position?: Position
): Node {
  return {
    type: 'element',
    tagName,
    attributes: new Map(Object.entries(attributes)),
    children: [],
    position
  };
}

export function createText(content: string, position?: Position): Node {
  return {
    type: 'text',
    content,
    attributes: new Map(),
    children: [],
    position
  };
}

export function createComment(content: string, position?: Position): Node {
  return {
    type: 'comment',
    content,
    attributes: new Map(),
    children: [],
    position
  };
}

export function appendChild(parent: Node, child: Node): void {
  parent.children.push(child);
}

export function setAttribute(node: Node, key: string, value: string): void {
  node.attributes.set(key, value);
}

export function getAttribute(node: Node, key: string): string | undefined {
  return node.attributes.get(key);
}

export function hasAttribute(node: Node, key: string): boolean {
  return node.attributes.has(key);
}

export function removeAttribute(node: Node, key: string): void {
  node.attributes.delete(key);
}

export function isElement(node: Node): boolean {
  return node.type === 'element';
}

export function isText(node: Node): boolean {
  return node.type === 'text';
}

export function isComment(node: Node): boolean {
  return node.type === 'comment';
}
