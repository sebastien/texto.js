// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsing/priority
// Implements the parsing/priority module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Canonical priority enum (adopted as single source of truth for coarse levels)
import { Priority } from "../utils/types.ts";

// Coarse priority levels (re-exported from canonical enum for convenience)
const HIGHEST = Priority.HIGHEST;
const HIGH = Priority.HIGH;
const NORMAL = Priority.NORMAL;
const LOW = Priority.LOW;
const LOWEST = Priority.LOWEST;

// Default priority for block parsers (ordered by priority, values on the Priority scale)
const BLOCK_PRIORITIES = {
	COMMENT: 5, // Comments should be first
	SEPARATOR: 8, // Content separators
	TAGGED: 12, // Tagged blocks
	META: 15, // Metadata
	PRE: 18, // Preformatted (fenced)
	TITLE: 22, // Document titles
	SECTION: 25, // Sections
	TABLE: 28, // Tables
	DEFINITION: 32, // Definition lists
	LIST: 35, // Lists
	REFERENCE: 38, // Reference entries
	PARAGRAPH: 50, // Default/fallback (beyond LOWEST for explicit last)
} as const;

// Default priority for inline parsers (values on the Priority scale)
const INLINE_PRIORITIES = {
	ESCAPED: 5, // Escaped content
	COMMENT: 8, // Inline comments
	MARKUP: 10, // Custom markup
	LINK: 15, // Links
	TARGET: 18, // Targets
	PRE: 22, // Preformatted inline
	CODE: 25, // Code
	STRONG: 30, // **bold**
	EMPHASIS: 35, // *italic*
	TERM: 40, // _term_
	QUOTE: 45, // "quoted"
	CITATION: 50, // «citation»
	STRIKETHROUGH: 55, // ~~strike~~
	BREAK: 60, // Line breaks
	ENTITY: 65, // &entities;
	TEXT: 100, // Default/fallback (explicit last)
} as const;

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export {
	BLOCK_PRIORITIES,
	HIGH,
	HIGHEST,
	INLINE_PRIORITIES,
	LOW,
	LOWEST,
	NORMAL,
	Priority,
};

// EOF
