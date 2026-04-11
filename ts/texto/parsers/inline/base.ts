// Base InlineParser interface

import { Cursor } from '../../utils/cursor.ts';
import { InlineMatch, Node } from '../../utils/types.ts';
import { ParsingContext } from '../../parsing/context.ts';

export interface InlineParser {
  readonly name: string;
  readonly priority: number;
  
  findNext(
    cursor: Cursor,
    context: ParsingContext
  ): InlineMatch | null;
  
  parse(
    cursor: Cursor,
    context: ParsingContext,
    match: InlineMatch
  ): number;
}

export abstract class BaseInlineParser implements InlineParser {
  readonly name: string;
  readonly priority: number;

  constructor(name: string, priority: number = 20) {
    this.name = name;
    this.priority = priority;
  }

  abstract findNext(
    cursor: Cursor,
    context: ParsingContext
  ): InlineMatch | null;

  abstract parse(
    cursor: Cursor,
    context: ParsingContext,
    match: InlineMatch
  ): number;

  protected createInlineNode(
    tagName: string,
    content: string,
    context: ParsingContext
  ): Node {
    const node = context.builder.createAndAppend(tagName);
    if (content) {
      const textNode = context.builder.addText(content);
      node.children.push(textNode);
    }
    return node;
  }
}
