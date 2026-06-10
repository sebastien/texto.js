// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/backends/json
// Implements the backends/json module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
import type { Document, Node } from "../utils/types.ts";
import type { BackendOptions, OutputBackend } from "./types.ts";

interface JSONOptions {
	includePositions?: boolean;
}

function formatJSON(doc: Document, options: JSONOptions = {}): string {
	return JSON.stringify(documentToObject(doc, options), null, 2);
}

function documentToObject(doc: Document, options: JSONOptions): unknown {
	return {
		type: "document",
		header: nodeToObject(doc.header, options),
		content: nodeToObject(doc.content, options),
		references: nodeToObject(doc.references, options),
		appendices: nodeToObject(doc.appendices, options),
	};
}

function nodeToObject(node: Node, options: JSONOptions): unknown {
	const base: Record<string, unknown> = {
		id: node.id,
		type: node.type,
	};

	if (options.includePositions && node.position) {
		base.position = {
			start: node.position.start,
			end: node.position.end,
			line: node.position.line,
			column: node.position.column,
			...(node.position.block !== undefined
				? { block: node.position.block }
				: {}),
		};
	}

	if (node.type === "element") {
		base.name = node.name;
		if (node.attributes.size > 0) {
			const attrs: Record<string, string> = {};
			for (const [key, value] of node.attributes) {
				attrs[key] = value;
			}
			base.attributes = attrs;
		}
		if (node.children.length > 0) {
			base.children = node.children.map((child) =>
				nodeToObject(child, options),
			);
		}
	} else if (node.type === "text" || node.type === "comment") {
		base.content = node.content;
	}

	return base;
}

function toJSON(node: Document | Node, includePositions = false): string {
	if (node.type === "document") {
		return formatJSON(node as Document, { includePositions });
	}
	return JSON.stringify(
		nodeToObject(node as Node, { includePositions }),
		null,
		2,
	);
}

function deserializeDocument(jsonString: string): Document {
	const obj = JSON.parse(jsonString);

	function objectToNode(data: unknown): Node {
		if (typeof data !== "object" || data === null) {
			throw new Error("Invalid node data: expected object");
		}
		const record = data as Record<string, unknown>;
		const node: Node = {
			id:
				typeof record.id === "number"
					? record.id
					: Number(record.id ?? Number.NaN),
			type: record.type as "element" | "text" | "comment",
			attributes: new Map(),
			children: [],
		};

		if (!Number.isFinite(node.id)) {
			throw new Error("Invalid node data: expected numeric id");
		}

		if (record.name) node.name = record.name as string;
		if (record.content) node.content = record.content as string;
		if (record.attributes && typeof record.attributes === "object") {
			for (const [key, value] of Object.entries(record.attributes)) {
				node.attributes.set(key, value as string);
			}
		}
		if (record.children && Array.isArray(record.children)) {
			node.children = (record.children as unknown[]).map(objectToNode);
		}
		if (record.position && typeof record.position === "object") {
			const pos = record.position as Record<string, unknown>;
			node.position = {
				start: pos.start as number,
				end: pos.end as number,
				line: pos.line as number,
				column: pos.column as number,
				...(pos.block !== undefined ? { block: pos.block as number } : {}),
			};
		}

		return node;
	}

	const record = obj as Record<string, unknown>;
	if (record.type !== "document") {
		throw new Error("Invalid JSON: root must be a document");
	}

	return {
		type: "document",
		header: objectToNode(record.header),
		content: objectToNode(record.content),
		references: objectToNode(record.references),
		appendices: objectToNode(record.appendices),
	};
}

const jsonBackend: OutputBackend = (
	doc: Document,
	options: BackendOptions = {},
): string => {
	return formatJSON(doc, { includePositions: options.includePositions });
};

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { deserializeDocument, formatJSON, jsonBackend, toJSON };

// EOF
