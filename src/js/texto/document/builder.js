import { appendChild, createElement, createText } from "./node.js";

class DocumentBuilder {
  document;
  stack;
  sections;
  current;
  constructor(documentPosition) {
    const header = createElement("header", {}, documentPosition);
    const content = createElement("content", {}, documentPosition);
    const references = createElement("references", {}, documentPosition);
    const appendices = createElement("appendices", {}, documentPosition);
    const root = createElement("document", {}, documentPosition);
    appendChild(root, header);
    appendChild(root, content);
    appendChild(root, references);
    appendChild(root, appendices);
    this.document = {
      type: "document",
      header,
      content,
      references,
      appendices
    };
    this.stack = [root, content];
    this.sections = [];
    this.current = content;
  }
  getDocument() {
    return this.document;
  }
  getRoot() {
    return this.stack[0];
  }
  getCurrentNode() {
    return this.current;
  }
  setCurrentNode(node) {
    this.current = node;
  }
  pushNode(node) {
    this.stack.push(node);
    this.current = node;
  }
  popNode() {
    if (this.stack.length <= 1)
      return null;
    this.stack.pop();
    this.current = this.stack[this.stack.length - 1];
    return this.current;
  }
  appendToCurrent(child) {
    appendChild(this.current, child);
  }
  createAndAppend(name, attributes = {}, position) {
    const node = createElement(name, attributes, position);
    this.appendToCurrent(node);
    return node;
  }
  addText(content, position) {
    const node = createText(content, position);
    this.appendToCurrent(node);
    return node;
  }
  moveUp() {
    this.popNode();
  }
  moveToParentWithName(names) {
    while (this.stack.length > 1) {
      const parent = this.stack[this.stack.length - 1];
      if (parent.type === "element" && parent.name && names.includes(parent.name)) {
        this.current = parent;
        return;
      }
      this.popNode();
    }
  }
  findParent(predicate) {
    for (let i = this.stack.length - 1;i >= 0; i--) {
      if (predicate(this.stack[i])) {
        return this.stack[i];
      }
    }
    return null;
  }
  pushSection(node, content, depth, indent) {
    this.sections.push({ node, content, depth, indent });
  }
  findParentSection(depth, indent) {
    for (let i = this.sections.length - 1;i >= 0; i--) {
      const section = this.sections[i];
      if (indent > section.indent || indent <= section.indent && section.depth < depth) {
        return section.content;
      }
    }
    return this.document.content;
  }
  getCurrentSection() {
    if (this.sections.length === 0)
      return null;
    return this.sections[this.sections.length - 1];
  }
  getSectionDepth(node) {
    let depth = 0;
    let current = node;
    while (current) {
      if (current.type === "element" && current.name === "section") {
        depth++;
      }
      const idx = this.stack.indexOf(current);
      if (idx > 0) {
        current = this.stack[idx - 1];
      } else {
        break;
      }
    }
    return depth;
  }
  ensureElement(parent, name, index = 0, position) {
    const elements = parent.children.filter((child) => child.type === "element" && child.name === name);
    if (elements.length > index) {
      const element = elements[index];
      if (position && !element.position) {
        element.position = position;
      }
      return element;
    }
    const newElement = createElement(name, {}, position);
    appendChild(parent, newElement);
    return newElement;
  }
  normalizeEmptyNodes() {
    for (const node of [
      this.document.header,
      this.document.references,
      this.document.appendices
    ]) {
      if (node.children.length === 0) {
        const root = this.getRoot();
        const idx = root.children.indexOf(node);
        if (idx !== -1) {
          root.children.splice(idx, 1);
        }
      }
    }
  }
}

export { DocumentBuilder };
