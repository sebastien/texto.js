// Horizontal rule block parser
// Recognizes ---, ***, or ___ on their own line
// Allows optional spaces between markers

import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

export class HorizontalRuleParser extends BaseBlockParser {
	constructor() {
		super("horizontal-rule", BLOCK_PRIORITIES.SEPARATOR + 2); // 10, early recognition
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		const firstChar = cursor.current();

		// Must start with -, *, or _
		if (firstChar !== "-" && firstChar !== "*" && firstChar !== "_") {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return null;
		}

		// Count markers with optional spaces between
		let count = 0;
		const marker = firstChar;

		while (cursor.current() !== null && cursor.current() !== "\n") {
			const current = cursor.current();

			if (current === marker) {
				count++;
				cursor.advance();
			} else if (current === " " || current === "\t") {
				// Allow spaces between markers
				cursor.advance();
			} else {
				// Invalid character for horizontal rule
				cursor.pos = save.pos;
				cursor.lineNumber = save.lineNumber;
				cursor.columnNumber = save.columnNumber;
				return null;
			}
		}

		// Must have at least 3 markers
		if (count >= 3) {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return { type: "horizontal-rule", marker };
		}

		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;
		return null;
	}

	process(
		cursor: Cursor,
		context: ParsingContext,
		_info: RecognitionInfo,
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;

		// Skip leading whitespace
		this.skipLeadingWhitespace(cursor);

		// Skip the horizontal rule line
		cursor.readLine();

		// Skip newline if present
		if (!cursor.isAtEnd()) {
			cursor.advance();
		}

		const end = cursor.pos;

		// Create hr node
		const node = context.builder.createAndAppend(
			"hr",
			{},
			{
				start,
				end,
				line: startLine,
				column: startColumn,
			},
		);

		return {
			consumed: end - start,
			node,
		};
	}
}
