import { parse as parseWithDomish } from "../../../../deps/domish.js/src/ts/domish/xmlish.ts";
import { formatTexto } from "../backends/texto.js";
import { DocumentBuilder } from "../document/builder.js";
import {
  appendChild,
  createComment,
  createElement,
  createText
} from "../document/node.js";

class DefaultNodeFactory {
  builder;
  constructor() {
    this.builder = new DocumentBuilder;
  }
  document() {
    return this.builder.getDocument();
  }
  element(name, attributes = {}) {
    return createElement(name, attributes);
  }
  text(content) {
    return createText(content);
  }
  comment(content) {
    return createComment(content);
  }
  append(parent, child) {
    appendChild(parent, child);
  }
  section(depth = 1, attributes = {}) {
    return this.element("section", { depth: String(depth), ...attributes });
  }
  title(attributes = {}) {
    return this.element("title", attributes);
  }
  content(attributes = {}) {
    return this.element("content", attributes);
  }
  paragraph(attributes = {}) {
    return this.element("paragraph", attributes);
  }
  blockquote(attributes = {}) {
    return this.element("blockquote", attributes);
  }
  horizontalRule(attributes = {}) {
    return this.element("horizontal-rule", attributes);
  }
  lineBreak(attributes = {}) {
    return this.element("br", attributes);
  }
  list(type, attributes = {}) {
    return this.element("list", { type, ...attributes });
  }
  item(attributes = {}) {
    return this.element("item", attributes);
  }
  term(attributes = {}) {
    return this.element("term", attributes);
  }
  definition(attributes = {}) {
    return this.element("definition", attributes);
  }
  code(attributes = {}) {
    return this.element("code", attributes);
  }
  preformatted(lang, output, attributes = {}) {
    const attrs = { ...attributes };
    if (lang)
      attrs["data-lang"] = lang;
    if (output)
      attrs["data-output"] = output;
    return this.element("preformatted", attrs);
  }
  table(attributes = {}) {
    return this.element("table", attributes);
  }
  row(attributes = {}) {
    return this.element("row", attributes);
  }
  cell(attributes = {}) {
    return this.element("cell", attributes);
  }
  strong(attributes = {}) {
    return this.element("strong", attributes);
  }
  emphasis(attributes = {}) {
    return this.element("emphasis", attributes);
  }
  link(target, attributes = {}) {
    return this.element("link", { target, ...attributes });
  }
  anchor(href, attributes = {}) {
    const { href: _href, ...rest } = attributes;
    return this.element("link", { target: href, ...rest });
  }
  image(src, alt, attributes = {}) {
    const attrs = { src, ...attributes };
    if (alt)
      attrs.alt = alt;
    return this.element("image", attrs);
  }
  unknown(tag, attributes = {}) {
    return this.element("markup", { tag, ...attributes });
  }
}
function parseHTML(html) {
  if (typeof DOMParser !== "undefined") {
    const Parser = DOMParser;
    const parser = new Parser;
    const doc = parser.parseFromString(html, "text/html");
    return doc.documentElement;
  }
  const doc = parseWithDomish(html);
  return doc.body;
}

