import { createText } from "../../document/node.js";
import { INLINE_PRIORITIES } from "../../parsing/priority.js";
import { BaseInlineParser } from "./base.js";

class LinkParser extends BaseInlineParser {
  enableReferenceLinks;
  constructor(options = {}) {
    super("link", INLINE_PRIORITIES.LINK);
    this.enableReferenceLinks = options.enableReferenceLinks !== false;
  }
  findNext(cursor, _context) {
    const text = cursor.text;
    const textLength = text.length;
    let pos = cursor.pos;
    while (pos < textLength) {
      if (text[pos] === "<") {
        const autoLinkMatch = this.findAutomaticLink(text, pos, textLength);
        if (autoLinkMatch) {
          return autoLinkMatch;
        }
      }
      if (text[pos] === "[") {
        const startBracket = pos;
        pos++;
        let textContent = "";
        let bracketDepth = 1;
        while (pos < textLength && bracketDepth > 0) {
          if (text[pos] === "[" && text[pos - 1] !== "\\") {
            bracketDepth++;
            textContent += text[pos];
          } else if (text[pos] === "]" && text[pos - 1] !== "\\") {
            bracketDepth--;
            if (bracketDepth > 0) {
              textContent += text[pos];
            }
          } else {
            textContent += text[pos];
          }
          pos++;
        }
        if (bracketDepth !== 0) {
          pos = startBracket + 1;
          continue;
        }
        const _endTextBracket = pos - 1;
        if (pos < textLength && text[pos] === "(") {
          pos++;
          let url = "";
          let inAngleBrackets = false;
          if (text[pos] === "<") {
            inAngleBrackets = true;
            pos++;
          }
          while (pos < textLength) {
            if (inAngleBrackets && text[pos] === ">") {
              pos++;
              break;
            } else if (!inAngleBrackets && (text[pos] === " " || text[pos] === "\t" || text[pos] === ")")) {
              break;
            } else if (!inAngleBrackets && text[pos] === ")") {
              break;
            }
            url += text[pos];
            pos++;
          }
          let title = "";
          if (pos < textLength && (text[pos] === " " || text[pos] === "\t")) {
            while (pos < textLength && (text[pos] === " " || text[pos] === "\t")) {
              pos++;
            }
            if (pos < textLength && (text[pos] === '"' || text[pos] === "'" || text[pos] === "(")) {
              const quote = text[pos] === "(" ? ")" : text[pos];
              pos++;
              while (pos < textLength && text[pos] !== quote) {
                title += text[pos];
                pos++;
              }
              if (pos < textLength && text[pos] === quote) {
                pos++;
              }
            }
          }
          if (pos < textLength && text[pos] === ")") {
            pos++;
            return {
              start: startBracket,
              end: pos,
              content: textContent,
              url,
              title,
              style: "inline"
            };
          }
        } else {
          if (!this.enableReferenceLinks) {
            pos = startBracket + 1;
            continue;
          }
          let ref = "";
          let currentPos = pos;
          while (currentPos < textLength && (text[currentPos] === " " || text[currentPos] === "\t" || text[currentPos] === `
`)) {
            currentPos++;
          }
          if (currentPos < textLength && text[currentPos] === "[") {
            currentPos++;
            while (currentPos < textLength && text[currentPos] !== "]") {
              ref += text[currentPos];
              currentPos++;
            }
            if (currentPos < textLength && text[currentPos] === "]") {
              currentPos++;
              return {
                start: startBracket,
                end: currentPos,
                content: textContent,
                ref: ref || textContent,
                style: "reference"
              };
            }
          }
          if (pos >= textLength || /[\s.,!?;:)]/.test(text[pos] || "")) {
            if (!this.hasReference(_context, textContent)) {
              pos = startBracket + 1;
              continue;
            }
            return {
              start: startBracket,
              end: pos,
              content: textContent,
              ref: textContent,
              style: "collapsed"
            };
          }
        }
        pos = startBracket + 1;
      } else {
        pos++;
      }
    }
    return null;
  }
  parse(cursor, context, match) {
    const currentPos = cursor.getPosition();
    const _text = cursor.text;
    const node = context.builder.createAndAppend("link", {}, {
      start: match.start,
      end: match.end,
      line: currentPos.line,
      column: currentPos.column
    });
    if (match.style === "inline") {
      node.attributes.set("target", match.url || "");
      if (match.title) {
        node.attributes.set("title", match.title);
      }
      this.addLinkText(node, match.content, context, match.start + 1);
    } else if (match.style === "automatic") {
      const url = match.url || "";
      node.attributes.set("target", url);
      this.addLinkText(node, url, context, match.start + 1);
    } else {
      const ref = match.ref || "";
      const normalizedRef = ref.toLowerCase().trim();
      const phaseReferences = context.keyIndex.get("phase.reference-collection.references");
      let found = false;
      for (const target of context.targets) {
        if (target.name.toLowerCase() === normalizedRef) {
          node.attributes.set("target", target.node.attributes.get("target") || "");
          const title = target.node.attributes.get("title");
          if (title) {
            node.attributes.set("title", title);
          }
          found = true;
          break;
        }
      }
      if (!found && phaseReferences) {
        const phaseReference = phaseReferences.get(normalizedRef);
        if (phaseReference) {
          node.attributes.set("target", phaseReference.url);
          if (phaseReference.title) {
            node.attributes.set("title", phaseReference.title);
          }
          found = true;
        }
      }
      if (!found) {
        node.attributes.set("target", "");
        node.attributes.set("data-broken-ref", ref);
      }
      this.addLinkText(node, match.content, context, match.start + 1);
    }
    return match.end;
  }
  addLinkText(node, content, _context, baseOffset) {
    if (content) {
      const textNode = createText(content, {
        start: baseOffset,
        end: baseOffset + content.length,
        line: 0,
        column: 0
      });
      node.children.push(textNode);
    }
  }
  findAutomaticLink(text, pos, textLength) {
    if (text[pos] !== "<")
      return null;
    const start = pos;
    pos++;
    let url = "";
    while (pos < textLength && text[pos] !== ">" && text[pos] !== " " && text[pos] !== `
`) {
      url += text[pos];
      pos++;
    }
    if (pos >= textLength || text[pos] !== ">") {
      return null;
    }
    pos++;
    const isUrl = url.startsWith("http://") || url.startsWith("https://") || url.startsWith("ftp://");
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url);
    if (!isUrl && !isEmail) {
      return null;
    }
    return {
      start,
      end: pos,
      content: url,
      url,
      style: "automatic"
    };
  }
  hasReference(context, label) {
    const normalized = label.toLowerCase().trim();
    for (const target of context.targets) {
      if (target.name.toLowerCase() === normalized) {
        return true;
      }
    }
    const phaseData = context.keyIndex.get("phase.reference-collection.references");
    return phaseData?.has(normalized) || false;
  }
}

export { LinkParser };
