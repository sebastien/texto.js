// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/backends/xml
// Implements the backends/xml module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
import type { Document, Node } from "../utils/types.ts";
import type { BackendOptions, OutputBackend } from "./types.ts";

function escapeXML(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function positionAttributes(node: Node, options: BackendOptions): string {
	if (!options.includePositions || !node.position) {
		return "";
	}
	const { start, end, line, column } = node.position;
	const block =
		node.position.block !== undefined ? ` block="${node.position.block}"` : "";
	return ` start="${start}" end="${end}" line="${line}" column="${column}"${block}`;
}

function nodeToXML(
	node: Node,
	indent = 0,
	options: BackendOptions = {},
): string {
	const pad = "  ".repeat(indent);
	const nameAttrs = node.name ? ` name="${escapeXML(node.name)}"` : "";
	const posAttrs = positionAttributes(node, options);

	if (node.type === "text") {
		const content = escapeXML(node.content || "");
		return `${pad}<node type="text"${posAttrs}>${content}</node>`;
	}

	if (node.type === "comment") {
		const content = escapeXML(node.content || "");
		return `${pad}<node type="comment"${posAttrs}>${content}</node>`;
	}

	const attributes = [...node.attributes.entries()];
	const children = node.children;
	const lines: string[] = [];

	lines.push(`${pad}<node type="element"${nameAttrs}${posAttrs}>`);

	if (attributes.length > 0) {
		lines.push(`${pad}  <attributes>`);
		for (const [name, value] of attributes) {
			lines.push(
				`${pad}    <attribute name="${escapeXML(name)}" value="${escapeXML(value)}" />`,
			);
		}
		lines.push(`${pad}  </attributes>`);
	}

	if (children.length > 0) {
		lines.push(`${pad}  <children>`);
		for (const child of children) {
			lines.push(nodeToXML(child, indent + 2, options));
		}
		lines.push(`${pad}  </children>`);
	}

	lines.push(`${pad}</node>`);
	return lines.join("\n");
}

const xmlBackend: OutputBackend = (
	doc: Document,
	options: BackendOptions = {},
): string => {
	const lines: string[] = [];
	lines.push('<?xml version="1.0" encoding="UTF-8"?>');
	lines.push('<ast type="document">');
	lines.push("  <header>");
	lines.push(nodeToXML(doc.header, 2, options));
	lines.push("  </header>");
	lines.push("  <content>");
	lines.push(nodeToXML(doc.content, 2, options));
	lines.push("  </content>");
	lines.push("  <references>");
	lines.push(nodeToXML(doc.references, 2, options));
	lines.push("  </references>");
	lines.push("  <appendices>");
	lines.push(nodeToXML(doc.appendices, 2, options));
	lines.push("  </appendices>");
	lines.push("</ast>");
	return lines.join("\n");
};

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { xmlBackend };

// EOF
