// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsing/block
// Implements block-level parsing orchestration, parser selection by priority, and
// block boundary detection for recursive parsing contexts.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Class: BlockParsingEngine
// Selects and executes block parsers for the active parsing context.

import type { BlockParser } from "../parsers/block/base.ts";
import type { Cursor } from "../utils/cursor.ts";
import type { BlockResult } from "../utils/types.ts";
import type { ParsingContext } from "./context.ts";
import type { ParserRegistry } from "./registry.ts";

class BlockParsingEngine {
	private registry: ParserRegistry<BlockParser>;
	private defaultParser: BlockParser;

	constructor(
		registry: ParserRegistry<BlockParser>,
		defaultParser: BlockParser,
	) {
		this.registry = registry;
		this.defaultParser = defaultParser;
	}

	// Function: processBlock
	// Processes one block starting at the cursor position in `context`.
	processBlock(cursor: Cursor, context: ParsingContext): BlockResult {
		const _startPos = cursor.pos;

		// Find a parser that recognises this block
		const ordered = this.registry.getOrdered();
		let recognised: {
			parser: BlockParser;
			info: Record<string, unknown>;
		} | null = null;

		for (const parser of ordered) {
			const save = cursor.clone();
			const info = parser.recognises(cursor, context);

			if (info) {
				recognised = { parser, info };
				break;
			}

			// Restore cursor position
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
		}

		// Use default parser if none recognised
		if (!recognised) {
			const save = cursor.clone();
			const info = this.defaultParser.recognises(cursor, context);

			if (info) {
				recognised = { parser: this.defaultParser, info };
			}

			// Restore cursor position
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
		}

		if (!recognised) {
			throw new Error("No parser could recognise block");
		}

		// Process the block
		const result = recognised.parser.process(cursor, context, recognised.info);

		return result;
	}

	// NEW: Process block at current context offset (for recursive parsing)
	// Function: processBlockAt
	// Processes one block at the current context offset and returns consumed content.
	processBlockAt(context: ParsingContext): BlockResult | null {
		const text = context.getText();
		const startOffset = context.getOffset();

		// Save current state
		const savedState = context.saveOffsets();

		// Get cursor at current position for recognition
		const cursor = context.getCursor();
		cursor.pos = startOffset;

		// Find a parser that recognises this block
		const ordered = this.registry.getOrdered();
		let recognised: {
			parser: BlockParser;
			info: Record<string, unknown>;
		} | null = null;

		for (const parser of ordered) {
			const save = cursor.clone();
			const info = parser.recognises(cursor, context);

			if (info) {
				recognised = { parser, info };
				break;
			}

			// Restore cursor position
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
		}

		// Use default parser if none recognised
		if (!recognised) {
			const save = cursor.clone();
			const info = this.defaultParser.recognises(cursor, context);

			if (info) {
				recognised = { parser: this.defaultParser, info };
			}

			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
		}

		if (!recognised) {
			// Restore state and return
			context.restoreOffsets(savedState);
			return null;
		}

		// Find block end - for special block types that span boundaries (like tagged blocks),
		// let the parser determine the actual end, but never escape the active parse range.
		let blockEnd: number;

		// Check if this is a tagged block that spans multiple logical blocks
		if (recognised.info.type === "tagged") {
			// For tagged blocks, find the actual closing line
			blockEnd = this.findTaggedBlockEnd(text, startOffset);
		} else if (recognised.info.type === "blockquote") {
			// For blockquotes, look ahead to find the actual end including continuation lines
			blockEnd = this.findBlockquoteEnd(text, startOffset);
		} else {
			// For other blocks, use the default boundary detection (blank lines)
			blockEnd = this.findBlockEnd(text, startOffset);
		}

		// Keep parsing confined to the active block range (important for nested parsing,
		// e.g. list items parsed via parseBlocksInRange).
		blockEnd = Math.min(blockEnd, context.getBlockEnd());

		// Set block boundaries for this block
		context.setCurrentBlock(startOffset, blockEnd);

		// Process the block using the parser, passing the engine for recursive parsing
		const result = recognised.parser.process(
			cursor,
			context,
			recognised.info,
			this, // Pass the engine for recursive parsing
		);

		if (result?.node?.position && !this.isIgnoredMarkupBlock(recognised.info)) {
			result.node.position.block = context.getNextBlockNumber();
		}

		// Restore original state
		context.restoreOffsets(savedState);

		return result;
	}

