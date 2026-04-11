// Emphasis and strong inline parser

import type { ParsingContext } from "../../parsing/context.ts";
import { INLINE_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { InlineMatch } from "../../utils/types.ts";
import { BaseInlineParser } from "./base.ts";

export class EmphasisParser extends BaseInlineParser {
	constructor() {
		super("emphasis", INLINE_PRIORITIES.EMPHASIS);
	}

	findNext(cursor: Cursor, _context: ParsingContext): InlineMatch | null {
		const text = cursor.slice(cursor.pos, cursor.length);

		// Look for **strong**
		const strongMatch = this.findDelimiter(text, "**");
		if (strongMatch) {
			return {
				start: cursor.pos + strongMatch.start,
				end: cursor.pos + strongMatch.end,
				content: strongMatch.content,
				style: "strong",
			};
		}

		// Look for *emphasis*
		const emMatch = this.findDelimiter(text, "*");
		if (emMatch) {
			return {
				start: cursor.pos + emMatch.start,
				end: cursor.pos + emMatch.end,
				content: emMatch.content,
				style: "emphasis",
			};
		}

		return null;
	}

	parse(cursor: Cursor, context: ParsingContext, match: InlineMatch): number {
		const tagName = match.style === "strong" ? "strong" : "em";

		// Get current position from cursor for accurate line/column
		const startPos = cursor.getPosition();

		const node = context.builder.createAndAppend(
			tagName,
			{},
			{
				start: match.start,
				end: match.end,
				line: startPos.line,
				column: startPos.column,
			},
		);

		// Add text content with position (content is inside the delimiters)
		const delimiterLen = match.style === "strong" ? 2 : 1;
		const contentStart = match.start + delimiterLen;
		const contentEnd = match.end - delimiterLen;
		const textNode = context.builder.addText(match.content, {
			start: contentStart,
			end: contentEnd,
			line: startPos.line,
			column: startPos.column + delimiterLen,
		});
		node.children.push(textNode);

		return match.end;
	}

	private findDelimiter(
		text: string,
		delimiter: string,
	): { start: number; end: number; content: string } | null {
		const start = text.indexOf(delimiter);
		if (start === -1) return null;

		const contentStart = start + delimiter.length;
		const end = text.indexOf(delimiter, contentStart);

		if (end === -1) return null;

		return {
			start,
			end: end + delimiter.length,
			content: text.slice(contentStart, end),
		};
	}
}
