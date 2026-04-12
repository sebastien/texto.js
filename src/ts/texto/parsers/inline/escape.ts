// Inline escape parser
// Handles backslash escapes for special characters
// \* \_ \` \[ \] \( \) \# \+ \- \. \!

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { INLINE_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { InlineMatch } from "../../utils/types.ts";
import { BaseInlineParser } from "./base.ts";

// Characters that can be escaped in Markdown
const ESCAPABLE_CHARS = new Set([
	"\\",
	"`",
	"*",
	"_",
	"{",
	"}",
	"[",
	"]",
	"(",
	")",
	"#",
	"+",
	"-",
	".",
	"!",
	"|",
	"<",
	">",
]);

export class EscapeParser extends BaseInlineParser {
	constructor() {
		super("escape", INLINE_PRIORITIES.ESCAPED);
	}

	findNext(cursor: Cursor, _context: ParsingContext): InlineMatch | null {
		const text = cursor.text;
		const textLength = text.length;
		let pos = cursor.pos;

		// Look for backslash
		while (pos < textLength) {
			if (text[pos] === "\\" && pos + 1 < textLength) {
				const nextChar = text[pos + 1];

				// Check if next char is escapable
				if (ESCAPABLE_CHARS.has(nextChar)) {
					return {
						start: pos,
						end: pos + 2,
						content: nextChar,
						escaped: nextChar,
					};
				}

				// Check for escaped newlines (hard line break)
				if (nextChar === "\n") {
					return {
						start: pos,
						end: pos + 2,
						content: "",
						escaped: "\n",
						isLineBreak: true,
					};
				}
			}

			pos++;
		}

		return null;
	}

	parse(cursor: Cursor, context: ParsingContext, match: InlineMatch): number {
		const currentPos = cursor.getPosition();

		// For line breaks, create a <br> element
		if (match.isLineBreak) {
			context.builder.createAndAppend(
				"br",
				{},
				{
					start: match.start,
					end: match.end,
					line: currentPos.line,
					column: currentPos.column,
				},
			);
		} else {
			// For escaped characters, add the literal character as text
			const escapedChar = (match.escaped as string) || "";
			if (escapedChar) {
				const textNode = createText(escapedChar, {
					start: match.start + 1, // Skip the backslash
					end: match.end,
					line: currentPos.line,
					column: currentPos.column + 1,
				});
				context.builder.getCurrentNode().children.push(textNode);
			}
		}

		return match.end;
	}
}
