// List block parser with recursive content parsing
// Enhanced to parse nested blocks within list items

import { createText } from "../../document/node.ts";
import type { BlockParsingEngine } from "../../parsing/block.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, Node, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

export class ListParser extends BaseBlockParser {
	constructor() {
		super("list", BLOCK_PRIORITIES.LIST);
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Check for list markers
		const current = cursor.current();
		const next = cursor.peek(1);
		const next2 = cursor.peek(2);

		// Unordered: - or *
		if (current === "-" || current === "*") {
			if (next === " " || next === "\t") {
				cursor.pos = save.pos;
				cursor.lineNumber = save.lineNumber;
				cursor.columnNumber = save.columnNumber;
				return { type: "list", listType: "unordered" };
			}
		}

		// Todo: [ ], [x], [X]
		if (
			current === "[" &&
			next2 === "]" &&
			(next === " " ||
				next === "-" ||
				next === "x" ||
				next === "X" ||
				next === "~")
		) {
			if (cursor.peek(3) === " " || cursor.peek(3) === "\t") {
				cursor.pos = save.pos;
				cursor.lineNumber = save.lineNumber;
				cursor.columnNumber = save.columnNumber;
				const checked = next === "x" || next === "X";
				return { type: "list", listType: "todo", checked };
			}
		}

		// Ordered: 1), 1., a)
		if (/[0-9a-zA-Z]/.test(current || "")) {
			let numEnd = 1;
			while (/[0-9a-zA-Z]/.test(cursor.peek(numEnd) || "")) {
				numEnd++;
			}
			const marker = cursor.peek(numEnd);
			if (
				(marker === ")" || marker === ".") &&
				(cursor.peek(numEnd + 1) === " " || cursor.peek(numEnd + 1) === "\t")
			) {
				cursor.pos = save.pos;
				cursor.lineNumber = save.lineNumber;
				cursor.columnNumber = save.columnNumber;
				return { type: "list", listType: "ordered" };
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

			this.processItem(cursor, context, itemInfo, firstIndent, engine);

			// Move to next item
			cursor.skipNewlines();
		}

		const end = cursor.pos;

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

		// If engine is available, use recursive parsing for content
		if (engine && contentStart < itemEnd) {
			// Calculate actual content boundaries
			// Content is from after marker to end of item
			engine.parseBlocksInRange(context, itemNode, contentStart, itemEnd);
		} else {
			// Fallback: Read content as plain text
			const content = this.readItemContent(cursor, itemEnd, context);
			if (content) {
				const textNode = createText(content, {
					start: contentStart,
					end: itemEnd,
					line: contentStartLine,
					column: contentStartColumn,
				});
				itemNode.children.push(textNode);
			}
		}

		context.builder.popNode();

		// Move cursor to end of this item
		cursor.pos = itemEnd;

		return itemNode;
	}

	private getContentStart(cursor: Cursor, info: RecognitionInfo): number {
		const save = cursor.clone();

		// Skip marker
		if (info.listType === "unordered") {
			cursor.advance(2); // "- " or "* "
		} else if (info.listType === "todo") {
			cursor.advance(4); // "[ ] " or "[x] "
		} else if (info.listType === "ordered") {
			while (/[0-9a-zA-Z]/.test(cursor.current() || "")) {
				cursor.advance();
			}
			cursor.advance(2); // marker + space
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
		if (cursor.current() === "-" || cursor.current() === "*") {
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

			// Check indentation of next line
			const lineStartSave = cursor.clone();
			const lineIndent = this.countIndent(cursor);

			// If line is not indented and not blank, it's end of item
			if (lineIndent < listIndent && !this.isLineBlank(cursor)) {
				cursor.pos = lineStartSave.pos;
				cursor.lineNumber = lineStartSave.lineNumber;
				cursor.columnNumber = lineStartSave.columnNumber;
				itemEnd = lineEnd;
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
					itemEnd = lineEnd;
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
						itemEnd = lineEnd;
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
		endPos: number,
		context: ParsingContext,
	): string {
		const text = context.getText();
		const content = text.slice(cursor.pos, endPos);
		return content.trim();
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
}
