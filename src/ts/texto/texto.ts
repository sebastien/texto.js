// Main TextoParser class

import { DocumentBuilder } from "./document/builder.ts";
import { DefinitionListParser } from "./parsers/block/definition-list.ts";
import { FencedBlockParser } from "./parsers/block/fenced.ts";
import { IndentedPreBlockParser } from "./parsers/block/indented-pre.ts";
import { ListParser } from "./parsers/block/list.ts";
// Block parsers
import { ParagraphParser } from "./parsers/block/paragraph.ts";
import { SectionParser } from "./parsers/block/section.ts";
import { TaggedBlockParser } from "./parsers/block/tagged.ts";
// Inline parsers
import { EmphasisParser } from "./parsers/inline/emphasis.ts";
import { BlockParsingEngine } from "./parsing/block.ts";
import { ParsingContext } from "./parsing/context.ts";
import { InlineParsingEngine } from "./parsing/inline.ts";
import { PhaseRegistry } from "./parsing/phases/registry.ts";
import type { PreParsePhase } from "./parsing/phases/types.ts";
import { ParserRegistry } from "./parsing/registry.ts";
import { Cursor } from "./utils/cursor.ts";
import type { Document, Node } from "./utils/types.ts";

export interface ParserOptions {
	blockParsers?: BlockParser[];
	inlineParsers?: InlineParser[];
	/** Pre-parse phases to run before main parsing (e.g., reference collection) */
	preParsePhases?: PreParsePhase[];
	enableOffsets?: boolean;
	tabSize?: number;
}

import type { BlockParser } from "./parsers/block/base.ts";
import type { InlineParser } from "./parsers/inline/base.ts";

export class TextoParser {
	private blockRegistry: ParserRegistry<BlockParser>;
	private inlineRegistry: ParserRegistry<InlineParser>;
	private defaultBlockParser: BlockParser;
	private blockEngine: BlockParsingEngine;
	private inlineEngine: InlineParsingEngine;
	/** Phase registry for pre-parse, inline, and post-parse phases */
	protected phaseRegistry: PhaseRegistry;

	constructor(options: ParserOptions = {}) {
		// Initialize registries
		this.blockRegistry = new ParserRegistry<BlockParser>();
		this.inlineRegistry = new ParserRegistry<InlineParser>();
		this.phaseRegistry = new PhaseRegistry();

		// Set default parsers
		this.defaultBlockParser = new ParagraphParser();

		// Register default parsers
		this.registerDefaultParsers();

		// Register phases from options
		if (options.preParsePhases) {
			for (const phase of options.preParsePhases) {
				this.phaseRegistry.register(phase);
			}
		}

		// Create engines
		this.blockEngine = new BlockParsingEngine(
			this.blockRegistry,
			this.defaultBlockParser,
		);
		this.inlineEngine = new InlineParsingEngine(this.inlineRegistry);

		// Register custom parsers from options
		if (options.blockParsers) {
			for (const parser of options.blockParsers) {
				this.blockRegistry.register(parser, parser.priority);
			}
		}

		if (options.inlineParsers) {
			for (const parser of options.inlineParsers) {
				this.inlineRegistry.register(parser, parser.priority);
			}
		}
	}

	private registerDefaultParsers(): void {
		// Register default block parsers
		this.blockRegistry.register(new TaggedBlockParser(), 12);
		this.blockRegistry.register(new FencedBlockParser(), 18); // Fenced pre blocks (preferred)
		this.blockRegistry.register(new IndentedPreBlockParser(), 19); // Old-style indented pre blocks
		this.blockRegistry.register(new SectionParser(), 25);
		this.blockRegistry.register(new DefinitionListParser(), 32);
		this.blockRegistry.register(new ListParser(), 35);
		// Add more as implemented...

		// Register default inline parsers
		this.inlineRegistry.register(new EmphasisParser(), 35);
		// Add more as implemented...
	}

