// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/document/node
// Implements the document/node module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Node creation and manipulation

import type { Node, Position } from "../utils/types.ts";

let nextNodeId = 1;

function resetNodeIdCounter(start = 1): void {
	nextNodeId = Math.max(1, start);
}

function allocateNodeId(): number {
	const id = nextNodeId;
	nextNodeId += 1;
	return id;
}

function createElement(
	name: string,
	attributes: Record<string, string> = {},
	position?: Position,
): Node {
	return {
		id: allocateNodeId(),
		type: "element",
		name,
		attributes: new Map(Object.entries(attributes)),
		children: [],
		position,
	};
}

function createText(content: string, position?: Position): Node {
	return {
		id: allocateNodeId(),
		type: "text",
		content,
		attributes: new Map(),
		children: [],
		position,
	};
}

function createComment(content: string, position?: Position): Node {
	return {
		id: allocateNodeId(),
		type: "comment",
		content,
		attributes: new Map(),
		children: [],
		position,
	};
}

function appendChild(parent: Node, child: Node): void {
	parent.children.push(child);
}

function setAttribute(node: Node, key: string, value: string): void {
	node.attributes.set(key, value);
}

function getAttribute(node: Node, key: string): string | undefined {
	return node.attributes.get(key);
}

function hasAttribute(node: Node, key: string): boolean {
	return node.attributes.has(key);
}

function removeAttribute(node: Node, key: string): void {
	node.attributes.delete(key);
}

function isElement(node: Node): boolean {
	return node.type === "element";
}

function isText(node: Node): boolean {
	return node.type === "text";
}

function isComment(node: Node): boolean {
	return node.type === "comment";
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export {
	appendChild,
	createComment,
	createElement,
	createText,
	getAttribute,
	hasAttribute,
	isComment,
	isElement,
	isText,
	removeAttribute,
	resetNodeIdCounter,
	setAttribute,
};

// EOF
