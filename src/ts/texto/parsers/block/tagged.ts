// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/block/tagged
// Implements the parsers/block/tagged module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Tagged block parser
// Handles syntax: TagName followed by underscores, then content, then closing underscores
// Example:
//   Note__________________________________________________________________
//   Content here...
//   _______________________________________________________________________

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

class TaggedBlockParser extends BaseBlockParser {
	constructor() {
		super("tagged", BLOCK_PRIORITIES.TAGGED);
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Pattern: TagName followed by underscores (at least 3)
		// Read tag name (alphanumeric only, must start with uppercase letter)
		let tagName = "";
		if (/[A-Z]/.test(cursor.current() || "")) {
			while (/[a-zA-Z0-9]/.test(cursor.current() || "")) {
				tagName += cursor.current();
				cursor.advance();
			}
		}

		if (tagName.length === 0) {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}

		// Check for underscore sequence (at least 3)
		let underscoreCount = 0;
		while (cursor.current() === "_") {
			underscoreCount++;
			cursor.advance();
		}

		// Must have at least 3 underscores and end with newline or end of input
		if (
			underscoreCount >= 3 &&
			(cursor.current() === "\n" || cursor.current() === null)
		) {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return { type: "tagged", tag: tagName };
		}

		// No match
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;
		return null;
	}

	process(
		cursor: Cursor,
		context: ParsingContext,
		info: RecognitionInfo,
	): BlockResult {
		return this.processWithEndDetection(cursor, context, info, null);
	}

	private processWithEndDetection(
		cursor: Cursor,
		context: ParsingContext,
		_info: RecognitionInfo,
		explicitEnd: number | null,
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;
		const startIndent = this.countIndent(cursor);

		// Extract tag name
		this.skipLeadingWhitespace(cursor);
		let tagName = "";
		while (/[a-zA-Z0-9]/.test(cursor.current() || "")) {
			tagName += cursor.current();
			cursor.advance();
		}

		// Skip underscores
		while (cursor.current() === "_") {
			cursor.advance();
		}

		// Skip newline
		if (cursor.current() === "\n") {
			cursor.advance();
		}

		// Create tagged block node (position will be updated at the end)
		const node = context.builder.createAndAppend(
			"tagged",
			{},
			{
				start,
				end: start,
				line: startLine,
				column: startColumn,
			},
		);
		node.attributes.set("tag", tagName);
		node.attributes.set("_indent", String(startIndent));
		node.attributes.set("_format", "tagged");

		context.builder.pushNode(node);

		// Read content until closing line of underscores
		// The closing line must have the same indentation as the opening line
		let content = "";
		const contentStart = cursor.pos;
		const contentStartLine = cursor.lineNumber;
		const contentStartColumn = cursor.columnNumber;
		let iterations = 0;
		const maxIterations = 1000;

		while (!cursor.isAtEnd() && iterations < maxIterations) {
			iterations++;

			// Check if we've reached the explicit end boundary
			if (explicitEnd !== null && cursor.pos >= explicitEnd) {
				break;
			}

			// Save position at start of line
			const lineStart = cursor.pos;
			const lineStartSave = cursor.clone();

			// Count indentation on this line
			const lineIndent = this.countIndent(cursor);

			// Skip to actual content
			this.skipLeadingWhitespace(cursor);

			// Read the line content (without the leading whitespace we just skipped)
			let line = "";
			while (
				cursor.current() !== null &&
				cursor.current() !== "\n" &&
				cursor.current() !== "\r"
			) {
				line += cursor.current();
				cursor.advance();
			}

			// Check if this is the closing underscore line
			// Pattern: same indentation as opening, then 3+ underscores, optional whitespace
			if (lineIndent === startIndent && /^_{3,}\s*$/.test(line)) {
				// End of tagged block - don't consume this line as content
				break;
			}

			// Not a closing line - add the full line with original indentation
			cursor.pos = lineStart;
			cursor.lineNumber = lineStartSave.lineNumber;
			cursor.columnNumber = lineStartSave.columnNumber;

			const fullLine = cursor.readLine();
			content += fullLine;

			if (cursor.isAtEnd()) break;

			// Add newline for next iteration
			content += "\n";
		}

		const end = cursor.pos;

		// Update tagged block node position
		node.position = { start, end, line: startLine, column: startColumn };

		// Add content as text
		content = context.normaliseText(content).trim();
		if (content) {
			// Find actual content position in the text
			const actualContentStart = contentStart < end ? contentStart : start;
			const actualContentEnd = Math.min(
				actualContentStart + content.length,
				end,
			);
			const textNode = createText(content, {
				start: actualContentStart,
				end: actualContentEnd,
				line: contentStartLine,
				column: contentStartColumn,
			});
			node.children.push(textNode);
		}

		context.builder.popNode();

		return {
			consumed: end - start,
			node,
		};
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
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { TaggedBlockParser };

// EOF
