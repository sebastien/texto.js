// Tree navigation utilities

import type { Node } from "./node.ts";

export function getParent(_node: Node): Node | null {
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
	predicate: (child: Node) => boolean,
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
	predicate: (child: Node) => boolean,
): Node[] {
	return node.children.filter(predicate);
}

export function findDescendants(node: Node, name: string): Node[] {
	const results: Node[] = [];

	for (const child of node.children) {
		if (child.type === "element" && child.name === name) {
			results.push(child);
		}
		results.push(...findDescendants(child, name));
	}

	return results;
}

export function getElementsByName(node: Node, name: string): Node[] {
	return findDescendants(node, name);
}

// Backwards compatibility alias
export { getElementsByName as getElementsByTagName };
