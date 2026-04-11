// Indented preformatted block parser
// Handles old-style preformatted blocks with >   prefix
// Example:
//   >   Line 1
//   >   Line 2
//   >   Line 3

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

export class IndentedPreBlockParser extends BaseBlockParser {
	constructor() {
		super("indented-pre", BLOCK_PRIORITIES.PRE);
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Check for old-style pre marker: > followed by tab or 3 spaces
		if (cursor.current() !== ">") {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}

		cursor.advance(); // skip >

		// Must be followed by tab or at least 3 spaces
		let spaceCount = 0;
		let hasTab = false;

		while (cursor.current() === " " || cursor.current() === "\t") {
			if (cursor.current() === "\t") {
				hasTab = true;
				cursor.advance();
				break;
			} else {
				spaceCount++;
				cursor.advance();
			}
		}

		// Valid if: has tab, or has 3+ spaces
		if (!hasTab && spaceCount < 3) {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}

		// Check that there's content or end of line
		const current = cursor.current();
		if (current !== null && current !== "\n" && current !== "\r") {
			// There should be content after the indentation
			// (already validated by hasTab or spaceCount >= 3)
		}

		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		return { type: "indented-pre", indent: this.countLeadingSpaces(save) };
	}

	process(
		cursor: Cursor,
		context: ParsingContext,
		_info: RecognitionInfo,
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;
		const _startIndent = this.countLeadingSpaces(cursor);

		// Collect all lines that match the preformatted pattern
		// Also track the content start position for the first content
		const lines: string[] = [];
		const contentPositions: {
			start: number;
			end: number;
			lineStart: number;
			colStart: number;
		}[] = [];
		let iterations = 0;
		const maxIterations = 1000;

		while (!cursor.isAtEnd() && iterations < maxIterations) {
			iterations++;

			const lineStart = cursor.pos;
			const _lineStartLine = cursor.lineNumber;
			const _lineStartCol = cursor.columnNumber;
			const _lineIndent = this.countLeadingSpaces(cursor);

			// Check if this line starts with > followed by proper indentation
			this.skipLeadingWhitespace(cursor);

			if (cursor.current() !== ">") {
				// Not a pre line - restore and break
				cursor.pos = lineStart;
				break;
			}

			cursor.advance(); // skip >

			// Check for tab or 3+ spaces
			let spaceCount = 0;
			let hasTab = false;

			while (cursor.current() === " " || cursor.current() === "\t") {
				if (cursor.current() === "\t") {
					hasTab = true;
					cursor.advance();
					break;
				} else {
					spaceCount++;
					cursor.advance();
				}
			}

			if (!hasTab && spaceCount < 3) {
				// Not a valid pre line - restore and break
				cursor.pos = lineStart;
				break;
			}

			// Extract content after the marker
			const contentStart = cursor.pos;
			const contentStartLine = cursor.lineNumber;
			const contentStartCol = cursor.columnNumber;
			let content = "";

			while (
				cursor.current() !== null &&
				cursor.current() !== "\n" &&
				cursor.current() !== "\r"
			) {
				content += cursor.current();
				cursor.advance();
			}

			lines.push(content);
			contentPositions.push({
				start: contentStart,
				end: cursor.pos,
				lineStart: contentStartLine,
				colStart: contentStartCol,
			});

			// Skip newline
			if (cursor.current() === "\r") {
				cursor.advance();
			}
			if (cursor.current() === "\n") {
				cursor.advance();
			}

			// Check if next line is also a pre line
			const saved = cursor.clone();
			this.skipLeadingWhitespace(cursor);

			if (cursor.current() !== ">") {
				// Next line doesn't start pre block - restore and we're done
				cursor.pos = saved.pos;
				cursor.lineNumber = saved.lineNumber;
				cursor.columnNumber = saved.columnNumber;
				break;
			}

			// Restore to continue processing
			cursor.pos = saved.pos;
			cursor.lineNumber = saved.lineNumber;
			cursor.columnNumber = saved.columnNumber;
		}

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
		node.attributes.set("_format", "indented");

		// Join lines with newlines
		const content = lines.join("\n");

		if (content && contentPositions.length > 0) {
			// Calculate total content range
			const firstContent = contentPositions[0];
			const lastContent = contentPositions[contentPositions.length - 1];
			const totalContentStart = firstContent.start;
			const totalContentEnd = lastContent.end;

			const textNode = createText(content, {
				start: totalContentStart,
				end: totalContentEnd,
				line: firstContent.lineStart,
				column: firstContent.colStart,
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
				count += 4;
			}
			cursor.advance();
		}

		// Restore cursor position
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		return count;
	}
}
