// Main TextoParser class

import { Document, Node } from './utils/types.ts';
import { DocumentBuilder } from './document/builder.ts';
import { ParsingContext } from './parsing/context.ts';
import { ParserRegistry } from './parsing/registry.ts';
import { BlockParsingEngine } from './parsing/block.ts';
import { InlineParsingEngine } from './parsing/inline.ts';
import { Cursor } from './utils/cursor.ts';

// Block parsers
import { ParagraphParser } from './parsers/block/paragraph.ts';
import { SectionParser } from './parsers/block/section.ts';
import { ListParser } from './parsers/block/list.ts';
import { DefinitionListParser } from './parsers/block/definition-list.ts';
import { TaggedBlockParser } from './parsers/block/tagged.ts';
import { FencedBlockParser } from './parsers/block/fenced.ts';
import { IndentedPreBlockParser } from './parsers/block/indented-pre.ts';

// Inline parsers
import { EmphasisParser } from './parsers/inline/emphasis.ts';

export interface ParserOptions {
  blockParsers?: BlockParser[];
  inlineParsers?: InlineParser[];
  enableOffsets?: boolean;
  tabSize?: number;
}

import type { BlockParser } from './parsers/block/base.ts';
import type { InlineParser } from './parsers/inline/base.ts';

export class TextoParser {
  private blockRegistry: ParserRegistry<BlockParser>;
  private inlineRegistry: ParserRegistry<InlineParser>;
  private defaultBlockParser: BlockParser;
  private blockEngine: BlockParsingEngine;
  private inlineEngine: InlineParsingEngine;
  private options: ParserOptions;

  constructor(options: ParserOptions = {}) {
    this.options = options;
    
    // Initialize registries
    this.blockRegistry = new ParserRegistry<BlockParser>();
    this.inlineRegistry = new ParserRegistry<InlineParser>();
    
    // Set default parsers
    this.defaultBlockParser = new ParagraphParser();
    
    // Register default parsers
    this.registerDefaultParsers();
    
    // Create engines
    this.blockEngine = new BlockParsingEngine(
      this.blockRegistry,
      this.defaultBlockParser
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
    const builder = new DocumentBuilder();
    const context = new ParsingContext(builder, input);
    context.setText(input);
    context.setCurrentBlock(0, input.length);

    // Use the new recursive block parsing
    this.parseBlocksInRange(context, builder.getDocument().content, 0, input.length);

    // Clean up empty nodes
    builder.normalizeEmptyNodes();

    return builder.getDocument();
  }

  // NEW: Parse blocks within a specific range (for recursive parsing)
  parseBlocksInRange(
    context: ParsingContext,
    parentNode: Node,
    startOffset: number,
    endOffset: number
  ): void {
    const savedOffsets = context.saveOffsets();
    const savedNode = context.getCurrentNode();

    // Set new block range
    context.setCurrentBlock(startOffset, endOffset);
    context.setCurrentNode(parentNode);

    // Parse all blocks in this range
    let iterations = 0;
    const maxIterations = (endOffset - startOffset) + 100;

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
        if (char === ' ' || char === '\t') {
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
      
      if (char === '\n') {
        // This is the end of a potentially blank line
        // Advance past the newline
        context.advanceOffset(1);
        
        // Continue the loop to check if there are more blank lines
        continue;
      }

      // There's actual content on this line - restore to start of line and stop
      context.restoreOffsets(savedOffset);
      return;
    }
  }

  parseInlines(text: string, parent: Node, context: ParsingContext, baseOffset: number = 0): void {
    const cursor = new Cursor(text);
    this.inlineEngine.parseInlines(
      cursor,
      context,
      parent,
      text.length,
      baseOffset
    );
  }

  private skipBlankLines(cursor: Cursor): void {
    while (!cursor.isAtEnd()) {
      const save = cursor.clone();
      
      // Skip whitespace on current line
      while (cursor.current() === ' ' || cursor.current() === '\t') {
        cursor.advance();
      }
      
      // Check for blank line (empty line or just whitespace followed by newline)
      if (cursor.current() === '\n') {
        cursor.advance(); // consume the newline
        continue;
      }
      
      // Not a blank line
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      break;
    }
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
export { DocumentBuilder } from './document/builder.ts';
export { ParsingContext } from './parsing/context.ts';
export { ParserRegistry } from './parsing/registry.ts';
export { Cursor } from './utils/cursor.ts';
export * from './utils/types.ts';
