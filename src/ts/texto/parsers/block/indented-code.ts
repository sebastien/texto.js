// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/block/indented-code
// Implements the parsers/block/indented-code module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Indented code block parser
// Handles code blocks indented by 4 spaces or a tab
// Collects consecutive indented lines

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

class IndentedCodeParser extends BaseBlockParser {
	constructor() {
		super("indented-code", BLOCK_PRIORITIES.PRE + 2); // 20, after fenced code
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Check for 4-space or tab indentation
		const indent = cursor.pos - save.pos;

		// 4 spaces or 1 tab = code block
		if (indent >= 4 || (indent >= 1 && this.hasTabAtStart(save))) {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return { type: "indented-code", indent };
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
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;
		const baseIndent = (info.indent as number) || 4;

		// Collect all indented lines
		const lines: string[] = [];
		let iterations = 0;
		const maxIterations = 1000;

		while (!cursor.isAtEnd() && iterations < maxIterations) {
			iterations++;

			const lineStart = cursor.clone();
			this.skipLeadingWhitespace(cursor);

			const currentIndent = cursor.pos - lineStart.pos;
			const firstChar = lineStart.peek(0);

			// Check if line is indented enough to be part of code block
			// Either 4+ spaces or starts with a tab
			if (currentIndent >= 4 || firstChar === "\t") {
				// Read the line content (without line ending)
				cursor.readLine();
				// Get the full line including indentation from the text buffer
				// lineStart.pos is the beginning of the line, cursor.pos is after the line ending
				const fullLineEnd = cursor.pos;
				const fullLine = context.getText().slice(lineStart.pos, fullLineEnd);
				// Remove the line ending from fullLine
				const lineWithoutEnding = fullLine.replace(/\r?\n$/, "");
				// Remove the leading indentation based on the detected base indent
				// For tab-indented lines, strip just 1 tab. For space-indented, strip baseIndent.
				const stripCount = firstChar === "\t" ? 1 : baseIndent;
				const strippedContent = this.removeIndent(
					lineWithoutEnding,
					stripCount,
				);
				lines.push(strippedContent);
				// readLine() now consumes line endings, no need to advance
			} else if (currentIndent === 0 && cursor.current() === null) {
				// End of input
				break;
			} else {
				// Check if this is a blank line (only whitespace, or less indent with blank content)
				const restOfLine = this.peekRestOfLine(cursor);
				if (restOfLine.trim() === "") {
					// Blank line - can be part of code block as empty line
					lines.push("");
					cursor.readLine();
					// readLine() now consumes line endings, no need to advance
				} else {
					// Not part of code block - restore and break
					cursor.pos = lineStart.pos;
					cursor.lineNumber = lineStart.lineNumber;
					cursor.columnNumber = lineStart.columnNumber;
					break;
				}
			}
		}

		const end = cursor.pos;

		// Trim trailing blank lines
		while (lines.length > 0 && lines[lines.length - 1] === "") {
			lines.pop();
		}

		// Create pre node
		const node = context.builder.createAndAppend(
			"preformatted",
			{},
			{
				start,
				end,
				line: startLine,
				column: startColumn,
			},
		);
		node.attributes.set("_format", "indented");

		// Add content as text node
		if (lines.length > 0) {
			const content = lines.join("\n");
			const contentStart = start + baseIndent;
			const textNode = createText(content, {
				start: contentStart,
				end: contentStart + content.length,
				line: startLine,
				column: startColumn + baseIndent,
			});
			node.children.push(textNode);
		}

		return {
			consumed: end - start,
			node,
		};
	}

	private hasTabAtStart(cursor: Cursor): boolean {
		return cursor.current() === "\t";
	}

	private peekRestOfLine(cursor: Cursor): string {
		const save = cursor.clone();
		let result = "";
		while (cursor.current() !== null && cursor.current() !== "\n") {
			result += cursor.current();
			cursor.advance();
		}
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;
		return result;
	}

	private removeIndent(lineContent: string, targetIndent: number): string {
		// lineContent is the text returned by readLine() (without line ending)
		// Remove leading whitespace up to target indent
		let removed = 0;
		let result = "";
		for (const char of lineContent) {
			if (removed < targetIndent && (char === " " || char === "\t")) {
				removed++;
				if (char === "\t") {
					removed += 3; // Tab counts as 4 spaces
				}
			} else {
				result += char;
			}
		}

		return result;
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { IndentedCodeParser };

// EOF
