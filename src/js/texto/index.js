export {
  getAvailableBackends,
  htmlBackend,
  jsonBackend,
  markdownBackend,
  renderBackend,
  textoBackend,
  xmlBackend
} from "./backends/index.js";
export {
  deserializeDocument,
  formatJSON,
  toJSON
} from "./backends/json.js";
export { formatMarkdown } from "./backends/markdown.js";
export { formatTexto } from "./backends/texto.js";
import { renderBackend } from "./backends/index.js";
function format(doc, format, options = {}) {
  return renderBackend(doc, format, options);
}

export { format };
export {
  apply,
  delta,
  revert,
  setDiffEngine
} from "./delta.js";
export {
  DocumentBuilder
} from "./document/builder.js";
export {
  appendChild,
  createComment,
  createElement,
  createText,
  getAttribute,
  hasAttribute,
  isComment,
  isElement,
  isText,
  removeAttribute,
  resetNodeIdCounter,
  setAttribute
} from "./document/node.js";
export {
  findChild,
  findChildren,
  findDescendants,
  getChildren,
  getElementsByName,
  getFirstChild,
  getLastChild
} from "./document/tree.js";
import { markdownFrontend } from "./frontends/markdown.js";
import { textoFrontend } from "./frontends/texto.js";
import { Registry } from "./utils/registry.js";
export { markdownFrontend } from "./frontends/markdown.js";
export { textoFrontend } from "./frontends/texto.js";
const WEB_FRONTENDS = new Registry;
WEB_FRONTENDS.register("texto", textoFrontend);
WEB_FRONTENDS.register("markdown", markdownFrontend);
WEB_FRONTENDS.register("md", markdownFrontend);
function getAvailableFrontends() {
  return WEB_FRONTENDS.keys();
}
function parse(input, format, options = {}) {
  return parseFrontend(input, format, options);
}
function parseFrontend(input, format, options = {}) {
  const normalized = format.toLowerCase();
  const frontend = WEB_FRONTENDS.get(normalized);
  if (!frontend) {
    const available = getAvailableFrontends().join(", ");
    throw new Error(`Unknown input type: ${format}. Available frontends: ${available}`);
  }
  return frontend(input, options);
}

export { getAvailableFrontends, parse, parseFrontend };
export {
  BaseBlockParser
} from "./parsers/block/base.js";
export { BlockquoteParser } from "./parsers/block/blockquote.js";
export { FencedBlockParser } from "./parsers/block/fenced.js";
export { HeaderParser } from "./parsers/block/header.js";
export { HorizontalRuleParser } from "./parsers/block/horizontal-rule.js";
export { IndentedCodeParser } from "./parsers/block/indented-code.js";
export { IndentedPreBlockParser } from "./parsers/block/indented-pre.js";
export { ListParser } from "./parsers/block/list.js";
export { ParagraphParser } from "./parsers/block/paragraph.js";
export { ReferenceDefinitionParser } from "./parsers/block/reference-definition.js";
export { SectionParser } from "./parsers/block/section.js";
export {
  BaseInlineParser
} from "./parsers/inline/base.js";
export { CodeParser } from "./parsers/inline/code.js";
export { EmphasisParser } from "./parsers/inline/emphasis.js";
export { EscapeParser } from "./parsers/inline/escape.js";
export { ImageParser } from "./parsers/inline/image.js";
export { LinkParser } from "./parsers/inline/link.js";
export { TextParser } from "./parsers/inline/text.js";
export { MarkdownParser } from "./parsers/markdown-parser.js";
export { BlockParsingEngine } from "./parsing/block.js";
export {
  ParsingContext
} from "./parsing/context.js";
export {
  applyAstPatches,
  IncrementalParser,
  init as initIncrementalParser
} from "./parsing/incremental.js";
export { InlineParsingEngine } from "./parsing/inline.js";
export {
  isInlinePhase,
  isPostParsePhase,
  isPreParsePhase,
  PhaseRegistry,
  ReferenceCollectionPhase
} from "./parsing/phases/index.js";
export {
  BLOCK_PRIORITIES,
  HIGH,
  HIGHEST,
  INLINE_PRIORITIES,
  LOW,
  LOWEST,
  NORMAL,
  Priority
} from "./parsing/priority.js";
export { ParserRegistry } from "./parsing/registry.js";
export {
  createMarkdownParser
} from "./profiles/markdown.js";
export { createTextoParser } from "./profiles/texto.js";
export {
  TextoParser
} from "./texto.js";
export { Cursor } from "./utils/cursor.js";
export {
  countLeadingSpaces,
  expandTabs,
  getIndent,
  matchesIndent,
  removeLeadingSpaces
} from "./utils/indent.js";
export {
  createPosition,
  mergePositions
} from "./utils/position.js";
export { TAB_SIZE } from "./utils/types.js";
export { Registry } from "./utils/registry.js";
