// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/block/definition-list
// Implements the parsers/block/definition-list module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Definition list block parser
// Handles syntax: Term:: followed by indented definition

import { createElement, createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, Node, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

class DefinitionListParser extends BaseBlockParser {
	constructor() {
		super("definition-list", BLOCK_PRIORITIES.DEFINITION);
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Pattern: text followed by :: at end of line (or only whitespace after)
		// The :: must be followed by end of line or whitespace-then-end-of-line
		// This excludes cases like "jsx::ref=page" where :: is in the middle
		let hasTermContent = false;

		while (cursor.current() !== null && cursor.current() !== "\n") {
			// Check for :: pattern
			if (cursor.current() === ":" && cursor.peek(1) === ":") {
				// Make sure it's not ::: (three colons)
				if (cursor.peek(2) !== ":") {
					// Move past the ::
					cursor.advance(2);

					// Check what comes after :: - must be only whitespace until end of line
					let onlyWhitespaceAfter = true;
					while (cursor.current() !== null && cursor.current() !== "\n") {
						if (cursor.current() !== " " && cursor.current() !== "\t") {
							onlyWhitespaceAfter = false;
							break;
						}
						cursor.advance();
					}

					if (hasTermContent && onlyWhitespaceAfter) {
						cursor.pos = save.pos;
						cursor.lineNumber = save.lineNumber;
						cursor.columnNumber = save.columnNumber;
						return { type: "definition-list" };
					}

					// Not a match - reset and break
					break;
				}
			}

			if (
				cursor.current() !== " " &&
				cursor.current() !== "\t" &&
				cursor.current() !== ":"
			) {
				hasTermContent = true;
			}
			cursor.advance();
		}

		// No match
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;
		return null;
	}

	process(
		cursor: Cursor,
		context: ParsingContext,
		_info: RecognitionInfo,
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;
		const startIndent = this.countIndent(cursor);

		// Create definition list node (position will be updated at the end)
		const listNode = context.builder.createAndAppend(
			"list",
			{},
			{ start, end: start, line: startLine, column: startColumn },
		);
		listNode.attributes.set("type", "definition");
		listNode.attributes.set("_indent", String(startIndent));

		context.builder.pushNode(listNode);

		// Process all definition items
		let iterations = 0;
		const maxIterations = 50;

		while (!cursor.isAtEnd() && iterations < maxIterations) {
			iterations++;

			const itemInfo = this.recognises(cursor, context);
			if (!itemInfo) break;

			this.processItem(cursor, context);

			// Skip blank lines between items
			cursor.skipNewlines();
		}

		const end = cursor.pos;
		// Update list node position to include all items
		listNode.position = { start, end, line: startLine, column: startColumn };

		context.builder.popNode();

		return {
			consumed: end - start,
			node: listNode,
		};
	}

	private processItem(cursor: Cursor, context: ParsingContext): Node {
		const itemStart = cursor.pos;
		const itemStartLine = cursor.lineNumber;
		const itemStartColumn = cursor.columnNumber;
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);
		const itemIndent = cursor.pos - save.pos;

		// Read term (everything before ::)
		let term = "";
		const termStart = cursor.pos;
		const termStartLine = cursor.lineNumber;
		const termStartColumn = cursor.columnNumber;
		while (
			cursor.current() !== null &&
			cursor.current() !== "\n" &&
			!(
				cursor.current() === ":" &&
				cursor.peek(1) === ":" &&
				cursor.peek(2) !== ":"
			)
		) {
			term += cursor.current();
			cursor.advance();
		}
		term = term.trim();
		const termEnd = cursor.pos;

		// Skip :: marker
		if (cursor.current() === ":" && cursor.peek(1) === ":") {
			cursor.advance(2);
		}

		// Skip whitespace after :: on same line (for "Term:: content" format)
		while (cursor.current() === " " || cursor.current() === "\t") {
			cursor.advance();
		}

		// If we're at a newline, skip all blank lines until we hit content
		// This handles "Term::\n\n  content" format
		if (cursor.current() === "\n") {
			cursor.skipNewlines();
		}

		// Create item node with position (will be updated at the end)
		const itemNode = context.builder.createAndAppend(
			"item",
			{},
			{
				start: itemStart,
				end: itemStart,
				line: itemStartLine,
				column: itemStartColumn,
			},
		);
		itemNode.attributes.set("_indent", String(itemIndent));

		context.builder.pushNode(itemNode);

		// Create term node with position
		const termNode = createElement(
			"term",
			{},
			{
				start: termStart,
				end: termEnd,
				line: termStartLine,
				column: termStartColumn,
			},
		);
		termNode.children.push(
			createText(term, {
				start: termStart,
				end: termEnd,
				line: termStartLine,
				column: termStartColumn,
			}),
		);
		itemNode.children.push(termNode);

		// Read definition content - everything that's indented more than the term
		// until we hit another definition term or end of list or unindented content
		let definition = "";
		const defStart = cursor.pos;
		let defIterations = 0;
		const maxDefIterations = 50;

		while (!cursor.isAtEnd() && defIterations < maxDefIterations) {
			defIterations++;

			// Save position at start of potential definition line
			const lineStartSave = cursor.clone();

			// Count indentation of current line
			const currentIndent = this.countIndent(cursor);

			// If not indented at all, check if it's a new definition term
			if (currentIndent <= itemIndent) {
				// Check if this is a new definition term
				if (this.recognises(cursor, context)) {
					// New term - end this definition
					break;
				}

				// Not indented and not a term - end of definition list
				cursor.pos = lineStartSave.pos;
				cursor.lineNumber = lineStartSave.lineNumber;
				cursor.columnNumber = lineStartSave.columnNumber;
				break;
			}

			// This line is indented - it's part of the definition
			// Restore cursor and read the line
			cursor.pos = lineStartSave.pos;
			cursor.lineNumber = lineStartSave.lineNumber;
			cursor.columnNumber = lineStartSave.columnNumber;

			const line = cursor.readLine();

			// Move past the line ending (readLine stops before newline characters)
			if (cursor.current() === "\r") {
				cursor.advance();
				if (cursor.current() === "\n") {
					cursor.advance();
				}
			} else if (cursor.current() === "\n") {
				cursor.advance();
			}

			// Remove the base indentation from the line
			if (currentIndent > itemIndent) {
				definition += line.slice(currentIndent);
			} else {
				definition += line.trim();
			}

			if (cursor.isAtEnd()) break;

			// Add newline for next line
			definition += "\n";
		}

		const itemEnd = cursor.pos;

		// Update item node position
		itemNode.position = {
			start: itemStart,
			end: itemEnd,
			line: itemStartLine,
			column: itemStartColumn,
		};

		// Create definition node if we have content
		definition = context.normaliseText(definition).trim();
		if (definition) {
			const defEnd = Math.min(defStart + definition.length, itemEnd);
			const defStartLine = cursor.lineNumber;
			const defStartColumn = cursor.columnNumber;
			const defNode = createElement(
				"definition",
				{},
				{
					start: defStart,
					end: defEnd,
					line: defStartLine,
					column: defStartColumn,
				},
			);
			defNode.children.push(
				createText(definition, {
					start: defStart,
					end: defEnd,
					line: defStartLine,
					column: defStartColumn,
				}),
			);
			itemNode.children.push(defNode);
		}

		context.builder.popNode();
		return itemNode;
	}

	private countIndent(cursor: Cursor): number {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);
		const indent = cursor.pos - save.pos;
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;
		return indent;
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { DefinitionListParser };

// EOF
