// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsing/inline
// Implements inline parsing orchestration, combining parser priority with nearest-match
// selection so inline elements are emitted deterministically.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Class: InlineParsingEngine
// Resolves and applies inline parser matches over a bounded text range.

import type { InlineParser } from "../parsers/inline/base.ts";
import type { Cursor } from "../utils/cursor.ts";
import type { InlineMatch, Node } from "../utils/types.ts";
import type { ParsingContext } from "./context.ts";
import type { ParserRegistry } from "./registry.ts";

class InlineParsingEngine {
	private registry: ParserRegistry<InlineParser>;

	constructor(registry: ParserRegistry<InlineParser>) {
		this.registry = registry;
	}

	// Function: parseInlines
	// Parses inline syntax in the active cursor range and appends children to `parent`.
	parseInlines(
		cursor: Cursor,
		context: ParsingContext,
		_parent: Node,
		endOffset: number,
		baseOffset: number = 0,
	): void {
		const ordered = this.registry.getOrdered();

		while (cursor.pos < endOffset) {
			// Find the next inline match across all parsers
			const matchInfo = this.findNextMatch(cursor, context, ordered, endOffset);

			if (!matchInfo) {
				// No more inlines, add remaining text
				const remainingText = cursor.slice(cursor.pos, endOffset);
				if (remainingText) {
					const absStart = baseOffset + cursor.pos;
					const absEnd = baseOffset + endOffset;
					const currentPos = cursor.getPosition();
					context.builder.addText(remainingText, {
						start: absStart,
						end: absEnd,
						line: currentPos.line,
						column: currentPos.column,
					});
				}
				break;
			}

			const { parser, match, isAtCurrentPos } = matchInfo;

			if (isAtCurrentPos) {
				// Match is at current position - parse it directly
				// Adjust match positions to be absolute
				const adjustedMatch: InlineMatch = {
					...match,
					start: baseOffset + match.start,
					end: baseOffset + match.end,
				};

				// Parse the inline
				const newOffset = parser.parse(cursor, context, adjustedMatch);

				// Update cursor position (relative to the local text)
				cursor.pos = newOffset - baseOffset;
			} else {
				// Match is at a future position - add text up to the match first
				const beforeText = cursor.slice(cursor.pos, match.start);
				if (beforeText) {
					const absStart = baseOffset + cursor.pos;
					const absEnd = baseOffset + match.start;
					const currentPos = cursor.getPosition();
					context.builder.addText(beforeText, {
						start: absStart,
						end: absEnd,
						line: currentPos.line,
						column: currentPos.column,
					});
				}
				// Move cursor to the match position for next iteration
				cursor.pos = match.start;
			}
		}
	}

	private findNextMatch(
		cursor: Cursor,
		context: ParsingContext,
		parsers: InlineParser[],
		blockEnd: number,
	): {
		parser: InlineParser;
		match: InlineMatch;
		isAtCurrentPos: boolean;
	} | null {
		// Separate parsers into two groups:
		// 1. Real inline parsers (code, links, emphasis) - these create special elements
		// 2. Fallback text parser - just consumes remaining text

		const realParsers: typeof parsers = [];
		let fallbackParser: InlineParser | null = null;

		for (const parser of parsers) {
			if (parser.name === "text") {
				fallbackParser = parser;
			} else {
				realParsers.push(parser);
			}
		}

		// Find best match from real parsers (at or after current position)
		let bestMatch: { parser: InlineParser; match: InlineMatch } | null = null;
		let bestPosition = Infinity;
		let bestPriority = Infinity;

		for (const parser of realParsers) {
			const save = cursor.clone();

			const match = parser.findNext(cursor, context);

			if (match && match.start >= cursor.pos && match.start < blockEnd) {
				// Prefer match with smaller start position
				// If same position, prefer higher priority (lower priority number)
				if (
					match.start < bestPosition ||
					(match.start === bestPosition && parser.priority < bestPriority)
				) {
					bestPosition = match.start;
					bestPriority = parser.priority;
					bestMatch = { parser, match };
				}
			}

			// Restore cursor position for next parser
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
		}

		// If we found a real parser match, return it
		if (bestMatch) {
			const isAtCurrentPos = bestMatch.match.start === cursor.pos;
			return { ...bestMatch, isAtCurrentPos };
		}

		// No real parser matches - use fallback text parser
		if (fallbackParser) {
			const save = cursor.clone();
			const match = fallbackParser.findNext(cursor, context);
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;

			if (match && match.start >= cursor.pos && match.start < blockEnd) {
				return { parser: fallbackParser, match, isAtCurrentPos: true };
			}
		}

		return null;
	}

	normaliseWhitespace(text: string): string {
		// Normalise tabs, newlines, multiple spaces
		return text
			.replace(/\t/g, " ") // Expand tabs to single space for inline
			.replace(/\n/g, " ") // Replace newlines with space
			.replace(/\s+/g, " ") // Collapse multiple spaces
			.trim();
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { InlineParsingEngine };

// EOF
