// Inline code parser
// Handles `code` and `` `backticks` `` patterns
// Double backticks allow single backticks inside code

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { INLINE_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { InlineMatch } from "../../utils/types.ts";
import { BaseInlineParser } from "./base.ts";

export class CodeParser extends BaseInlineParser {
	constructor() {
		super("code", INLINE_PRIORITIES.CODE);
	}

	findNext(cursor: Cursor, _context: ParsingContext): InlineMatch | null {
		const text = cursor.text;
		let pos = cursor.pos;

		// Look for backtick sequence
		while (pos < text.length) {
			if (text[pos] === "`") {
				// Found opening backtick(s)
				let tickCount = 0;
				const startTicks = pos;

				while (pos < text.length && text[pos] === "`") {
					tickCount++;
					pos++;
				}

				// Look for closing backticks with same count
				const contentStart = pos;
				let endTicks = -1;

				while (pos < text.length) {
					if (text[pos] === "`") {
						let closeCount = 0;
						const potentialEnd = pos;

						while (pos < text.length && text[pos] === "`") {
							closeCount++;
							pos++;
						}

						if (closeCount === tickCount) {
							endTicks = potentialEnd;
							break;
						}
					} else {
						pos++;
					}
				}

				if (endTicks !== -1) {
					// Found matching close
					return {
						start: startTicks,
						end: endTicks + tickCount,
						content: text.slice(contentStart, endTicks),
						style: "code",
						tickCount,
					};
				}

				// No matching close found - restore and continue
				pos = startTicks + 1;
			} else {
				pos++;
			}
		}

		return null;
	}

	parse(cursor: Cursor, context: ParsingContext, match: InlineMatch): number {
		const currentPos = cursor.getPosition();
		const tickCount = (match.tickCount as number) || 1;
		const contentStart = match.start + tickCount;
		const contentEnd = match.end - tickCount;

		// Create code node
		const node = context.builder.createAndAppend(
			"code",
			{},
			{
				start: match.start,
				end: match.end,
				line: currentPos.line,
				column: currentPos.column,
			},
		);

		// Add content as text node (code content is not processed for other inline elements)
		if (match.content) {
			const textNode = createText(match.content, {
				start: contentStart,
				end: contentEnd,
				line: currentPos.line,
				column: currentPos.column + tickCount,
			});
			node.children.push(textNode);
		}

		return match.end;
	}
}
