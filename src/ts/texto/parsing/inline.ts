// Inline parsing engine

import type { InlineParser } from "../parsers/inline/text.ts";
import type { Cursor } from "../utils/cursor.ts";
import type { InlineMatch, Node } from "../utils/types.ts";
import type { ParsingContext } from "./context.ts";
import type { ParserRegistry } from "./registry.ts";

export class InlineParsingEngine {
	private registry: ParserRegistry<InlineParser>;

	constructor(registry: ParserRegistry<InlineParser>) {
		this.registry = registry;
	}

	parseInlines(
		cursor: Cursor,
		context: ParsingContext,
		parent: Node,
		endOffset: number,
		baseOffset: number = 0,
	): void {
		const ordered = this.registry.getOrdered();

		while (cursor.pos < endOffset) {
			// Find the next inline match across all parsers
			const match = this.findNextMatch(cursor, context, ordered, endOffset);

			if (!match) {
				// No more inlines, add remaining text
				const remainingText = cursor.slice(cursor.pos, endOffset);
				if (remainingText) {
					const absStart = baseOffset + cursor.pos;
					const absEnd = baseOffset + endOffset;
					const currentPos = cursor.getPosition();
					const textNode = context.builder.addText(remainingText, {
						start: absStart,
						end: absEnd,
						line: currentPos.line,
						column: currentPos.column,
					});
					parent.children.push(textNode);
				}
				break;
			}

			// Add text before the match
			if (match.match.start > cursor.pos) {
				const beforeText = cursor.slice(cursor.pos, match.match.start);
				if (beforeText) {
					const absStart = baseOffset + cursor.pos;
					const absEnd = baseOffset + match.match.start;
					const currentPos = cursor.getPosition();
					const textNode = context.builder.addText(beforeText, {
						start: absStart,
						end: absEnd,
						line: currentPos.line,
						column: currentPos.column,
					});
					parent.children.push(textNode);
				}
			}

			// Adjust match positions to be absolute
			const adjustedMatch: InlineMatch = {
				...match.match,
				start: baseOffset + match.match.start,
				end: baseOffset + match.match.end,
			};

			// Parse the inline
			const newOffset = match.parser.parse(cursor, context, adjustedMatch);

			// Update cursor position (relative to the local text)
			cursor.pos = newOffset - baseOffset;
		}
	}

	private findNextMatch(
		cursor: Cursor,
		context: ParsingContext,
		parsers: InlineParser[],
		blockEnd: number,
	): { parser: InlineParser; match: InlineMatch } | null {
		let bestMatch: { parser: InlineParser; match: InlineMatch } | null = null;
		let bestPosition = Infinity;

		for (const parser of parsers) {
			const save = cursor.clone();

			const match = parser.findNext(cursor, context);

			if (match && match.start < bestPosition && match.start < blockEnd) {
				bestPosition = match.start;
				bestMatch = { parser, match };
			}

			// Restore cursor position for next parser
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
		}

		return bestMatch;
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
