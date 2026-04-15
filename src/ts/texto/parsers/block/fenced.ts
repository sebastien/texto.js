// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/block/fenced
// Implements the parsers/block/fenced module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Fenced block parser
// Handles fenced code blocks delimited by triple backticks (```)
// Examples:
//   ```
//   Code content here
//   ```
//
//   ```javascript
//   const x = 1;
//   ```
//
//   ```python > output.py
//   print("hello")
//   ```

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

class FencedBlockParser extends BaseBlockParser {
	constructor() {
		super("fenced", BLOCK_PRIORITIES.PRE);
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Check for opening fence: ``` or ```lang or ```lang > output
		if (
			cursor.current() !== "`" ||
			cursor.peek(1) !== "`" ||
			cursor.peek(2) !== "`"
		) {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}

		// Skip the opening ```
		cursor.advance(3);

		// Parse optional language identifier
		let lang = "";
		while (
			cursor.current() !== null &&
			cursor.current() !== " " &&
			cursor.current() !== "\t" &&
			cursor.current() !== "\n" &&
			cursor.current() !== "`"
		) {
			lang += cursor.current();
			cursor.advance();
		}

		// Parse optional file output annotation (e.g., " > filename")
		let output = "";
		if (cursor.current() === " " || cursor.current() === "\t") {
			this.skipLeadingWhitespace(cursor);
			if (cursor.current() === ">") {
				cursor.advance(); // skip >
				this.skipLeadingWhitespace(cursor);
				// Read filename
				while (
					cursor.current() !== null &&
					cursor.current() !== "\n" &&
					cursor.current() !== "`"
				) {
					output += cursor.current();
					cursor.advance();
				}
				output = output.trim();
			}
		}

		// Must end with newline or be at end of input
		const current = cursor.current();
		if (current !== null && current !== "\n") {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}

		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		// Store leading whitespace count for matching closing fence
		const indent = this.countLeadingSpaces(save);

		return {
			type: "fenced",
			lang: lang.trim(),
			output: output,
			indent: indent,
		};
	}

	process(
		cursor: Cursor,
		context: ParsingContext,
		info: RecognitionInfo,
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;
		const indent = info.indent as number;
		const lang = info.lang as string;
		const output = info.output as string;

		// Skip the opening line
		this.skipLeadingWhitespace(cursor);
		cursor.advance(3); // Skip ```

		// Skip language and output annotation if present
		while (cursor.current() !== null && cursor.current() !== "\n") {
			cursor.advance();
		}

		// Skip newline after opening fence
		if (cursor.current() === "\n") {
			cursor.advance();
		}

		// Look for the closing fence
		const contentStart = cursor.pos;
		const contentStartLine = cursor.lineNumber;
		const contentStartColumn = cursor.columnNumber;
		let contentEnd = contentStart;
		let foundClosing = false;
		let iterations = 0;
		const maxIterations = 10000; // Safety limit

		while (!cursor.isAtEnd() && iterations < maxIterations) {
			iterations++;

			const lineStart = cursor.pos;
			const lineIndent = this.countLeadingSpaces(cursor);

			// Advance cursor past the leading whitespace we just counted
			// This positions us at the first non-whitespace character of the line
			this.skipLeadingWhitespace(cursor);

			// Check if this is the closing fence line
			if (
				lineIndent === indent &&
				cursor.current() === "`" &&
				cursor.peek(1) === "`" &&
				cursor.peek(2) === "`"
			) {
				// Found closing fence - verify it's only backticks on the line (with optional whitespace)
				const saved = cursor.clone();
				cursor.advance(3); // Skip ```

				// Skip trailing whitespace
				while (cursor.current() === " " || cursor.current() === "\t") {
					cursor.advance();
				}

				// Must be end of line or end of input
				if (cursor.current() === null || cursor.current() === "\n") {
					contentEnd = lineStart;
					foundClosing = true;

					// Skip to end of closing fence line
					if (cursor.current() === "\n") {
						cursor.advance();
					}
					break;
				} else {
					// Not a valid closing fence - restore and continue
					cursor.pos = saved.pos;
					cursor.lineNumber = saved.lineNumber;
					cursor.columnNumber = saved.columnNumber;
				}
			}

			// Skip to end of this line
			while (cursor.current() !== null && cursor.current() !== "\n") {
				cursor.advance();
			}

			// Include the newline in content
			if (cursor.current() === "\n") {
				cursor.advance();
			}

			contentEnd = cursor.pos;
		}

		// STRICT MODE: If no closing fence found, treat as regular paragraph
		if (!foundClosing) {
			// Restore cursor to start position - let the paragraph parser handle this
			cursor.pos = start;

			// Return empty result to indicate we didn't process it (fallback to paragraph)
			return {
				consumed: 0,
				node: undefined,
			};
		}

		// Extract content
		let content = context.getText().slice(contentStart, contentEnd);

		// Remove common leading indentation from content lines
		content = this.removeCommonIndent(content);

		// Trim trailing newline (as specified)
		content = content.replace(/\n$/, "");

		const end = cursor.pos;

		// Create pre node with position
		const node = context.builder.createAndAppend(
			"pre",
			{},
			{
				start,
				end,
				line: startLine,
				column: startColumn,
			},
		);

		// Store the original format for round-trip formatting
		node.attributes.set("_format", "fenced");

		if (lang) {
			node.attributes.set("data-lang", lang);
		}

		if (output) {
			node.attributes.set("data-output", output);
		}

		// Add content as text node with position
		if (content) {
			const actualContentEnd = contentStart + content.length;
			const textNode = createText(content, {
				start: contentStart,
				end: actualContentEnd,
				line: contentStartLine,
				column: contentStartColumn,
			});
			node.children.push(textNode);
		}

		return {
			consumed: end - start,
			node,
		};
	}

	private countLeadingSpaces(cursor: Cursor): number {
		const save = cursor.clone();
		let count = 0;

		while (cursor.current() === " " || cursor.current() === "\t") {
			if (cursor.current() === " ") {
				count++;
			} else if (cursor.current() === "\t") {
				count += 4; // Tab = 4 spaces
			}
			cursor.advance();
		}

		// Restore cursor position but return count
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		return count;
	}

	private removeCommonIndent(content: string): string {
		const lines = content.split("\n");

		if (lines.length === 0) {
			return content;
		}

		// Find minimum indentation (excluding empty lines)
		let minIndent: number | null = null;

		for (const line of lines) {
			if (line.trim() === "") continue;

			const indent = this.getIndentOfLine(line);
			if (minIndent === null || indent < minIndent) {
				minIndent = indent;
			}
		}

		if (minIndent === null || minIndent === 0) {
			return content;
		}

		// Remove common indentation from each line
		return lines
			.map((line) => {
				if (line.trim() === "") return "";
				return line.slice(minIndent as number);
			})
			.join("\n");
	}

	private getIndentOfLine(line: string): number {
		let indent = 0;
		for (const char of line) {
			if (char === " ") {
				indent++;
			} else if (char === "\t") {
				indent += 4;
			} else {
				break;
			}
		}
		return indent;
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { FencedBlockParser };

// EOF
