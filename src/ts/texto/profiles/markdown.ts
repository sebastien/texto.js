// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/profiles/markdown
// Provides a markdown profile that assembles block and inline parsers tuned for
// CommonMark-style authoring with optional extensions.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Markdown parser profile
// Configures a TextoParser for standard Markdown parsing

import type { BlockParser } from "../parsers/block/base.ts";
import { BlockquoteParser } from "../parsers/block/blockquote.ts";
import { FencedBlockParser } from "../parsers/block/fenced.ts";
import { HeaderParser } from "../parsers/block/header.ts";
import { HorizontalRuleParser } from "../parsers/block/horizontal-rule.ts";
import { IndentedCodeParser } from "../parsers/block/indented-code.ts";
import { ListParser } from "../parsers/block/list.ts";
import { ParagraphParser } from "../parsers/block/paragraph.ts";
import { ReferenceDefinitionParser } from "../parsers/block/reference-definition.ts";
import type { InlineParser } from "../parsers/inline/base.ts";
import { CodeParser } from "../parsers/inline/code.ts";
import { EmphasisParser } from "../parsers/inline/emphasis.ts";
import { EscapeParser } from "../parsers/inline/escape.ts";
import { ImageParser } from "../parsers/inline/image.ts";
import { LinkParser } from "../parsers/inline/link.ts";
import { TextParser } from "../parsers/inline/text.ts";
import { MarkdownParser } from "../parsers/markdown-parser.ts";
import { BLOCK_PRIORITIES, INLINE_PRIORITIES } from "../parsing/priority.ts";

// Type: MarkdownProfileOptions
// Configures optional parser additions and markdown profile features.
// - extraBlockParsers: BlockParser[] | undefined - Extra block parsers appended to defaults.
// - extraInlineParsers: InlineParser[] | undefined - Extra inline parsers appended to defaults.
// - enableFencedCode: boolean | undefined - Enables fenced-code parsing when not false.
interface MarkdownProfileOptions {
	extraBlockParsers?: BlockParser[];
	extraInlineParsers?: InlineParser[];
	enableFencedCode?: boolean;
}

// Function: createMarkdownParser
// Factory that returns a `MarkdownParser` using the markdown profile and `options`.
//
// Example:
// ```typescript
// const parser = createMarkdownParser({ enableFencedCode: true });
// const doc = parser.parse("# Hello\n\nParagraph");
// ```
function createMarkdownParser(
	options: MarkdownProfileOptions = {},
): MarkdownParser {
	// Block parsers in priority order (lower number = higher priority)
	// ListParser must come BEFORE SectionParser (BLOCK_PRIORITIES.SECTION) to avoid
	// "1." being matched as a section number instead of a list item
	const blockParsers: BlockParser[] = [
		new HorizontalRuleParser(), // BLOCK_PRIORITIES.SEPARATOR + 2
		new HeaderParser(), // BLOCK_PRIORITIES.SECTION - 1 (handles # headers and underline)
		new ListParser({
			priority: BLOCK_PRIORITIES.SECTION - 1,
			stripContinuationIndent: false,
			orderedMarker: ".",
			includeBoundaryBlankLine: true,
		}), // (handles -, *, 1. lists - must be before SectionParser)
		new BlockquoteParser(), // BLOCK_PRIORITIES.TABLE + 1
		new ReferenceDefinitionParser(), // BLOCK_PRIORITIES.REFERENCE ([ref]: url)
		new IndentedCodeParser(), // BLOCK_PRIORITIES.PRE + 2 (4-space indented)
		new ParagraphParser(), // BLOCK_PRIORITIES.PARAGRAPH (fallback)
	];

	// Add fenced code blocks if enabled (covers extensions)
	if (options.enableFencedCode !== false) {
		blockParsers.unshift(new FencedBlockParser()); // BLOCK_PRIORITIES.PRE
	}

	// Merge extra block parsers
	if (options.extraBlockParsers) {
		blockParsers.push(...options.extraBlockParsers);
	}

	// Inline parsers in priority order
	// Parsers are sorted by priority, lower numbers run first
	const inlineParsers: InlineParser[] = [
		new EscapeParser(), // INLINE_PRIORITIES.ESCAPED (backslash escapes)
		new LinkParser(), // INLINE_PRIORITIES.LINK ([text](url) and [text][ref])
		new ImageParser(), // INLINE_PRIORITIES.LINK (![alt](url) and ![alt][ref])
		new CodeParser(), // INLINE_PRIORITIES.CODE (`inline code`)
		new EmphasisParser(), // INLINE_PRIORITIES.EMPHASIS (*italic* and **bold**)
		new TextParser(), // INLINE_PRIORITIES.TEXT (fallback)
	];

	// Merge extra inline parsers
	if (options.extraInlineParsers) {
		inlineParsers.push(...options.extraInlineParsers);
	}

	return new MarkdownParser({ blockParsers, inlineParsers });
}

export type { MarkdownProfileOptions };
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { createMarkdownParser };

// EOF
