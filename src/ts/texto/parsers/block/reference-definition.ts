// Reference definition block parser
// Handles [ref]: url "title" pattern for reference-style links
// Stores definitions in context for link resolution

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

export class ReferenceDefinitionParser extends BaseBlockParser {
	constructor() {
		super("reference-definition", BLOCK_PRIORITIES.REFERENCE); // 38
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Check for [ref] pattern at start of line
		if (cursor.current() !== "[") {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}

		// Read reference label
		cursor.advance(); // skip [
		let label = "";
		while (
			cursor.current() !== null &&
			cursor.current() !== "]" &&
			cursor.current() !== "\n"
		) {
			label += cursor.current();
			cursor.advance();
		}

		// Must have closing bracket
		if (cursor.current() !== "]") {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}
		cursor.advance(); // skip ]

		// Must have colon after ]
		if (cursor.current() !== ":") {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}
		cursor.advance(); // skip :

		// Skip whitespace after colon
		this.skipLeadingWhitespace(cursor);

		// Must have URL next
		if (cursor.current() === null || cursor.current() === "\n") {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}

		// Save position for URL parsing
		const urlStart = cursor.pos;
		let url = "";

		// Parse URL (can be in angle brackets or plain)
		if (cursor.current() === "<") {
			// URL in angle brackets
			cursor.advance(); // skip <
			while (
				cursor.current() !== null &&
				cursor.current() !== ">" &&
				cursor.current() !== "\n"
			) {
				url += cursor.current();
				cursor.advance();
			}
			if (cursor.current() === ">") {
				cursor.advance(); // skip >
			}
		} else {
			// Plain URL
			while (
				cursor.current() !== null &&
				cursor.current() !== " " &&
				cursor.current() !== "\t" &&
				cursor.current() !== "\n"
			) {
				url += cursor.current();
				cursor.advance();
			}
		}

		// Validate we got a URL
		if (!url) {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}

		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		return {
			type: "reference-definition",
			label: label.trim().toLowerCase(),
			url,
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

		// Skip the entire line
		this.skipLeadingWhitespace(cursor);

		// Skip [label]:
		cursor.advance(); // [
		const label = (info.label as string) || "";
		cursor.advance(label.length + 2); // label + ]
		cursor.advance(); // :

		// Skip whitespace
		this.skipLeadingWhitespace(cursor);

		// Skip URL
		let url = (info.url as string) || "";
		if (cursor.current() === "<") {
			cursor.advance(); // <
			cursor.advance(url.length);
			if (cursor.current() === ">") {
				cursor.advance(); // >
			}
		} else {
			cursor.advance(url.length);
		}

		// Check for optional title
		let title = "";
		this.skipLeadingWhitespace(cursor);

		if (
			cursor.current() === '"' ||
			cursor.current() === "'" ||
			cursor.current() === "("
		) {
			const quoteChar = cursor.current() === "(" ? ")" : cursor.current();
			cursor.advance(); // opening quote

			while (
				cursor.current() !== null &&
				cursor.current() !== quoteChar &&
				cursor.current() !== "\n"
			) {
				title += cursor.current();
				cursor.advance();
			}

			if (cursor.current() === quoteChar) {
				cursor.advance(); // closing quote
			}
		}

		// Skip to end of line
		cursor.readLine();
		if (!cursor.isAtEnd()) {
			cursor.advance(); // newline
		}

		// Check for title on next line (multi-line reference definition)
		if (!title && !cursor.isAtEnd()) {
			const nextLineStart = cursor.clone();
			this.skipLeadingWhitespace(nextLineStart);

			// Check if next non-blank line looks like a title
			if (
				nextLineStart.current() === '"' ||
				nextLineStart.current() === "'" ||
				nextLineStart.current() === "("
			) {
				// Consume the title line
				const quoteChar =
					nextLineStart.current() === "(" ? ")" : nextLineStart.current();
				nextLineStart.advance(); // opening quote

				while (
					nextLineStart.current() !== null &&
					nextLineStart.current() !== quoteChar &&
					nextLineStart.current() !== "\n"
				) {
					title += nextLineStart.current();
					nextLineStart.advance();
				}

				if (nextLineStart.current() === quoteChar) {
					nextLineStart.advance(); // closing quote
				}

				// Move cursor past the title line
				nextLineStart.readLine();
				if (!nextLineStart.isAtEnd()) {
					nextLineStart.advance(); // newline
				}

				cursor.pos = nextLineStart.pos;
				cursor.lineNumber = nextLineStart.lineNumber;
				cursor.columnNumber = nextLineStart.columnNumber;
			}
		}

		const end = cursor.pos;

		// Store reference in context for link resolution
		const refNode = context.builder.createAndAppend(
			"target",
			{
				name: label,
				target: url,
				title: title,
			},
			{
				start,
				end,
				line: startLine,
				column: startColumn,
			},
		);

		// Add to context targets for link resolution
		context.addTarget(refNode, label);

		return {
			consumed: end - start,
			node: refNode,
		};
	}
}
