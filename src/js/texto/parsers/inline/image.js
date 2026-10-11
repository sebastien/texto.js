import { INLINE_PRIORITIES } from "../../parsing/priority.js";
import { BaseInlineParser } from "./base.js";

class ImageParser extends BaseInlineParser {
  constructor() {
    super("image", INLINE_PRIORITIES.LINK);
  }
  findNext(cursor, _context) {
    const text = cursor.text;
    const textLength = text.length;
    let pos = cursor.pos;
    while (pos < textLength - 1) {
      if (text[pos] === "!" && text[pos + 1] === "[") {
        const startPos = pos;
        pos += 2;
        let altText = "";
        let bracketDepth = 1;
        while (pos < textLength && bracketDepth > 0) {
          if (text[pos] === "[" && text[pos - 1] !== "\\") {
            bracketDepth++;
            altText += text[pos];
          } else if (text[pos] === "]" && text[pos - 1] !== "\\") {
            bracketDepth--;
            if (bracketDepth > 0) {
              altText += text[pos];
            }
          } else {
            altText += text[pos];
          }
          pos++;
        }
        if (bracketDepth !== 0) {
          pos = startPos + 1;
          continue;
        }
        const _endAltBracket = pos - 1;
        if (pos < textLength && text[pos] === "(") {
          pos++;
          let url = "";
          let inAngleBrackets = false;
          if (pos < textLength && text[pos] === "<") {
            inAngleBrackets = true;
            pos++;
          }
          while (pos < textLength) {
            if (inAngleBrackets && text[pos] === ">") {
              pos++;
              break;
            } else if (!inAngleBrackets && (text[pos] === " " || text[pos] === "\t" || text[pos] === ")")) {
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
              start: startPos,
              end: pos,
              alt: altText,
              url,
              title,
              style: "inline"
            };
          }
        } else if (pos < textLength && text[pos] === "[") {
          pos++;
          let ref = "";
          while (pos < textLength && text[pos] !== "]") {
            ref += text[pos];
            pos++;
          }
          if (pos < textLength && text[pos] === "]") {
            pos++;
            return {
              start: startPos,
              end: pos,
              alt: altText,
              ref: ref || altText,
              style: "reference"
            };
          }
        } else if (pos >= textLength || text[pos] !== "[") {
          if (pos >= textLength || text[pos] === " " || text[pos] === "\t" || text[pos] === `
`) {
            return {
              start: startPos,
              end: pos,
              alt: altText,
              ref: altText,
              style: "collapsed"
            };
          }
        }
        pos = startPos + 1;
      } else {
        pos++;
      }
    }
    return null;
  }
  parse(cursor, context, match) {
    const currentPos = cursor.getPosition();
    const node = context.builder.createAndAppend("image", {}, {
      start: match.start,
      end: match.end,
      line: currentPos.line,
      column: currentPos.column
    });
    node.attributes.set("alt", match.alt || "");
    if (match.style === "inline") {
      node.attributes.set("src", match.url || "");
      if (match.title) {
        node.attributes.set("title", match.title);
      }
    } else {
      const ref = match.ref || "";
      const normalizedRef = ref.toLowerCase().trim();
      let found = false;
      for (const target of context.targets) {
        if (target.name.toLowerCase() === normalizedRef) {
          node.attributes.set("src", target.node.attributes.get("target") || "");
          const title = target.node.attributes.get("title");
          if (title) {
            node.attributes.set("title", title);
          }
          found = true;
          break;
        }
      }
      if (!found) {
        node.attributes.set("src", "");
        node.attributes.set("data-broken-ref", ref);
      }
    }
    return match.end;
  }
}

export { ImageParser };
