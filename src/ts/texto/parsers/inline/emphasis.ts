// Emphasis and strong inline parser
// Supports both *asterisk* and _underscore_ style emphasis

import { createText } from "../../document/node.ts";
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
		const text = cursor.text;
		const textLength = text.length;
		let pos = cursor.pos;

		// Find the next emphasis marker (* or _) with the smallest start position
		let bestMatch: InlineMatch | null = null;
		let bestStart = Infinity;

		// Check for **strong** or __strong__
		let strongAsterisk = text.indexOf("**", pos);
		let strongUnderscore = text.indexOf("__", pos);

		// Check for *emphasis* or _emphasis_
		let emAsterisk = text.indexOf("*", pos);
		let emUnderscore = text.indexOf("_", pos);

		// Find **strong** (check if there's a closing **)
		if (strongAsterisk !== -1) {
			const closeIdx = text.indexOf("**", strongAsterisk + 2);
			if (closeIdx !== -1 && closeIdx < bestStart) {
				bestStart = strongAsterisk;
				bestMatch = {
					start: strongAsterisk,
					end: closeIdx + 2,
					content: text.slice(strongAsterisk + 2, closeIdx),
					style: "strong",
					delimiter: "**",
				};
			}
		}

		// Find __strong__
		if (strongUnderscore !== -1) {
			const closeIdx = text.indexOf("__", strongUnderscore + 2);
			if (closeIdx !== -1 && strongUnderscore < bestStart) {
				bestStart = strongUnderscore;
				bestMatch = {
					start: strongUnderscore,
					end: closeIdx + 2,
					content: text.slice(strongUnderscore + 2, closeIdx),
					style: "strong",
					delimiter: "__",
				};
			}
		}

		// Find *emphasis* (but not ** which is strong)
		if (emAsterisk !== -1 && emAsterisk !== strongAsterisk) {
			// Make sure it's not part of **
			if (text[emAsterisk + 1] !== "*") {
				const closeIdx = text.indexOf("*", emAsterisk + 1);
				// Make sure closing is not part of **
				if (
					closeIdx !== -1 &&
					text[closeIdx + 1] !== "*" &&
					emAsterisk < bestStart
				) {
					bestStart = emAsterisk;
					bestMatch = {
						start: emAsterisk,
						end: closeIdx + 1,
						content: text.slice(emAsterisk + 1, closeIdx),
						style: "emphasis",
						delimiter: "*",
					};
				}
			}
		}

		// Find _emphasis_ (but not __ which is strong)
		if (emUnderscore !== -1 && emUnderscore !== strongUnderscore) {
			// Make sure it's not part of __
			if (text[emUnderscore + 1] !== "_") {
				const closeIdx = text.indexOf("_", emUnderscore + 1);
				// Make sure closing is not part of __
				if (
					closeIdx !== -1 &&
					text[closeIdx + 1] !== "_" &&
					emUnderscore < bestStart
				) {
					bestStart = emUnderscore;
					bestMatch = {
						start: emUnderscore,
						end: closeIdx + 1,
						content: text.slice(emUnderscore + 1, closeIdx),
						style: "emphasis",
						delimiter: "_",
					};
				}
			}
		}

		return bestMatch;
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
		const textNode = createText(match.content, {
			start: contentStart,
			end: contentEnd,
			line: startPos.line,
			column: startPos.column + delimiterLen,
		});
		node.children.push(textNode);

		return match.end;
	}
}
