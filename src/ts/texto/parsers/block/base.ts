// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/block/base
// Implements the parsers/block/base module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Base BlockParser interface

import type { BlockParsingEngine } from "../../parsing/block.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";

interface BlockParser {
	readonly name: string;
	readonly priority: number;

	recognises(cursor: Cursor, context: ParsingContext): RecognitionInfo | null;

	process(
		cursor: Cursor,
		context: ParsingContext,
		info: RecognitionInfo,
		engine?: BlockParsingEngine, // NEW: Optional engine for recursive parsing
	): BlockResult;
}

abstract class BaseBlockParser implements BlockParser {
	readonly name: string;
	readonly priority: number;

	constructor(name: string, priority: number = 20) {
		this.name = name;
		this.priority = priority;
	}

	abstract recognises(
		cursor: Cursor,
		context: ParsingContext,
	): RecognitionInfo | null;

	abstract process(
		cursor: Cursor,
		context: ParsingContext,
		info: RecognitionInfo,
		engine?: BlockParsingEngine,
	): BlockResult;

	protected skipLeadingWhitespace(cursor: Cursor): void {
		while (cursor.current() === " " || cursor.current() === "\t") {
			cursor.advance();
		}
	}

	protected isBlankLine(cursor: Cursor): boolean {
		const saved = cursor.clone();
		this.skipLeadingWhitespace(cursor);
		const result = cursor.current() === "\n" || cursor.current() === null;
		cursor.pos = saved.pos;
		cursor.lineNumber = saved.lineNumber;
		cursor.columnNumber = saved.columnNumber;
		return result;
	}
}

export type { BlockParser };
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { BaseBlockParser };

// EOF