	private isIgnoredMarkupBlock(info: Record<string, unknown>): boolean {
		const type = info.type;
		return type === "markup" || type === "html";
	}

	// Find the end of a tagged block by looking for the closing line of underscores
	private findTaggedBlockEnd(text: string, startOffset: number): number {
		let pos = startOffset;

		// First, skip past the opening line to find the opening indent
		let openingIndent = 0;
		while (pos < text.length && text[pos] !== "\n") {
			if (text[pos] === " ") {
				openingIndent++;
			} else if (text[pos] === "\t") {
				openingIndent += 4;
			} else {
				break;
			}
			pos++;
		}

		// Skip to end of opening line
		if (pos < text.length && text[pos] === "\n") {
			pos++;
		}

		// Now scan for the closing line with matching indentation
		while (pos < text.length) {
			const _lineStart = pos;

			// Count indentation on this line
			let lineIndent = 0;
			while (pos < text.length && (text[pos] === " " || text[pos] === "\t")) {
				if (text[pos] === " ") {
					lineIndent++;
				} else {
					lineIndent += 4;
				}
				pos++;
			}

			// Check if this is a line of underscores
			let underscoreCount = 0;
			while (pos < text.length && text[pos] === "_") {
				underscoreCount++;
				pos++;
			}

			// Skip trailing whitespace
			while (pos < text.length && (text[pos] === " " || text[pos] === "\t")) {
				pos++;
			}

			// Check if this is the closing line (same indent, 3+ underscores, then newline/end)
			if (
				lineIndent === openingIndent &&
				underscoreCount >= 3 &&
				(pos >= text.length || text[pos] === "\n" || text[pos] === "\r")
			) {
				// Found closing line - return position at end of this line
				if (pos < text.length && text[pos] === "\r") pos++;
				if (pos < text.length && text[pos] === "\n") pos++;
				return pos;
			}

			// Not the closing line - skip to end of this line
			while (pos < text.length && text[pos] !== "\n") {
				pos++;
			}
			if (pos < text.length && text[pos] === "\n") {
				pos++;
			}
		}

		// No closing line found - return end of text
		return text.length;
	}

	// NEW: Parse blocks within a range and add them as children to parent node
	parseBlocksInRange(
		context: ParsingContext,
		parentNode: Node,
		startOffset: number,
		endOffset: number,
	): void {
		const savedOffsets = context.saveOffsets();
		const savedNode = context.getCurrentNode();

		// Set new block range
		context.setCurrentBlock(startOffset, endOffset);
		context.setCurrentNode(parentNode);

		// Parse all blocks in this range
		let iterations = 0;
		const maxIterations = endOffset - startOffset + 100;

		while (!context.isAtBlockEnd() && iterations < maxIterations) {
			iterations++;

			// Skip blank lines at start
			this.skipBlankLinesInContext(context);

			if (context.isAtBlockEnd()) break;

			const offsetBefore = context.getOffset();

			// Process next block
			const result = this.processBlockAt(context);

			if (result && result.consumed > 0) {
				context.setOffset(offsetBefore + result.consumed);
			} else {
				// Safety: advance by at least 1 character
				context.advanceOffset(1);
			}
		}

		// Restore original state
		context.restoreOffsets(savedOffsets);
		context.setCurrentNode(savedNode);
	}

