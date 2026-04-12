// Header block parser for Markdown
// Creates flat h1-h6 elements without section wrappers
// Supports hash headings (# ## ###) and underline headings (=== ---)

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

export class HeaderParser extends BaseBlockParser {
	constructor() {
		// Higher priority than SectionParser so it runs first for markdown
		// SECTION priority is 25, so use 24
		super("header", BLOCK_PRIORITIES.SECTION - 1);
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Try underlined section: text\n=== or text\n---
		const _line = cursor.readLine();
		if (!cursor.isAtEnd()) {
			const _newlinePos = cursor.pos;
			cursor.advance(); // skip newline
			const underline = cursor.readLine();

			if (/^[=-]+$/.test(underline) && underline.length >= 3) {
				cursor.pos = save.pos;
				cursor.lineNumber = save.lineNumber;
				cursor.columnNumber = save.columnNumber;
				const depth = underline.startsWith("==") ? 1 : 2;
				return { type: "header", style: "underline", depth };
			}
		}

		// Try hash headings: # ## ###
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		let hashCount = 0;
		while (cursor.peek(hashCount) === "#") {
			hashCount++;
		}

		if (hashCount > 0 && hashCount <= 6) {
			// Check for space or end of line after hashes
			const nextChar = cursor.peek(hashCount);
			if (
				nextChar === " " ||
				nextChar === "\t" ||
				nextChar === "\n" ||
				nextChar === null
			) {
				cursor.pos = save.pos;
				cursor.lineNumber = save.lineNumber;
				cursor.columnNumber = save.columnNumber;
				return { type: "header", style: "hash", depth: hashCount };
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
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;

		// Parse heading text based on style
		let title = "";
		let depth = 1;

		if (info.style === "underline") {
			// Underline style: read text, then skip underline line
			this.skipLeadingWhitespace(cursor);
			title = cursor.readLine().trim();

			// Skip newline and underline
			if (!cursor.isAtEnd()) {
				cursor.advance(); // newline
				cursor.readLine(); // underline
			}

			depth = info.depth as number;
		} else if (info.style === "hash") {
			// Hash style: skip #s, read text
			this.skipLeadingWhitespace(cursor);
			depth = info.depth as number;

			// Skip hash markers
			let hashCount = 0;
			while (cursor.current() === "#" && hashCount < depth) {
				cursor.advance();
				hashCount++;
			}

			// Skip space after hashes if present
			if (cursor.current() === " " || cursor.current() === "\t") {
				cursor.advance();
			}

			// Read title (everything until end of line, optionally stripping trailing hashes)
			title = cursor.readLine().trim();

			// Strip optional trailing hashes
			// Markdown allows: # Title # or # Title ## for closing hashes
			title = title.replace(/\s+#+$/, "");
		}

		const end = cursor.pos;

		// Create header element (h1-h6) directly without section wrapper
		const tagName = `h${depth}`;
		const node = context.builder.createAndAppend(
			tagName,
			{},
			{
				start,
				end,
				line: startLine,
				column: startColumn,
			},
		);

		// Add title as text node
		if (title) {
			const titleStart = start + (end - start - title.length);
			const textNode = createText(title, {
				start: titleStart,
				end: end,
				line: startLine,
				column: startColumn + (tagName.length + 1),
			});
			node.children.push(textNode);
		}

		return {
			consumed: end - start,
			node,
		};
	}
}
