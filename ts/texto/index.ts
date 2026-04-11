// Texto Parser - Public API

export {
  TextoParser,
  type ParserOptions
} from './texto.ts';

export {
  DocumentBuilder,
  type SectionEntry
} from './document/builder.ts';

export {
  createElement,
  createText,
  createComment,
  appendChild,
  setAttribute,
  getAttribute,
  isElement,
  isText,
  isComment
} from './document/node.ts';

export {
  getChildren,
  getFirstChild,
  getLastChild,
  findChild,
  findChildren,
  findDescendants,
  getElementsByTagName
} from './document/tree.ts';

export {
  Cursor
} from './utils/cursor.ts';

export {
  createPosition,
  mergePositions
} from './utils/position.ts';

export {
  getIndent,
  countLeadingSpaces,
  removeLeadingSpaces,
  expandTabs,
  matchesIndent
} from './utils/indent.ts';

export {
  ParsingContext,
  type LinkEntry,
  type TargetEntry
} from './parsing/context.ts';

export {
  ParserRegistry
} from './parsing/registry.ts';

export {
  HIGHEST,
  HIGH,
  NORMAL,
  LOW,
  LOWEST,
  BLOCK_PRIORITIES,
  INLINE_PRIORITIES
} from './parsing/priority.ts';

export {
  BlockParsingEngine
} from './parsing/block.ts';

export {
  InlineParsingEngine
} from './parsing/inline.ts';

// Block parsers
export {
  type BlockParser,
  BaseBlockParser
} from './parsers/block/base.ts';

export {
  ParagraphParser
} from './parsers/block/paragraph.ts';

export {
  SectionParser
} from './parsers/block/section.ts';

export {
  ListParser
} from './parsers/block/list.ts';

export {
  FencedBlockParser
} from './parsers/block/fenced.ts';

export {
  IndentedPreBlockParser
} from './parsers/block/indented-pre.ts';

// Inline parsers
export {
  type InlineParser,
  BaseInlineParser
} from './parsers/inline/base.ts';

export {
  TextParser
} from './parsers/inline/text.ts';

export {
  EmphasisParser
} from './parsers/inline/emphasis.ts';

// Formatters
export {
  formatJSON,
  toJSON
} from './formatters/json.ts';

export {
  formatTexto
} from './formatters/texto.ts';

// CLI
export {
  main,
  parseCommand,
  formatCommand,
  type ParseOptions,
  type FormatOptions
} from './cli/index.ts';

// Types
export type {
  Document,
  Node,
  Position,
  RecognitionInfo,
  BlockResult,
  InlineMatch,
  ParserState,
  ParseError,
  Priority
} from './utils/types.ts';

// Constants
export { TAB_SIZE } from './utils/types.ts';

// CLI utilities
export type {
  CLIParamType,
  CLIParams,
  CLIArgs,
  CLIParam,
  CLIParamError,
  CLIMeta
} from './utils/cli.ts';

export {
  iargs,
  args,
  help
} from './utils/cli.ts';
