import { DocumentBuilder } from "./document/builder.js";
import { createElement, resetNodeIdCounter } from "./document/node.js";
import { DefinitionListParser } from "./parsers/block/definition-list.js";
import { FencedBlockParser } from "./parsers/block/fenced.js";
import { IndentedPreBlockParser } from "./parsers/block/indented-pre.js";
import { ListParser } from "./parsers/block/list.js";
import { ParagraphParser } from "./parsers/block/paragraph.js";
import { ReferenceDefinitionParser } from "./parsers/block/reference-definition.js";
import { SectionParser } from "./parsers/block/section.js";
import { TaggedBlockParser } from "./parsers/block/tagged.js";
import { CodeParser } from "./parsers/inline/code.js";
import { EmphasisParser } from "./parsers/inline/emphasis.js";
import { LinkParser } from "./parsers/inline/link.js";
import { BlockParsingEngine } from "./parsing/block.js";
import { annotateBlockStructure } from "./parsing/block-structure.js";
import { ParsingContext } from "./parsing/context.js";
import { InlineParsingEngine } from "./parsing/inline.js";
import { ReferenceCollectionPhase } from "./parsing/phases/reference-collection.js";
import { PhaseRegistry } from "./parsing/phases/registry.js";
import { ParserRegistry } from "./parsing/registry.js";
import { BLOCK_PRIORITIES, INLINE_PRIORITIES } from "./parsing/priority.js";
import { Cursor } from "./utils/cursor.js";

class TextoParser {
  blockRegistry;
  inlineRegistry;
  defaultBlockParser;
  blockEngine;
  inlineEngine;
  phaseRegistry;
  constructor(options = {}) {
    this.blockRegistry = new ParserRegistry;
    this.inlineRegistry = new ParserRegistry;
    this.phaseRegistry = new PhaseRegistry;
    this.defaultBlockParser = new ParagraphParser;
    this.registerDefaultParsers();
    this.phaseRegistry.register(new ReferenceCollectionPhase);
    if (options.preParsePhases) {
      for (const phase of options.preParsePhases) {
        this.phaseRegistry.register(phase);
      }
    }
    this.blockEngine = new BlockParsingEngine(this.blockRegistry, this.defaultBlockParser);
    this.inlineEngine = new InlineParsingEngine(this.inlineRegistry);
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
  registerDefaultParsers() {
    this.blockRegistry.register(new TaggedBlockParser, BLOCK_PRIORITIES.TAGGED);
    this.blockRegistry.register(new FencedBlockParser, BLOCK_PRIORITIES.PRE);
    this.blockRegistry.register(new IndentedPreBlockParser, BLOCK_PRIORITIES.PRE + 1);
    this.blockRegistry.register(new SectionParser, BLOCK_PRIORITIES.SECTION);
    this.blockRegistry.register(new DefinitionListParser, BLOCK_PRIORITIES.DEFINITION);
    this.blockRegistry.register(new ReferenceDefinitionParser, BLOCK_PRIORITIES.REFERENCE);
    this.blockRegistry.register(new ListParser({
      stripContinuationIndent: true,
      orderedMarker: ")",
      includeBoundaryBlankLine: false
    }), BLOCK_PRIORITIES.LIST);
    this.inlineRegistry.register(new LinkParser, INLINE_PRIORITIES.LINK);
    this.inlineRegistry.register(new CodeParser, INLINE_PRIORITIES.CODE);
    this.inlineRegistry.register(new EmphasisParser, INLINE_PRIORITIES.EMPHASIS);
  }
  parse(input) {
    resetNodeIdCounter(1);
    const documentPosition = {
      start: 0,
      end: input.length,
      line: 1,
      column: 0
    };
    const builder = new DocumentBuilder(documentPosition);
    const context = new ParsingContext(builder, input);
    context.setText(input);
    context.setParser(this);
    context.setCurrentBlock(0, input.length);
    const preParsePhases = this.phaseRegistry.getPreParsePhases();
    for (const phase of preParsePhases) {
      const result = phase.execute(input, context, builder.getDocument());
      if (result?.data) {
        for (const [key, value] of result.data) {
          context.keyIndex.set(`phase.${phase.name}.${key}`, value);
        }
      }
      if (result?.continue === false) {
        break;
      }
    }
    this.parseBlocksInRange(context, builder.getDocument().content, 0, input.length);
    builder.normalizeEmptyNodes();
    annotateBlockStructure(builder.getDocument());
    return builder.getDocument();
  }
  parseBlocksInRange(context, parentNode, startOffset, endOffset) {
    const savedOffsets = context.saveOffsets();
    const savedNode = context.getCurrentNode();
    context.setCurrentBlock(startOffset, endOffset);
    context.setCurrentNode(parentNode);
    let iterations = 0;
    const maxIterations = endOffset - startOffset + 100;
    while (!context.isAtBlockEnd() && iterations < maxIterations) {
      iterations++;
      this.skipBlankLinesInContext(context);
      if (context.isAtBlockEnd())
        break;
      const offsetBefore = context.getOffset();
      const result = this.blockEngine.processBlockAt(context);
      if (result && result.consumed > 0) {
        context.setOffset(offsetBefore + result.consumed);
      } else {
        context.advanceOffset(1);
      }
    }
    context.restoreOffsets(savedOffsets);
    context.setCurrentNode(savedNode);
  }
  skipBlankLinesInContext(context) {
    while (!context.isAtBlockEnd()) {
      const savedOffset = context.saveOffsets();
      while (!context.isAtBlockEnd()) {
        const char = context.currentFragment()[0];
        if (char === " " || char === "\t") {
          context.advanceOffset(1);
        } else {
          break;
        }
      }
      if (context.isAtBlockEnd()) {
        return;
      }
      const char = context.currentFragment()[0];
      if (char === `
` || char === "\r") {
        context.advanceOffset(1);
        if (char === "\r" && !context.isAtBlockEnd()) {
          const nextChar = context.currentFragment()[0];
          if (nextChar === `
`) {
            context.advanceOffset(1);
          }
        }
        continue;
      }
      context.restoreOffsets(savedOffset);
      return;
    }
  }
  parseInlines(text, parent, context, baseOffset = 0) {
    const phaseData = context.keyIndex.get("phase.reference-collection.references");
    if (phaseData && "entries" in phaseData) {
      const refMap = phaseData;
      for (const [label, { url, title }] of refMap) {
        const targetNode = createElement("target", { name: label, target: url, title }, { start: 0, end: 0, line: 0, column: 0 });
        context.addTarget(targetNode, label);
      }
    }
    const cursor = new Cursor(text);
    this.inlineEngine.parseInlines(cursor, context, parent, text.length, baseOffset);
  }
  createBlockRegistry() {
    return new ParserRegistry;
  }
  createInlineRegistry() {
    return new ParserRegistry;
  }
}
export { DocumentBuilder } from "./document/builder.js";
export { ParsingContext } from "./parsing/context.js";
export { ParserRegistry } from "./parsing/registry.js";
export { Cursor } from "./utils/cursor.js";
export * from "./utils/types.js";
export { TextoParser };