	// NEW: Skip blank lines using context
	private skipBlankLinesInContext(context: ParsingContext): void {
		const savedOffset = context.saveOffsets();

		while (!context.isAtBlockEnd()) {
			const fragment = context.currentFragment();
			if (fragment.length === 0) break;

			// Skip whitespace
			let i = 0;
			while (
				i < fragment.length &&
				(fragment[i] === " " || fragment[i] === "\t")
			) {
				i++;
			}

			// Check for line ending (blank line)
			if (
				i < fragment.length &&
				(fragment[i] === "\n" || fragment[i] === "\r")
			) {
				// Handle CRLF
				if (
					fragment[i] === "\r" &&
					i + 1 < fragment.length &&
					fragment[i + 1] === "\n"
				) {
					context.advanceOffset(i + 2);
				} else {
					context.advanceOffset(i + 1);
				}
				continue;
			}

			// Not a blank line - restore and break
			context.restoreOffsets(savedOffset);
			break;
		}
	}

	findBlockEnd(text: string, startOffset: number): number {
		// Find the next blank line (double newline)
		let pos = startOffset;

		while (pos < text.length) {
			// Look for "\n\n" or "\n\r\n"
			const newline1 = text.indexOf("\n", pos);
			if (newline1 === -1) break;

			const newline2 = text.indexOf("\n", newline1 + 1);
			if (newline2 === -1) {
				// End of text
				return text.length;
			}

			// Check if there's only whitespace between
			const between = text.slice(newline1 + 1, newline2);
			if (between.trim() === "") {
				return newline1;
			}

			pos = newline2;
		}

		return text.length;
	}

	// Find the end of a blockquote, including lines separated by blank lines
	findBlockquoteEnd(text: string, startOffset: number): number {
		let pos = startOffset;

		while (pos < text.length) {
			// Find the next newline
			const newline = text.indexOf("\n", pos);
			if (newline === -1) {
				// End of text
				return text.length;
			}

			// Check if the line after this newline starts with >
			const nextLineStart = newline + 1;
			if (nextLineStart >= text.length) {
				return text.length;
			}

			// Skip whitespace at start of next line
			let checkPos = nextLineStart;
			while (
				checkPos < text.length &&
				(text[checkPos] === " " || text[checkPos] === "\t")
			) {
				checkPos++;
			}

			// If next non-whitespace char is >, this is a continuation
			if (checkPos < text.length && text[checkPos] === ">") {
				// Continue scanning from the continuation line
				pos = nextLineStart;
				continue;
			}

			// Check if this is a blank line (could be paragraph separator within blockquote)
			// Look ahead to see if there's a blockquote line after the blank line
			if (checkPos < text.length && text[checkPos] !== "\n") {
				// Next line has content but doesn't start with >
				// This is where the blockquote ends
				return newline;
			}

			// Next line is blank or end of text
			// Look for next non-blank line
			let searchPos = nextLineStart;
			while (searchPos < text.length) {
				const nextNewline = text.indexOf("\n", searchPos);
				const line =
					nextNewline === -1
						? text.slice(searchPos)
						: text.slice(searchPos, nextNewline);

				const trimmed = line.trimStart();
				if (trimmed.startsWith(">")) {
					// Found continuation after blank line, continue scanning
					pos = searchPos;
					break;
				}
				if (trimmed !== "") {
					// Found non-blank, non-blockquote line - blockquote ends here
					return newline;
				}
				// Skip blank line
				if (nextNewline === -1) {
					return text.length;
				}
				searchPos = nextNewline + 1;
			}

			if (searchPos >= text.length) {
				return text.length;
			}
		}

		return text.length;
	}

	isBlankLine(text: string, offset: number): boolean {
		// Check if line at offset is blank (only whitespace)
		let pos = offset;
		while (pos < text.length && text[pos] !== "\n") {
			if (text[pos] !== " " && text[pos] !== "\t" && text[pos] !== "\r") {
				return false;
			}
			pos++;
		}
		return true;
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { BlockParsingEngine };

// EOF
