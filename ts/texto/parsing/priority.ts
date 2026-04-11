// Priority levels for parser ordering

export const HIGHEST = 0;
export const HIGH = 10;
export const NORMAL = 20;
export const LOW = 30;
export const LOWEST = 40;

// Default priority for block parsers (ordered by priority)
export const BLOCK_PRIORITIES = {
  COMMENT: 5,      // Comments should be first
  SEPARATOR: 8,    // Content separators
  TAGGED: 12,    // Tagged blocks
  META: 15,      // Metadata
  PRE: 18,       // Preformatted (fenced)
  TITLE: 22,     // Document titles
  SECTION: 25,   // Sections
  TABLE: 28,     // Tables
  DEFINITION: 32, // Definition lists
  LIST: 35,      // Lists
  REFERENCE: 38, // Reference entries
  PARAGRAPH: 50  // Default/fallback
} as const;

// Default priority for inline parsers
export const INLINE_PRIORITIES = {
  ESCAPED: 5,     // Escaped content
  COMMENT: 8,     // Inline comments
  MARKUP: 10,    // Custom markup
  LINK: 15,      // Links
  TARGET: 18,    // Targets
  PRE: 22,       // Preformatted inline
  CODE: 25,      // Code
  STRONG: 30,    // **bold**
  EMPHASIS: 35,  // *italic*
  TERM: 40,      // _term_
  QUOTE: 45,     // "quoted"
  CITATION: 50,  // «citation»
  STRIKETHROUGH: 55, // ~~strike~~
  BREAK: 60,     // Line breaks
  ENTITY: 65,    // &entities;
  TEXT: 100      // Default/fallback
} as const;
