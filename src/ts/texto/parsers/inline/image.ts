// Inline image parser
// Handles ![alt](url) and ![alt][ref] patterns
// Similar to link parser but produces img elements

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { INLINE_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { InlineMatch } from "../../utils/types.ts";
import { BaseInlineParser } from "./base.ts";

export class ImageParser extends BaseInlineParser {
	constructor() {
		super("image", INLINE_PRIORITIES.LINK); // Same priority as links
	}

	findNext(cursor: Cursor, _context: ParsingContext): InlineMatch | null {
		const text = cursor.text;
		const textLength = text.length;
		let pos = cursor.pos;

		// Look for ![
		while (pos < textLength - 1) {
			if (text[pos] === "!" && text[pos + 1] === "[") {
				const startPos = pos;
				pos += 2; // skip ![

				// Read alt text (can contain nested brackets)
				let altText = "";
				let bracketDepth = 1;

				while (pos < textLength && bracketDepth > 0) {
					if (text[pos] === "[" && text[pos - 1] !== "\\") {
						bracketDepth++;
						altText += text[pos];
					} else if (text[pos] === "]" && text[pos - 1] !== "\\") {
						bracketDepth--;
						if (bracketDepth > 0) {
							altText += text[pos];
						}
					} else {
						altText += text[pos];
					}
					pos++;
				}

				// Must have found closing bracket
				if (bracketDepth !== 0) {
					pos = startPos + 1;
					continue;
				}

				const endAltBracket = pos - 1;

				// Check what follows: ( for inline, [ for reference
				if (pos < textLength && text[pos] === "(") {
					// Inline image: ![alt](url)
					pos++; // skip (

					// Read URL
					let url = "";
					let inAngleBrackets = false;

					if (pos < textLength && text[pos] === "<") {
						inAngleBrackets = true;
						pos++;
					}

					while (pos < textLength) {
						if (inAngleBrackets && text[pos] === ">") {
							pos++;
							break;
						} else if (
							!inAngleBrackets &&
							(text[pos] === " " || text[pos] === "\t" || text[pos] === ")")
						) {
							break;
						}
						url += text[pos];
						pos++;
					}

					// Check for optional title
					let title = "";
					if (pos < textLength && (text[pos] === " " || text[pos] === "\t")) {
						while (
							pos < textLength &&
							(text[pos] === " " || text[pos] === "\t")
						) {
							pos++;
						}

						if (
							pos < textLength &&
							(text[pos] === '"' || text[pos] === "'" || text[pos] === "(")
						) {
							const quote = text[pos] === "(" ? ")" : text[pos];
							pos++;

							while (pos < textLength && text[pos] !== quote) {
								title += text[pos];
								pos++;
							}

							if (pos < textLength && text[pos] === quote) {
								pos++;
							}
						}
					}

					// Must find closing )
					if (pos < textLength && text[pos] === ")") {
						pos++;
						return {
							start: startPos,
							end: pos,
							alt: altText,
							url,
							title,
							style: "inline",
						};
					}
				} else if (pos < textLength && text[pos] === "[") {
					// Reference image: ![alt][ref]
					pos++; // skip [

					// Read reference label
					let ref = "";
					while (pos < textLength && text[pos] !== "]") {
						ref += text[pos];
						pos++;
					}

					if (pos < textLength && text[pos] === "]") {
						pos++;
						return {
							start: startPos,
							end: pos,
							alt: altText,
							ref: ref || altText,
							style: "reference",
						};
					}
				} else if (pos >= textLength || text[pos] !== "[") {
					// Collapsed reference: ![alt]
					if (
						pos >= textLength ||
						text[pos] === " " ||
						text[pos] === "\t" ||
						text[pos] === "\n"
					) {
						return {
							start: startPos,
							end: pos,
							alt: altText,
							ref: altText,
							style: "collapsed",
						};
					}
				}

				// Not a valid image - restore and continue
				pos = startPos + 1;
			} else {
				pos++;
			}
		}

		return null;
	}

	parse(cursor: Cursor, context: ParsingContext, match: InlineMatch): number {
		const currentPos = cursor.getPosition();

		// Create image node
		const node = context.builder.createAndAppend(
			"img",
			{},
			{
				start: match.start,
				end: match.end,
				line: currentPos.line,
				column: currentPos.column,
			},
		);

		// Set alt text
		node.attributes.set("alt", (match.alt as string) || "");

		// Handle different image styles
		if (match.style === "inline") {
			// Inline image - URL is known
			node.attributes.set("src", (match.url as string) || "");
			if (match.title) {
				node.attributes.set("title", match.title as string);
			}
		} else {
			// Reference image - need to resolve
			const ref = (match.ref as string) || "";
			const normalizedRef = ref.toLowerCase().trim();

			// Try to find reference in context
			let found = false;
			for (const target of context.targets) {
				if (target.name.toLowerCase() === normalizedRef) {
					node.attributes.set(
						"src",
						target.node.attributes.get("target") || "",
					);
					const title = target.node.attributes.get("title");
					if (title) {
						node.attributes.set("title", title);
					}
					found = true;
					break;
				}
			}

			if (!found) {
				// Reference not found
				node.attributes.set("src", "");
				node.attributes.set("data-broken-ref", ref);
			}
		}

		// Images are void elements - no children
		return match.end;
	}
}
