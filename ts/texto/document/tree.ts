// Tree navigation utilities

import { Node } from './node.ts';

export function getParent(node: Node): Node | null {
  // In this implementation, parent tracking is done externally
  // via the builder's node stack
  return null;
}

export function getChildren(node: Node): Node[] {
  return node.children;
}

export function getFirstChild(node: Node): Node | null {
  return node.children[0] || null;
}

export function getLastChild(node: Node): Node | null {
  return node.children[node.children.length - 1] || null;
}

export function findChild(
  node: Node,
  predicate: (child: Node) => boolean
): Node | null {
  for (const child of node.children) {
    if (predicate(child)) {
      return child;
    }
  }
  return null;
}

export function findChildren(
  node: Node,
  predicate: (child: Node) => boolean
): Node[] {
  return node.children.filter(predicate);
}

export function findDescendants(
  node: Node,
  tagName: string
): Node[] {
  const results: Node[] = [];
  
  for (const child of node.children) {
    if (child.type === 'element' && child.tagName === tagName) {
      results.push(child);
    }
    results.push(...findDescendants(child, tagName));
  }
  
  return results;
}

export function getElementsByTagName(
  node: Node,
  tagName: string
): Node[] {
  return findDescendants(node, tagName);
}
