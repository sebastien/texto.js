// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/inline/base
// Implements the parsers/inline/base module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Base InlineParser interface

import type { ParsingContext } from "../../parsing/context.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { InlineMatch, Node, Position } from "../../utils/types.ts";

interface InlineParser {
	readonly name: string;
	readonly priority: number;

	findNext(cursor: Cursor, context: ParsingContext): InlineMatch | null;

	parse(cursor: Cursor, context: ParsingContext, match: InlineMatch): number;
}

abstract class BaseInlineParser implements InlineParser {
	readonly name: string;
	readonly priority: number;

	constructor(name: string, priority: number = 20) {
		this.name = name;
		this.priority = priority;
	}

	abstract findNext(
		cursor: Cursor,
		context: ParsingContext,
	): InlineMatch | null;

	abstract parse(
		cursor: Cursor,
		context: ParsingContext,
		match: InlineMatch,
	): number;

	protected createInlineNode(
		tagName: string,
		content: string,
		context: ParsingContext,
		position?: Position,
		contentPosition?: Position,
	): Node {
		const node = context.builder.createAndAppend(tagName, {}, position);
		if (content) {
			const textNode = context.builder.addText(content, contentPosition);
			node.children.push(textNode);
		}
		return node;
	}
}

export type { InlineParser };
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { BaseInlineParser };

// EOF
