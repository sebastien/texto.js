// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/inline/text
// Implements the parsers/inline/text module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Text inline parser (fallback)

import type { ParsingContext } from "../../parsing/context.ts";
import { INLINE_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { InlineMatch } from "../../utils/types.ts";
import { BaseInlineParser } from "./base.ts";

class TextParser extends BaseInlineParser {
	constructor() {
		super("text", INLINE_PRIORITIES.TEXT);
	}

	findNext(cursor: Cursor, _context: ParsingContext): InlineMatch | null {
		// Text parser just consumes all remaining text
		// This should be used as a fallback
		if (cursor.isAtEnd()) {
			return null;
		}

		return {
			start: cursor.pos,
			end: cursor.length,
			content: cursor.slice(cursor.pos, cursor.length),
		};
	}

	parse(cursor: Cursor, context: ParsingContext, match: InlineMatch): number {
		// Get current position from cursor for accurate line/column
		const currentPos = cursor.getPosition();

		// Add as text node with position (addText already appends to current node)
		context.builder.addText(match.content, {
			start: match.start,
			end: match.end,
			line: currentPos.line,
			column: currentPos.column,
		});

		return match.end;
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { TextParser };

// EOF
