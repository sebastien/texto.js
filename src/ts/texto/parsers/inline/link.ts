// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/inline/link
// Implements the parsers/inline/link module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Inline link parser
// Handles [text](url), [text](url "title"), [text][ref], and [ref] patterns

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { INLINE_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { InlineMatch, Node } from "../../utils/types.ts";
import { BaseInlineParser } from "./base.ts";

interface LinkParserOptions {
	enableReferenceLinks?: boolean;
}

class LinkParser extends BaseInlineParser {
	private enableReferenceLinks: boolean;

	constructor(options: LinkParserOptions = {}) {
		super("link", INLINE_PRIORITIES.LINK);
		this.enableReferenceLinks = options.enableReferenceLinks !== false;
	}

	findNext(cursor: Cursor, _context: ParsingContext): InlineMatch | null {
		const text = cursor.text;
		const textLength = text.length;
		let pos = cursor.pos;

		// Look for [ or < (for automatic links)
		while (pos < textLength) {
			// Check for automatic link: <http://...>
			if (text[pos] === "<") {
				const autoLinkMatch = this.findAutomaticLink(text, pos, textLength);
				if (autoLinkMatch) {
					return autoLinkMatch;
				}
			}

			// Check for regular link: [text](url) or [text][ref]
			if (text[pos] === "[") {
				const startBracket = pos;
				pos++; // skip [

				// Read link text (can contain nested brackets)
				let textContent = "";
				let bracketDepth = 1;

				while (pos < textLength && bracketDepth > 0) {
					if (text[pos] === "[" && text[pos - 1] !== "\\") {
						bracketDepth++;
						textContent += text[pos];
					} else if (text[pos] === "]" && text[pos - 1] !== "\\") {
						bracketDepth--;
						if (bracketDepth > 0) {
							textContent += text[pos];
						}
					} else {
						textContent += text[pos];
					}
					pos++;
				}

				// Must have found closing bracket
				if (bracketDepth !== 0) {
					pos = startBracket + 1;
					continue;
				}

				const _endTextBracket = pos - 1;

				// Check what follows: ( for inline, [ or space+[ for reference, or nothing for collapsed reference
				if (pos < textLength && text[pos] === "(") {
					// Inline link: [text](url)
					pos++; // skip (

					// Read URL
					let url = "";
					let inAngleBrackets = false;

					if (text[pos] === "<") {
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
						} else if (!inAngleBrackets && text[pos] === ")") {
							break;
						}
						url += text[pos];
						pos++;
					}

					// Check for optional title
					let title = "";
					if (pos < textLength && (text[pos] === " " || text[pos] === "\t")) {
						// Skip whitespace
						while (
							pos < textLength &&
							(text[pos] === " " || text[pos] === "\t")
						) {
							pos++;
						}

						// Check for title
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
							start: startBracket,
							end: pos,
							content: textContent,
							url,
							title,
							style: "inline",
						};
					}
				} else {
					if (!this.enableReferenceLinks) {
						pos = startBracket + 1;
						continue;
					}

					// Check for reference link: [text][ref] or [text] [ref]
					// May have optional whitespace between the brackets
					let ref = "";
					let currentPos = pos;

					// Skip optional whitespace
					while (
						currentPos < textLength &&
						(text[currentPos] === " " ||
							text[currentPos] === "\t" ||
							text[currentPos] === "\n")
					) {
						currentPos++;
					}

					// Check for [ after optional whitespace
					if (currentPos < textLength && text[currentPos] === "[") {
						// Reference link with or without space
						currentPos++; // skip [

						// Read reference label
						while (currentPos < textLength && text[currentPos] !== "]") {
							ref += text[currentPos];
							currentPos++;
						}

						if (currentPos < textLength && text[currentPos] === "]") {
							currentPos++;
							return {
								start: startBracket,
								end: currentPos,
								content: textContent,
								ref: ref || textContent,
								style: "reference",
							};
						}
					}

					// Collapsed reference: [text] or shortcut reference
					// Next char can be whitespace, punctuation, or end of text.
					if (pos >= textLength || /[\s.,!?;:)]/.test(text[pos] || "")) {
						if (!this.hasReference(_context, textContent)) {
							pos = startBracket + 1;
							continue;
						}

						return {
							start: startBracket,
							end: pos,
							content: textContent,
							ref: textContent,
							style: "collapsed",
						};
					}
				}

				// Not a valid link - restore and continue
				pos = startBracket + 1;
			} else {
				pos++;
			}
		}

		return null;
	}

	parse(cursor: Cursor, context: ParsingContext, match: InlineMatch): number {
		const currentPos = cursor.getPosition();
		const _text = cursor.text;

		// Create link node
		const node = context.builder.createAndAppend(
			"link",
			{},
			{
				start: match.start,
				end: match.end,
				line: currentPos.line,
				column: currentPos.column,
			},
		);

		// Handle different link styles
		if (match.style === "inline") {
			// Inline link - URL is known
			node.attributes.set("target", (match.url as string) || "");
			if (match.title) {
				node.attributes.set("title", match.title as string);
			}

			// Add text content
			this.addLinkText(node, match.content, context, match.start + 1);
		} else if (match.style === "automatic") {
			// Automatic link: <http://example.com>
			// The URL is both the href and the visible text
			const url = (match.url as string) || "";
			node.attributes.set("target", url);

			// Add the URL as text content (without the angle brackets)
			this.addLinkText(node, url, context, match.start + 1);
		} else {
			// Reference link - need to resolve
			const ref = (match.ref as string) || "";
			const normalizedRef = ref.toLowerCase().trim();
			const phaseReferences = context.keyIndex.get(
				"phase.reference-collection.references",
			) as
				| Map<string, { url: string; title: string; line: number }>
				| undefined;

			// Try to find reference in context
			let found = false;
			for (const target of context.targets) {
				if (target.name.toLowerCase() === normalizedRef) {
					node.attributes.set(
						"target",
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

			if (!found && phaseReferences) {
				const phaseReference = phaseReferences.get(normalizedRef);
				if (phaseReference) {
					node.attributes.set("target", phaseReference.url);
					if (phaseReference.title) {
						node.attributes.set("title", phaseReference.title);
					}
					found = true;
				}
			}

			if (!found) {
				// Reference not found - treat as plain text with brackets
				// Or create broken link
				node.attributes.set("target", "");
				node.attributes.set("data-broken-ref", ref);
			}

			// Add link text
			this.addLinkText(node, match.content, context, match.start + 1);
		}

		return match.end;
	}

	private addLinkText(
		node: Node,
		content: string,
		_context: ParsingContext,
		baseOffset: number,
	): void {
		if (content) {
			const textNode = createText(content, {
				start: baseOffset,
				end: baseOffset + content.length,
				line: 0, // Will be calculated by cursor
				column: 0,
			});
			node.children.push(textNode);
		}
	}

	/**
	 * Find automatic link: <http://...> or <https://...> or <email@example.com>
	 */
	private findAutomaticLink(
		text: string,
		pos: number,
		textLength: number,
	): InlineMatch | null {
		// Must start with <
		if (text[pos] !== "<") return null;

		const start = pos;
		pos++; // skip <

		// Read content until >
		let url = "";
		while (
			pos < textLength &&
			text[pos] !== ">" &&
			text[pos] !== " " &&
			text[pos] !== "\n"
		) {
			url += text[pos];
			pos++;
		}

		// Must end with >
		if (pos >= textLength || text[pos] !== ">") {
			return null;
		}

		pos++; // skip >

		// Check if it looks like a URL or email
		const isUrl =
			url.startsWith("http://") ||
			url.startsWith("https://") ||
			url.startsWith("ftp://");
		const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url);

		if (!isUrl && !isEmail) {
			return null;
		}

		return {
			start,
			end: pos,
			content: url,
			url,
			style: "automatic",
		};
	}

	private hasReference(context: ParsingContext, label: string): boolean {
		const normalized = label.toLowerCase().trim();

		for (const target of context.targets) {
			if (target.name.toLowerCase() === normalized) {
				return true;
			}
		}

		const phaseData = context.keyIndex.get(
			"phase.reference-collection.references",
		) as Map<string, { url: string; title: string; line: number }> | undefined;
		return phaseData?.has(normalized) || false;
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { LinkParser };

// EOF
