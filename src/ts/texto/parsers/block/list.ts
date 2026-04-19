// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/block/list
// Implements the parsers/block/list module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// List block parser with recursive content parsing
// Enhanced to parse nested blocks within list items

import { createElement, createText } from "../../document/node.ts";
import type { BlockParsingEngine } from "../../parsing/block.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, Node, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

interface ListParserOptions {
	priority?: number;
	stripContinuationIndent?: boolean;
	orderedMarker?: ")" | "." | "both";
	includeBoundaryBlankLine?: boolean;
}

class ListParser extends BaseBlockParser {
	private stripContinuationIndent: boolean;
	private orderedMarker: ")" | "." | "both";
	private includeBoundaryBlankLine: boolean;

	constructor(priorityOrOptions?: number | ListParserOptions) {
		const options =
			typeof priorityOrOptions === "number"
				? { priority: priorityOrOptions }
				: (priorityOrOptions ?? {});
		super("list", options.priority ?? BLOCK_PRIORITIES.LIST);
		this.stripContinuationIndent = options.stripContinuationIndent ?? false;
		this.orderedMarker = options.orderedMarker ?? "both";
		this.includeBoundaryBlankLine = options.includeBoundaryBlankLine ?? true;
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Check for list markers
		const current = cursor.current();
		const next = cursor.peek(1);

		// GitHub-style task list: -, *, + followed by [ ], [x], or [X]
		if (
			(current === "-" || current === "*" || current === "+") &&
			(next === " " || next === "\t")
		) {
			const boxOpen = cursor.peek(2);
			const boxState = cursor.peek(3);
			const boxClose = cursor.peek(4);
			const afterBox = cursor.peek(5);

			if (
				boxOpen === "[" &&
				boxClose === "]" &&
				(boxState === " " || boxState === "x" || boxState === "X") &&
				(afterBox === " " || afterBox === "\t")
			) {
				cursor.pos = save.pos;
				cursor.lineNumber = save.lineNumber;
				cursor.columnNumber = save.columnNumber;
				const checked = boxState === "x" || boxState === "X";
				return { type: "list", listType: "todo", checked, markerWidth: 6 };
			}

			// Unordered: - or * or +
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return { type: "list", listType: "unordered", markerWidth: 2 };
		}

		// Ordered: 1), 1., a)
		if (/[0-9a-zA-Z]/.test(current || "")) {
			let numEnd = 1;
			while (/[0-9a-zA-Z]/.test(cursor.peek(numEnd) || "")) {
				numEnd++;
			}
			const marker = cursor.peek(numEnd);
			const orderedMarkerAllowed =
				this.orderedMarker === "both" || this.orderedMarker === marker;
			if (
				orderedMarkerAllowed &&
				(marker === ")" || marker === ".") &&
				(cursor.peek(numEnd + 1) === " " || cursor.peek(numEnd + 1) === "\t")
			) {
				cursor.pos = save.pos;
				cursor.lineNumber = save.lineNumber;
				cursor.columnNumber = save.columnNumber;
				return {
					type: "list",
					listType: "ordered",
					markerWidth: numEnd + 2,
				};
			}
		}

		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;
		return null;
	}

	process(
		cursor: Cursor,
		context: ParsingContext,
		info: RecognitionInfo,
		engine?: BlockParsingEngine,
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;

		// Get indentation of first item
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);
		const firstIndent = cursor.pos - save.pos;
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		// Create list node (position will be updated at the end)
		const listNode = context.builder.createAndAppend(
			"list",
			{},
			{
				start,
				end: start,
				line: startLine,
				column: startColumn,
			},
		);
		listNode.attributes.set("_indent", String(firstIndent));
		listNode.attributes.set("type", info.listType as string);

		context.builder.pushNode(listNode);

		// Process all list items
		let iterations = 0;
		const maxIterations = 100;
		let hasLooseItem = false;