	parse(input: string): Document {
		// Create document position spanning the entire input
		const documentPosition = {
			start: 0,
			end: input.length,
			line: 1,
			column: 0,
		};
		const builder = new DocumentBuilder(documentPosition);
		const context = new ParsingContext(builder, input);
		context.setText(input);
		context.setParser(this);
		context.setCurrentBlock(0, input.length);

		// Execute pre-parse phases (e.g., reference collection)
		// This allows metadata to be gathered before main parsing
		const preParsePhases = this.phaseRegistry.getPreParsePhases();
		for (const phase of preParsePhases) {
			const result = phase.execute(input, context, builder.getDocument());
			if (result?.data) {
				// Merge phase data into context for use by subsequent phases
				for (const [key, value] of result.data) {
					// Store in context's keyIndex for access during parsing
					context.keyIndex.set(`phase.${phase.name}.${key}`, value as Node);
				}
			}
			if (result?.continue === false) {
				break;
			}
		}

		// Use the new recursive block parsing
		this.parseBlocksInRange(
			context,
			builder.getDocument().content,
			0,
			input.length,
		);

		// Clean up empty nodes
		builder.normalizeEmptyNodes();

		return builder.getDocument();
	}

	// NEW: Parse blocks within a specific range (for recursive parsing)
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

			// Process next block using the engine
			const result = this.blockEngine.processBlockAt(context);

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
		while (!context.isAtBlockEnd()) {
			const savedOffset = context.saveOffsets();

			// Skip whitespace on current line
			while (!context.isAtBlockEnd()) {
				const char = context.currentFragment()[0];
				if (char === " " || char === "\t") {
					context.advanceOffset(1);
				} else {
					break;
				}
			}

			// Check if we've reached the end of the line (newline or end of block)
			if (context.isAtBlockEnd()) {
				// End of block - we're done
				return;
			}

			const char = context.currentFragment()[0];

			if (char === "\n" || char === "\r") {
				// This is the end of a potentially blank line
				// Advance past the line ending
				context.advanceOffset(1);

				// For CRLF (\r\n), also skip the \n
				if (char === "\r" && !context.isAtBlockEnd()) {
					const nextChar = context.currentFragment()[0];
					if (nextChar === "\n") {
						context.advanceOffset(1);
					}
				}

				// Continue the loop to check if there are more blank lines
				continue;
			}

			// There's actual content on this line - restore to start of line and stop
			context.restoreOffsets(savedOffset);
			return;
		}
	}

	parseInlines(
		text: string,
		parent: Node,
		context: ParsingContext,
		baseOffset: number = 0,
	): void {
		// Inject pre-collected references into context for link resolution
		// The reference collection phase stores data in context.keyIndex
		const phaseData = context.keyIndex.get(
			"phase.reference-collection.references",
		);
		if (phaseData && "entries" in phaseData) {
			// This is a Map of references - convert to target entries
			const refMap = phaseData as Map<
				string,
				{ url: string; title: string; line: number }
			>;
			for (const [label, { url, title }] of refMap) {
				// Create synthetic target node for reference lookup
				const targetNode = {
					type: "element" as const,
					name: "target",
					attributes: new Map([
						["name", label],
						["target", url],
						["title", title],
					]),
					children: [],
					position: { start: 0, end: 0, line: 0, column: 0 },
				};
				context.addTarget(targetNode, label);
			}
		}

		const cursor = new Cursor(text);
		this.inlineEngine.parseInlines(
			cursor,
			context,
			parent,
			text.length,
			baseOffset,
		);
	}

	// Factory method for block parsers
	createBlockRegistry(): ParserRegistry<BlockParser> {
		return new ParserRegistry<BlockParser>();
	}

	// Factory method for inline parsers
	createInlineRegistry(): ParserRegistry<InlineParser> {
		return new ParserRegistry<InlineParser>();
	}
}

// Re-export types and classes
export { DocumentBuilder } from "./document/builder.ts";
export { ParsingContext } from "./parsing/context.ts";
export { ParserRegistry } from "./parsing/registry.ts";
export { Cursor } from "./utils/cursor.ts";
export * from "./utils/types.ts";
