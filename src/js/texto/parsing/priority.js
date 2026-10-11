import { Priority } from "../utils/types.js";
const HIGHEST = Priority.HIGHEST;
const HIGH = Priority.HIGH;
const NORMAL = Priority.NORMAL;
const LOW = Priority.LOW;
const LOWEST = Priority.LOWEST;
const BLOCK_PRIORITIES = {
  COMMENT: 5,
  SEPARATOR: 8,
  TAGGED: 12,
  META: 15,
  PRE: 18,
  TITLE: 22,
  SECTION: 25,
  TABLE: 28,
  DEFINITION: 32,
  LIST: 35,
  REFERENCE: 38,
  PARAGRAPH: 50
};
const INLINE_PRIORITIES = {
  ESCAPED: 5,
  COMMENT: 8,
  MARKUP: 10,
  LINK: 15,
  TARGET: 18,
  PRE: 22,
  CODE: 25,
  STRONG: 30,
  EMPHASIS: 35,
  TERM: 40,
  QUOTE: 45,
  CITATION: 50,
  STRIKETHROUGH: 55,
  BREAK: 60,
  ENTITY: 65,
  TEXT: 100
};

export {
  BLOCK_PRIORITIES,
  HIGH,
  HIGHEST,
  INLINE_PRIORITIES,
  LOW,
  LOWEST,
  NORMAL,
  Priority
};
