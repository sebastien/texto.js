// Markdown parser profile
// Configures a TextoParser for standard Markdown parsing

import { MarkdownParser } from "../parsers/markdown-parser.ts";
import { FencedBlockParser } from "../parsers/block/fenced.ts";
import { HeaderParser } from "../parsers/block/header.ts";
import { ListParser } from "../parsers/block/list.ts";
import { ParagraphParser } from "../parsers/block/paragraph.ts";
import { BlockquoteParser } from "../parsers/block/blockquote.ts";
import { IndentedCodeParser } from "../parsers/block/indented-code.ts";
import { HorizontalRuleParser } from "../parsers/block/horizontal-rule.ts";
import { ReferenceDefinitionParser } from "../parsers/block/reference-definition.ts";
import { EmphasisParser } from "../parsers/inline/emphasis.ts";
import { CodeParser } from "../parsers/inline/code.ts";
import { LinkParser } from "../parsers/inline/link.ts";
import { ImageParser } from "../parsers/inline/image.ts";
import { EscapeParser } from "../parsers/inline/escape.ts";
import { TextParser } from "../parsers/inline/text.ts";
import type { BlockParser } from "../parsers/block/base.ts";
import type { InlineParser } from "../parsers/inline/base.ts";

/**
 * Options for configuring the Markdown parser profile.
 */
export interface MarkdownProfileOptions {
	/** Additional block parsers to include */
	extraBlockParsers?: BlockParser[];
	/** Additional inline parsers to include */
	extraInlineParsers?: InlineParser[];
	/** Whether to enable fenced code blocks (```). Defaults to true. */
	enableFencedCode?: boolean;
}

/**
 * Creates a Markdown parser with full support for standard Markdown syntax.
 *
 * Features:
 * - Headers (hash # and underline === ---)
 * - Blockquotes (>)
 * - Lists (ordered 1. and unordered - *)
 * - Code blocks (indented 4 spaces and fenced ```)
 * - Horizontal rules (--- *** ___)
 * - Links ([text](url) and [text][ref] with definitions)
 * - Images (![alt](url) and ![alt][ref])
 * - Emphasis (*italic* and **bold**)
 * - Inline code (`code`)
 * - Backslash escapes (\* \_ \` etc.)
 * - Reference definitions ([ref]: url "title")
 *
 * @param options - Configuration options for the Markdown parser
 * @returns A configured MarkdownParser instance for Markdown
 */
export function createMarkdownParser(
	options: MarkdownProfileOptions = {},
): MarkdownParser {
	// Block parsers in priority order (lower number = higher priority)
	// ListParser must come BEFORE SectionParser (priority 25) to avoid
	// "1." being matched as a section number instead of a list item
	const blockParsers: BlockParser[] = [
		new HorizontalRuleParser(), // Priority: 10
		new HeaderParser(), // Priority: 25 (handles # headers and underline)
		new ListParser({
			priority: 24,
			stripContinuationIndent: false,
			orderedMarker: ".",
			includeBoundaryBlankLine: true,
		}), // Priority: 24 (handles -, *, 1. lists - must be before SectionParser)
		new BlockquoteParser(), // Priority: 28
		new ReferenceDefinitionParser(), // Priority: 38 ([ref]: url)
		new IndentedCodeParser(), // Priority: 20 (4-space indented)
		new ParagraphParser(), // Priority: 50 (fallback)
	];

	// Add fenced code blocks if enabled (covers extensions)
	if (options.enableFencedCode !== false) {
		blockParsers.unshift(new FencedBlockParser()); // Priority: 18
	}

	// Merge extra block parsers
	if (options.extraBlockParsers) {
		blockParsers.push(...options.extraBlockParsers);
	}

	// Inline parsers in priority order
	// Parsers are sorted by priority, lower numbers run first
	const inlineParsers: InlineParser[] = [
		new EscapeParser(), // Priority: 5 (backslash escapes)
		new LinkParser(), // Priority: 15 ([text](url) and [text][ref])
		new ImageParser(), // Priority: 15 (![alt](url) and ![alt][ref])
		new CodeParser(), // Priority: 25 (`inline code`)
		new EmphasisParser(), // Priority: 35 (*italic* and **bold**)
		new TextParser(), // Priority: 100 (fallback)
	];

	// Merge extra inline parsers
	if (options.extraInlineParsers) {
		inlineParsers.push(...options.extraInlineParsers);
	}

	return new MarkdownParser({ blockParsers, inlineParsers });
}