		while (!cursor.isAtEnd() && iterations < maxIterations) {
			iterations++;

			const itemInfo = this.recognises(cursor, context);
			if (!itemInfo) {
				break;
			}

			// Check if this is a new list at same/different level
			const _itemSave = cursor.clone();
			const itemIndent = this.countIndent(cursor);

			// If indent decreased significantly, end the list
			if (itemIndent < firstIndent - 2) {
				break;
			}

			const itemNode = this.processItem(
				cursor,
				context,
				itemInfo,
				firstIndent,
				engine,
			);
			if (itemNode.attributes.get("_hasBlock") === "true") {
				hasLooseItem = true;
			}

			// Move to next item
			cursor.skipNewlines();
		}

		const end = cursor.pos;

		if (hasLooseItem) {
			this.makeListLoose(listNode);
		}
		for (const child of listNode.children) {
			if (child.type === "element" && child.name === "item") {
				child.attributes.delete("_hasBlock");
			}
		}

		// Update list node position to include all items
		listNode.position = { start, end, line: startLine, column: startColumn };

		context.builder.popNode();

		return {
			consumed: end - start,
			node: listNode,
		};
	}

	private processItem(
		cursor: Cursor,
		context: ParsingContext,
		info: RecognitionInfo,
		listIndent: number,
		engine?: BlockParsingEngine,
	): Node {
		const itemStart = cursor.pos;
		const itemStartLine = cursor.lineNumber;
		const itemStartColumn = cursor.columnNumber;

		// Skip leading whitespace
		this.skipLeadingWhitespace(cursor);
		const indent = cursor.pos - itemStart;

		// Calculate content start position (after marker)
		const contentStart = this.getContentStart(cursor, info);
		const contentStartLine = cursor.lineNumber;
		const contentStartColumn = cursor.columnNumber;

		// Find where this item ends (next item at same level, end of list, etc.)
		const itemEnd = this.findItemEnd(cursor, context, listIndent);

		// Create item node with position
		const itemNode = context.builder.createAndAppend(
			"item",
			{},
			{
				start: itemStart,
				end: itemEnd,
				line: itemStartLine,
				column: itemStartColumn,
			},
		);
		itemNode.attributes.set("_indent", String(indent));

		if (info.listType === "todo") {
			itemNode.attributes.set("todo", info.checked ? "done" : "true");
		}

		context.builder.pushNode(itemNode);

		// Check if this item has block-level content (blank lines or nested blocks)
		const hasBlockContent = this.hasBlockContent(
			context.getText(),
			contentStart,
			itemEnd,
		);
		itemNode.attributes.set("_hasBlock", hasBlockContent ? "true" : "false");

		// If engine is available and content has blocks, use recursive parsing
		if (contentStart < itemEnd && hasBlockContent) {
			const parsedChildren = this.parseItemBlocks(
				context,
				contentStart,
				itemEnd,
			);
			if (parsedChildren) {
				itemNode.children.push(...parsedChildren);
			} else if (engine) {
				// Fallback when parser reference is not available
				engine.parseBlocksInRange(context, itemNode, contentStart, itemEnd);
			}
		} else {
			// Tight list item - read content as plain text and parse inline
			const content = this.readItemContent(
				cursor,
				contentStart,
				itemEnd,
				context,
				this.getContinuationStripWidth(info),
			);
			if (content) {
				if (context.parser) {
					context.parser.parseInlines(content, itemNode, context, contentStart);
				} else {
					const textNode = createText(content, {
						start: contentStart,
						end: itemEnd,
						line: contentStartLine,
						column: contentStartColumn,
					});
					itemNode.children.push(textNode);
				}
			}
		}

		context.builder.popNode();

		// Move cursor to end of this item
		cursor.pos = itemEnd;

		return itemNode;
	}

	private makeListLoose(listNode: Node): void {
		for (const child of listNode.children) {
			if (child.type !== "element" || child.name !== "item") {
				continue;
			}

			const hasElementChildren = child.children.some(
				(n) => n.type === "element",
			);
			if (hasElementChildren) {
				child.attributes.delete("_hasBlock");
				continue;
			}

			const paragraph = createElement("paragraph");
			paragraph.children = child.children;
			child.children = [paragraph];
			child.attributes.delete("_hasBlock");
		}
	}

	private parseItemBlocks(
		context: ParsingContext,
		contentStart: number,
		itemEnd: number,
	): Node[] | null {
		if (!context.parser) {
			return null;
		}

		const raw = context.getText().slice(contentStart, itemEnd);
		const normalized = this.normalizeItemContentForBlocks(raw);
		if (!normalized.trim()) {
			return [];
		}

		const parsed = context.parser.parse(normalized);
		return parsed.content.children;
	}

	private normalizeItemContentForBlocks(raw: string): string {
		const normalizedNewlines = raw.replace(/\r\n/g, "\n");
		const lines = normalizedNewlines.split("\n");
		if (lines.length === 0) {
			return "";
		}

		const [first, ...rest] = lines;
		const normalizedRest = rest.map((line) =>
			this.stripListContinuationIndent(line),
		);
		return [first, ...normalizedRest].join("\n");
	}

	private stripListContinuationIndent(line: string): string {
		let index = 0;
		let removedColumns = 0;

		while (index < line.length && removedColumns < 4) {
			const char = line[index];
			if (char === " ") {
				removedColumns++;
				index++;
				continue;
			}
			if (char === "\t") {
				removedColumns = 4;
				index++;
				continue;
			}
			break;
		}

		return line.slice(index);
	}

	private getContentStart(cursor: Cursor, info: RecognitionInfo): number {
		const save = cursor.clone();
		const markerWidth = this.getMarkerWidth(info);

		// Skip marker
		if (markerWidth > 0) {
			cursor.advance(markerWidth);
		}

		const contentStart = cursor.pos;
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		return contentStart;
	}

	private findItemEnd(
		cursor: Cursor,
		context: ParsingContext,
		listIndent: number,
	): number {
		const startPos = cursor.pos;

		// First, skip past the marker on current line
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Skip the marker
		if (
			cursor.current() === "-" ||
			cursor.current() === "*" ||
			cursor.current() === "+"
		) {
			cursor.advance(2);
		} else if (cursor.current() === "[") {
			cursor.advance(4);
		} else {
			// Ordered - skip number/letter and marker
			while (/[0-9a-zA-Z]/.test(cursor.current() || "")) {
				cursor.advance();
			}
			cursor.advance(2);
		}

		// Now scan ahead to find where this item ends
		// An item ends when we find:
		// 1. Another list item at the same indentation level
		// 2. Content that is not indented (less than listIndent + 2)
		// 3. End of input

		let itemEnd = cursor.pos;
		let iterations = 0;
		const maxIterations = 200;

		while (!cursor.isAtEnd() && iterations < maxIterations) {
			iterations++;

			// Skip to end of current line
			while (cursor.current() !== null && cursor.current() !== "\n") {
				cursor.advance();
			}

			// Remember position at end of this line
			const lineEnd = cursor.pos;

			if (cursor.isAtEnd()) {
				itemEnd = lineEnd;
				break;
			}

			// Move to next line
			cursor.advance(); // skip newline
			const lineEndWithNewline = cursor.pos;

			// Check indentation of next line
			const lineStartSave = cursor.clone();
			const lineIndent = this.countIndent(cursor);

			// If line is not indented and not blank, it's end of item
			if (lineIndent < listIndent && !this.isLineBlank(cursor)) {
				cursor.pos = lineStartSave.pos;
				cursor.lineNumber = lineStartSave.lineNumber;
				cursor.columnNumber = lineStartSave.columnNumber;
				itemEnd = lineEndWithNewline;
				break;
			}

			// Check if this is a new list item at same level
			if (lineIndent <= listIndent + 2) {
				const recognitionSave = cursor.clone();
				if (this.recognises(cursor, context)) {
					// It's a new item - current item ends at previous line
					cursor.pos = recognitionSave.pos;
					cursor.lineNumber = recognitionSave.lineNumber;
					cursor.columnNumber = recognitionSave.columnNumber;
					itemEnd = lineEndWithNewline;
					break;
				}
				cursor.pos = recognitionSave.pos;
				cursor.lineNumber = recognitionSave.lineNumber;
				cursor.columnNumber = recognitionSave.columnNumber;
			}

			// If line at same/less indent is NOT a list item and NOT blank,
			// check if it's a special block type that can be nested in lists (tagged block)
			// If not, it ends the current list
			if (lineIndent <= listIndent && !this.isLineBlank(cursor)) {
				const recognitionSave = cursor.clone();
				const isListItem = this.recognises(cursor, context);

				if (!isListItem) {
					// Not a list item - check if it's a tagged block
					// Tagged blocks can be nested in list items even at same indent
					// Pattern: Capitalized word followed by 3+ underscores
					cursor.pos = recognitionSave.pos;
					let isTaggedBlock = false;

					// Check for tagged block pattern: [A-Z][a-zA-Z0-9]*_{3,}
					if (/[A-Z]/.test(cursor.current() || "")) {
						// Read tag name
						while (/[a-zA-Z0-9]/.test(cursor.current() || "")) {
							cursor.advance();
						}
						// Check for underscores
						let underscoreCount = 0;
						while (cursor.current() === "_") {
							underscoreCount++;
							cursor.advance();
						}
						// Must end with newline or end
						if (
							underscoreCount >= 3 &&
							(cursor.current() === "\n" ||
								cursor.current() === "\r" ||
								cursor.current() === null)
						) {
							isTaggedBlock = true;
						}
					}

					cursor.pos = recognitionSave.pos;
					cursor.lineNumber = recognitionSave.lineNumber;
					cursor.columnNumber = recognitionSave.columnNumber;

					if (!isTaggedBlock) {
						// Not a list item and not a tagged block - end the list
						itemEnd = lineEndWithNewline;
						break;
					}
					// It's a tagged block - continue with this item
				}

				cursor.pos = recognitionSave.pos;
				cursor.lineNumber = recognitionSave.lineNumber;
				cursor.columnNumber = recognitionSave.columnNumber;
			}

			// Continue with this item
			itemEnd = cursor.pos;
		}

		// Restore cursor to original position
		cursor.pos = startPos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		return itemEnd;
	}

	private readItemContent(
		cursor: Cursor,
		contentStart: number,
		itemEnd: number,
		context: ParsingContext,
		markerWidth: number,
	): string {
		const text = context.getText();
		// Position cursor at content start
		cursor.pos = contentStart;
		const content = text.slice(contentStart, itemEnd);
		if (!this.stripContinuationIndent) {
			return content.trim();
		}

		const normalized = content.replace(/\r\n/g, "\n");
		const lines = normalized.split("\n");
		if (lines.length <= 1) {
			return normalized.trim();
		}

		const [first, ...rest] = lines;
		const cleaned = rest.map((line) =>
			this.stripIndentColumns(line, markerWidth),
		);
		return [first, ...cleaned].join("\n").trim();
	}

	private stripIndentColumns(line: string, maxColumns: number): string {
		if (maxColumns <= 0) {
			return line;
		}
		return line.trimStart();
	}

	private getMarkerWidth(info: RecognitionInfo): number {
		const markerWidth = info.markerWidth;
		if (typeof markerWidth === "number" && markerWidth > 0) {
			return markerWidth;
		}

		if (info.listType === "todo") {
			return 4;
		}
		if (info.listType === "ordered") {
			return 3;
		}
		return 2;
	}

	private getContinuationStripWidth(info: RecognitionInfo): number {
		if (!this.stripContinuationIndent) {
			return 0;
		}
		return this.getMarkerWidth(info);
	}

	private countIndent(cursor: Cursor): number {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);
		const indent = cursor.pos - save.pos;
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;
		return indent;
	}

	private isLineBlank(cursor: Cursor): boolean {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);
		const result = cursor.current() === "\n" || cursor.current() === null;
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;
		return result;
	}

	/**
	 * Check if list item content has block-level elements (blank lines)
	 * Returns true if content contains blank lines (indicating loose list)
	 */
	private hasBlockContent(
		text: string,
		startOffset: number,
		endOffset: number,
	): boolean {
		const scanEnd = this.includeBoundaryBlankLine
			? Math.min(text.length, endOffset + 1)
			: endOffset;
		const content = text.slice(startOffset, scanEnd);

		// Loose list marker: at least one blank line in item content or at boundary.
		return /\r?\n[ \t]*\r?\n/.test(content);
	}
}

export type { ListParserOptions };
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { ListParser };

// EOF
