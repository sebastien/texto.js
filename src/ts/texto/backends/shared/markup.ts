// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/backends/shared/markup
// Shared helpers for markup-oriented backends such as texto and markdown.

import type { Node } from "../../utils/types.ts";

type InlineRenderer = (node: Node) => string;
type BlockRenderer = (node: Node) => string;

function getElementChild(node: Node, name: string): Node | undefined {
	return node.children.find(
		(child) => child.type === "element" && child.name === name,
	);
}

function getElementChildren(node: Node, name: string): Node[] {
	return node.children.filter(
		(child) => child.type === "element" && child.name === name,
	);
}

function renderInlineChildren(
	node: Node,
	renderInline: InlineRenderer,
): string {
	return node.children.map((child) => renderInline(child)).join("");
}

function renderBlockChildren(node: Node, renderBlock: BlockRenderer): string {
	const blocks = node.children
		.map((child) => renderBlock(child))
		.filter(Boolean);
	return blocks.join("\n\n");
}

function indentBlock(text: string, prefix: string): string {
	return text
		.split("\n")
		.map((line) => `${prefix}${line}`)
		.join("\n");
}

function escapeAttribute(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function getSectionParts(node: Node): {
	depth: number;
	title: Node | undefined;
	content: Node | undefined;
} {
	return {
		depth: Math.max(1, parseInt(node.attributes.get("depth") || "1", 10)),
		title: getElementChild(node, "title"),
		content: getElementChild(node, "content"),
	};
}

export type { BlockRenderer, InlineRenderer };
export {
	escapeAttribute,
	getElementChild,
	getElementChildren,
	getSectionParts,
	indentBlock,
	renderBlockChildren,
	renderInlineChildren,
};

// EOF
