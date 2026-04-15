// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/document/tree
// Implements the document/tree module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Tree navigation utilities

import type { Node } from "./node.ts";

function getParent(_node: Node): Node | null {
	// In this implementation, parent tracking is done externally
	// via the builder's node stack
	return null;
}

function getChildren(node: Node): Node[] {
	return node.children;
}

function getFirstChild(node: Node): Node | null {
	return node.children[0] || null;
}

function getLastChild(node: Node): Node | null {
	return node.children[node.children.length - 1] || null;
}

function findChild(
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

function findChildren(node: Node, predicate: (child: Node) => boolean): Node[] {
	return node.children.filter(predicate);
}

function findDescendants(node: Node, name: string): Node[] {
	const results: Node[] = [];

	for (const child of node.children) {
		if (child.type === "element" && child.name === name) {
			results.push(child);
		}
		results.push(...findDescendants(child, name));
	}

	return results;
}

function getElementsByName(node: Node, name: string): Node[] {
	return findDescendants(node, name);
}

// Backwards compatibility alias

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export {
	findChild,
	findChildren,
	findDescendants,
	getChildren,
	getElementsByName,
	type getElementsByTagName,
	getFirstChild,
	getLastChild,
	getParent,
};

// EOF