class FrontEndProcessor {
  factory;
  document;
  sectionStack = [];
  strict;
  constructor(factory, options) {
    this.factory = factory ?? new DefaultNodeFactory;
    this.document = this.factory.document();
    this.strict = options?.strict ?? false;
  }
  process(root, options) {
    this.document = this.factory.document();
    this.sectionStack = [];
    const strict = options?.strict ?? this.strict;
    const result = this.dispatch(root, {
      parent: null,
      ancestors: [],
      depth: 0,
      preserveWhitespace: false,
      strict
    });
    if (result) {
      this.mergeInto(this.document.content, result);
    }
    return this.document;
  }
  dispatch(node, context) {
    if (this.isTextNode(node)) {
      const preserve = context.preserveWhitespace ?? false;
      const text = this.normalizeText(node.data, preserve);
      if (!text)
        return null;
      if ((context.skipBlankText ?? false) && text.trim() === "") {
        return null;
      }
      return this.factory.text(text);
    }
    if (node.nodeType === 8) {
      return this.factory.comment(node.data);
    }
    if (!this.isElementNode(node)) {
      return null;
    }
    const element = node;
    const tag = this.getTagName(element);
    const handlerName = `on${tag.charAt(0).toUpperCase()}${tag.slice(1)}`;
    const handler = this[handlerName];
    if (handler) {
      return handler.call(this, element, context);
    }
    return this.onUnknown(element, context);
  }
  onHtml(element, context) {
    for (const child of element.childNodes) {
      if (!this.isElementNode(child))
        continue;
      const tag = this.getTagName(child);
      if (tag === "head") {
        this.dispatch(child, this.childContext(this.document.header, context));
      } else if (tag === "body") {
        const bodyResult = this.dispatch(child, this.childContext(this.document.content, context));
        if (bodyResult) {
          this.mergeInto(this.document.content, bodyResult);
        }
      }
    }
    return null;
  }
  onHead(element, context) {
    for (const child of element.childNodes) {
      if (this.isElementNode(child)) {
        this.dispatch(child, this.childContext(this.document.header, context));
      }
    }
    return null;
  }
  onBody(element, context) {
    const content = this.factory.content();
    this.processContainer(element, context, content, 0);
    return content;
  }
  onTitle(element, context) {
    const title = this.factory.title();
    const children = this.processChildren(element, this.childContext(title, context));
    this.appendChildren(title, children);
    this.factory.append(this.document.header, title);
    return null;
  }
  onMeta(element, _context) {
    const name = element.getAttribute("name") || "";
    const content = element.getAttribute("content") || "";
    if (name && content) {
      const meta = this.factory.element("meta", { name });
      this.factory.append(meta, this.factory.text(content));
      this.factory.append(this.document.header, meta);
    }
    return null;
  }
  onH1(element, context) {
    return this.createSection(element, 1, context);
  }
  onH2(element, context) {
    return this.createSection(element, 2, context);
  }
  onH3(element, context) {
    return this.createSection(element, 3, context);
  }
  onH4(element, context) {
    return this.createSection(element, 4, context);
  }
  onH5(element, context) {
    return this.createSection(element, 5, context);
  }
  onH6(element, context) {
    return this.createSection(element, 6, context);
  }
  onSection(element, context) {
    const depth = context.depth + 1;
    const section = this.factory.section(depth);
    const content = this.factory.content();
    this.factory.append(section, content);
    this.processContainer(element, context, content, depth);
    return section;
  }
  onP(element, context) {
    const node = this.factory.paragraph();
    const children = this.processChildren(element, this.childContext(node, context));
    this.appendChildren(node, children);
    return node;
  }
  onUl(element, context) {
    return this.createList(element, "unordered", context);
  }
  onOl(element, context) {
    return this.createList(element, "ordered", context);
  }
  onLi(element, context) {
    const item = this.factory.item();
    const children = this.processChildren(element, this.childContext(item, context));
    this.appendChildren(item, children);
    return item;
  }
  onDl(element, context) {
    const list = this.factory.list("definition");
    const listContext = this.childContext(list, context, {
      skipBlankText: true
    });
    let currentItem = null;
    for (const child of element.childNodes) {
      if (!this.isElementNode(child))
        continue;
      const tag = this.getTagName(child);
      if (tag === "dt") {
        currentItem = this.factory.item();
        this.factory.append(list, currentItem);
        const term = this.factory.term();
        const termChildren = this.processChildren(child, this.childContext(term, listContext));
        this.appendChildren(term, termChildren);
        this.factory.append(currentItem, term);
      } else if (tag === "dd" && currentItem) {
        const def = this.factory.definition();
        const defChildren = this.processChildren(child, this.childContext(def, listContext));
        this.appendChildren(def, defChildren);
        this.factory.append(currentItem, def);
      }
    }
    return list;
  }
  onDt(element, context) {
    const term = this.factory.term();
    const children = this.processChildren(element, this.childContext(term, context));
    this.appendChildren(term, children);
    return term;
  }
  onDd(element, context) {
    const def = this.factory.definition();
    const children = this.processChildren(element, this.childContext(def, context));
    this.appendChildren(def, children);
    return def;
  }
  onStrong(element, context) {
    return this.createInline("strong", element, context);
  }
  onB(element, context) {
    return this.createInline("strong", element, context);
  }
  onEm(element, context) {
    return this.createInline("emphasis", element, context);
  }
  onI(element, context) {
    return this.createInline("emphasis", element, context);
  }
  onCode(element, context) {
    return this.createInline("code", element, context);
  }
  onPre(element, _context) {
    const code = this.findChildElement(element, "code");
    const source = code ?? element;
    const lang = code ? this.inferLang(code) : undefined;
    const output = code?.getAttribute("data-output") ?? undefined;
    const text = this.getTextContent(source);
    const node = this.factory.preformatted(lang, output);
    if (text) {
      this.factory.append(node, this.factory.text(text));
    }
    return node;
  }
  onA(element, context) {
    const href = element.getAttribute("href") || "";
    const title = element.getAttribute("title") || undefined;
    const attrs = {};
    if (title)
      attrs.title = title;
    const node = this.factory.link(href, attrs);
    const children = this.processChildren(element, this.childContext(node, context));
    this.appendChildren(node, children);
    return node;
  }
  onImg(element, _context) {
    const src = element.getAttribute("src") || "";
    const alt = element.getAttribute("alt") || "";
    const title = element.getAttribute("title") || undefined;
    return this.factory.image(src, alt, title ? { title } : undefined);
  }
  onBlockquote(element, context) {
    const node = this.factory.blockquote();
    const children = this.processChildren(element, this.childContext(node, context, { skipBlankText: true }));
    this.appendChildren(node, children);
    return node;
  }
  onHr(_element, _context) {
    return this.factory.horizontalRule();
  }
  onBr(_element, _context) {
    return this.factory.lineBreak();
  }
  onTable(element, context) {
    const node = this.factory.table();
    const tableContext = this.childContext(node, context, {
      skipBlankText: true
    });
    for (const child of element.childNodes) {
      if (!this.isElementNode(child))
        continue;
      const tag = this.getTagName(child);
      if (tag === "tr") {
        const row = this.dispatch(child, tableContext);
        this.appendChildren(node, this.asArray(row));
      } else if (["tbody", "thead", "tfoot"].includes(tag)) {
        for (const rowChild of child.childNodes) {
          if (this.isElementNode(rowChild) && this.getTagName(rowChild) === "tr") {
            const row = this.dispatch(rowChild, tableContext);
            this.appendChildren(node, this.asArray(row));
          }
        }
      }
    }
    return node;
  }
  onTr(element, context) {
    const node = this.factory.row();
    const rowContext = this.childContext(node, context, {
      skipBlankText: true
    });
    for (const child of element.childNodes) {
      if (!this.isElementNode(child))
        continue;
      const tag = this.getTagName(child);
      if (tag === "td" || tag === "th") {
        const cell = this.dispatch(child, rowContext);
        this.appendChildren(node, this.asArray(cell));
      }
    }
    return node;
  }
  onTd(element, context) {
    return this.createCell(element, context);
  }
  onTh(element, context) {
    return this.createCell(element, context);
  }
  onUnknown(element, context) {
    if (context.strict) {
      return this.processChildren(element, {
        ...context,
        depth: context.depth + 1
      });
    }
    const tag = this.getTagName(element);
    const attrs = this.getAttributes(element);
    const node = this.factory.unknown(tag, attrs);
    const children = this.processChildren(element, this.childContext(node, context));
    this.appendChildren(node, children);
    return node;
  }
  createSection(element, depth, context) {
    const section = this.factory.section(depth);
    const title = this.factory.title();
    const titleChildren = this.processChildren(element, this.childContext(title, context));
    this.appendChildren(title, titleChildren);
    this.factory.append(section, title);
    const content = this.factory.content();
    this.factory.append(section, content);
    return section;
  }
  createList(element, type, context) {
    const list = this.factory.list(type);
    const listContext = this.childContext(list, context, {
      skipBlankText: true
    });
    for (const child of element.childNodes) {
      if (!this.isElementNode(child))
        continue;
      const nodes = this.dispatch(child, listContext);
      this.appendChildren(list, this.asArray(nodes));
    }
    return list;
  }
  createInline(name, element, context) {
    let node;
    switch (name) {
      case "strong":
        node = this.factory.strong();
        break;
      case "emphasis":
        node = this.factory.emphasis();
        break;
      case "code":
        node = this.factory.code();
        break;
    }
    const children = this.processChildren(element, this.childContext(node, context));
    this.appendChildren(node, children);
    return node;
  }
  createCell(element, context) {
    const node = this.factory.cell();
    const children = this.processChildren(element, this.childContext(node, context));
    this.appendChildren(node, children);
    return node;
  }
  processContainer(element, context, container, baseDepth) {
    this.pushContainer(container, baseDepth);
    for (const child of element.childNodes) {
      if (this.isTextNode(child)) {
        const text = this.normalizeText(child.data, context.preserveWhitespace ?? false);
        if (text && text.trim() !== "") {
          this.factory.append(this.currentContainer(), this.factory.text(text));
        }
        continue;
      }
      if (!this.isElementNode(child))
        continue;
      const el = child;
      const tag = this.getTagName(el);
      const headingMatch = tag.match(/^h([1-6])$/);
      const childContext = this.childContext(this.currentContainer(), context, {
        skipBlankText: true
      });
      if (headingMatch) {
        const depth = parseInt(headingMatch[1], 10);
        this.popContainers(depth);
        const section = this.dispatch(el, childContext);
        if (section) {
          const sectionNode = Array.isArray(section) ? section[0] : section;
          this.factory.append(this.currentContainer(), sectionNode);
          const contentNode = this.findContentChild(sectionNode);
          if (contentNode) {
            this.pushContainer(contentNode, depth);
          }
        }
      } else {
        const nodes = this.dispatch(el, childContext);
        for (const node of this.asArray(nodes)) {
          this.factory.append(this.currentContainer(), node);
        }
      }
    }
    this.popAllContainers();
  }
  processChildren(element, context) {
    const nodes = [];
    for (const child of element.childNodes) {
      const result = this.dispatch(child, context);
      nodes.push(...this.asArray(result));
    }
    return nodes;
  }
  childContext(parent, context, overrides) {
    return {
      parent,
      ancestors: context.parent ? [...context.ancestors, context.parent] : context.ancestors,
      depth: context.depth + 1,
      preserveWhitespace: context.preserveWhitespace,
      skipBlankText: context.skipBlankText,
      strict: context.strict,
      ...overrides
    };
  }
  appendChildren(parent, children) {
    for (const child of children) {
      this.factory.append(parent, child);
    }
  }
  mergeInto(target, result) {
    for (const node of this.asArray(result)) {
      if (node.type === "element" && node.name === "content") {
        for (const child of [...node.children]) {
          this.factory.append(target, child);
        }
      } else {
        this.factory.append(target, node);
      }
    }
  }
  pushContainer(container, depth) {
    this.sectionStack.push({ container, depth });
  }
  popContainers(minDepth) {
    while (this.sectionStack.length > 0) {
      const top = this.sectionStack[this.sectionStack.length - 1];
      if (top && top.depth >= minDepth) {
        this.sectionStack.pop();
      } else {
        break;
      }
    }
  }
  currentContainer() {
    const top = this.sectionStack[this.sectionStack.length - 1];
    if (!top) {
      throw new Error("No container available in FrontEndProcessor");
    }
    return top.container;
  }
  popAllContainers() {
    this.sectionStack = [];
  }
  findContentChild(node) {
    return node.children.find((child) => child.type === "element" && child.name === "content") || null;
  }
  findChildElement(element, name) {
    for (const child of element.childNodes) {
      if (this.isElementNode(child) && this.getTagName(child) === name) {
        return child;
      }
    }
    return;
  }
  inferLang(code) {
    const dataLang = code.getAttribute("data-lang");
    if (dataLang)
      return dataLang;
    const classAttr = code.getAttribute("class") || "";
    const match = classAttr.match(/(?:^|\s)language-(\S+)/);
    return match ? match[1] : undefined;
  }
  getTextContent(element) {
    const parts = [];
    for (const child of element.childNodes) {
      if (this.isTextNode(child)) {
        parts.push(child.data);
      } else if (this.isElementNode(child)) {
        parts.push(this.getTextContent(child));
      }
    }
    return parts.join("");
  }
  getTagName(element) {
    return element.nodeName.toLowerCase();
  }
  getAttributes(element) {
    const attrs = {};
    for (const attr of element.attributes) {
      if (attr.value !== null && attr.value !== undefined) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  }
  normalizeText(text, preserveWhitespace) {
    return preserveWhitespace ? text : text.replace(/\s+/g, " ");
  }
  isElementNode(node) {
    return node.nodeType === 1;
  }
  isTextNode(node) {
    return node.nodeType === 3;
  }
  asArray(value) {
    if (value === null || value === undefined)
      return [];
    return Array.isArray(value) ? value : [value];
  }
}
function htmlToDocument(html, options) {
  const processor = new FrontEndProcessor(undefined, options);
  const root = parseHTML(html);
  return processor.process(root);
}
function htmlToTexto(html, options) {
  const doc = htmlToDocument(html, options);
  return formatTexto(doc);
}
const htmlFrontend = (input, options = {}) => htmlToDocument(input, { strict: options.strict });

export {
  DefaultNodeFactory,
  FrontEndProcessor,
  htmlFrontend,
  htmlToDocument,
  htmlToTexto
};
