class BaseInlineParser {
  name;
  priority;
  constructor(name, priority = 20) {
    this.name = name;
    this.priority = priority;
  }
  createInlineNode(tagName, content, context, position, contentPosition) {
    const node = context.builder.createAndAppend(tagName, {}, position);
    if (content) {
      const textNode = context.builder.addText(content, contentPosition);
      node.children.push(textNode);
    }
    return node;
  }
}

export { BaseInlineParser };
