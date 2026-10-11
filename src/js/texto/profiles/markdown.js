import { BlockquoteParser } from "../parsers/block/blockquote.js";
import { FencedBlockParser } from "../parsers/block/fenced.js";
import { HeaderParser } from "../parsers/block/header.js";
import { HorizontalRuleParser } from "../parsers/block/horizontal-rule.js";
import { IndentedCodeParser } from "../parsers/block/indented-code.js";
import { ListParser } from "../parsers/block/list.js";
import { ParagraphParser } from "../parsers/block/paragraph.js";
import { ReferenceDefinitionParser } from "../parsers/block/reference-definition.js";
import { CodeParser } from "../parsers/inline/code.js";
import { EmphasisParser } from "../parsers/inline/emphasis.js";
import { EscapeParser } from "../parsers/inline/escape.js";
import { ImageParser } from "../parsers/inline/image.js";
import { LinkParser } from "../parsers/inline/link.js";
import { TextParser } from "../parsers/inline/text.js";
import { MarkdownParser } from "../parsers/markdown-parser.js";
import { BLOCK_PRIORITIES } from "../parsing/priority.js";
function createMarkdownParser(options = {}) {
  const blockParsers = [
    new HorizontalRuleParser,
    new HeaderParser,
    new ListParser({
      priority: BLOCK_PRIORITIES.SECTION - 1,
      stripContinuationIndent: false,
      orderedMarker: ".",
      includeBoundaryBlankLine: true
    }),
    new BlockquoteParser,
    new ReferenceDefinitionParser,
    new IndentedCodeParser,
    new ParagraphParser
  ];
  if (options.enableFencedCode !== false) {
    blockParsers.unshift(new FencedBlockParser);
  }
  if (options.extraBlockParsers) {
    blockParsers.push(...options.extraBlockParsers);
  }
  const inlineParsers = [
    new EscapeParser,
    new LinkParser,
    new ImageParser,
    new CodeParser,
    new EmphasisParser,
    new TextParser
  ];
  if (options.extraInlineParsers) {
    inlineParsers.push(...options.extraInlineParsers);
  }
  return new MarkdownParser({ blockParsers, inlineParsers });
}

export { createMarkdownParser };
