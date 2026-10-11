function formatTexto(doc) {
  const parts = [];
  const headerText = formatHeader(doc.header);
  if (headerText) {
    parts.push(headerText);
  }
  const contentText = formatContent(doc.content);
  if (contentText) {
    if (parts.length > 0)
      parts.push("");
    parts.push(contentText);
  }
  const refsText = formatContent(doc.references);
  if (refsText) {
    if (parts.length > 0)
      parts.push("");
    parts.push(refsText);
  }
  const appText = formatContent(doc.appendices);
  if (appText) {
    if (parts.length > 0)
      parts.push("");
    parts.push(appText);
  }
  let result = parts.join(`

`);
  result = result.replace(/\r\n/g, `
`);
  result = result.replace(/[ \t]+$/gm, "");
  result = result.trimEnd();
  return result;
}
function formatContent(node) {
  if (!node.children || node.children.length === 0) {
    return "";
  }
  const blocks = [];
  for (const child of node.children) {
    const formatted = formatBlock(child);
    if (formatted) {
      blocks.push(formatted);
    }
  }
  return blocks.join(`

`);
}
function formatBlock(node) {
  if (node.type === "text") {
    return node.content || "";
  }
  if (node.type === "comment") {
    return "";
  }
  if (node.type !== "element") {
    return "";
  }
  const name = node.name || "";
  switch (name) {
    case "section":
      return formatSection(node);
    case "list":
      return formatList(node);
    case "paragraph":
      return formatParagraph(node);
    case "preformatted":
      return formatPreformatted(node);
    case "table":
      return formatTable(node);
    case "tagged":
      return formatTaggedBlock(node);
    default:
      return formatChildren(node);
  }
}
function formatInline(node) {
  if (node.type === "text") {
    return node.content || "";
  }
  if (node.type !== "element") {
    return "";
  }
  const name = node.name || "";
  switch (name) {
    case "strong":
      return `**${formatChildren(node)}**`;
    case "emphasis":
      return `*${formatChildren(node)}*`;
    case "code":
      return `\`${formatChildren(node)}\``;
    case "link":
      return formatLink(node);
    case "target":
      return formatTarget(node);
    case "term":
      return `_${formatChildren(node)}_`;
    case "markup":
      return formatMarkup(node);
    default:
      return formatChildren(node);
  }
}
function isBlockListItemChild(node) {
  if (node.type !== "element") {
    return false;
  }
  const name = node.name || "";
  return name === "paragraph" || name === "list" || name === "section" || name === "preformatted" || name === "table" || name === "tagged" || name === "definition";
}
function formatChildren(node) {
  if (!node.children || node.children.length === 0) {
    return "";
  }
  return node.children.map(formatInline).join("");
}
function formatHeader(node) {
  const lines = [];
  for (const child of node.children) {
    if (child.type === "element") {
      if (child.name === "title") {
        lines.push(`== ${formatChildren(child).trim()}`);
      } else if (child.name === "meta") {
        const name = child.attributes.get("name") || "";
        const value = formatChildren(child).trim();
        lines.push(`-- ${name}: ${value}`);
      }
    }
  }
  return lines.join(`
`);
}
function formatSection(node) {
  const style = node.attributes.get("_style");
  const depth = parseInt(node.attributes.get("depth") || "1", 10);
  const titleNode = node.children.find((c) => c.type === "element" && c.name === "title");
  const title = titleNode ? formatInline(titleNode).trim() : "";
  const contentNode = node.children.find((c) => c.type === "element" && c.name === "content");
  const content = contentNode ? formatContent(contentNode).trim() : "";
  let heading = "";
  if (style === "numbered") {
    const number = node.attributes.get("_number") || "";
    heading = `${number}. ${title}`;
  } else if (style === "hash") {
    heading = `${"#".repeat(depth)} ${title}`;
  } else {
    const weight = node.attributes.get("_weight");
    const underlineChar = weight === "2" ? "=" : "-";
    const underline = underlineChar.repeat(Math.max(3, title.length));
    heading = `${title}
${underline}`;
  }
  heading = heading.replace(/[ \t]+$/gm, "");
  if (content) {
    return `${heading}

${content}`;
  }
  return heading;
}
function formatList(node) {
  const type = node.attributes.get("type") || "unordered";
  if (type === "definition") {
    return formatDefinitionList(node);
  }
  const items = node.children.filter((c) => c.type === "element" && c.name === "item");
  const formatted = items.map((item, index) => {
    const indent = item.attributes.get("_indent") || "0";
    const spaces = type === "ordered" ? "" : " ".repeat(parseInt(indent, 10));
    const itemText = formatItemWithNestedBlocks(item, parseInt(indent, 10));
    if (type === "todo") {
      const checked = item.attributes.get("todo") === "done";
      return formatListItemText(`[${checked ? "x" : " "}] `, spaces, itemText);
    } else if (type === "unordered") {
      return formatListItemText("- ", spaces, itemText);
    } else if (type === "ordered") {
      return formatListItemText(`${index + 1}) `, spaces, itemText);
    }
    return itemText;
  });
  return formatted.join(`
`);
}
function formatListItemText(marker, spaces, itemText) {
  const lines = itemText.split(`
`);
  const firstLine = lines[0] || "";
  if (lines.length === 1) {
    return `${spaces}${marker}${firstLine}`;
  }
  const continuation = " ".repeat(marker.length);
  const rest = lines.slice(1).map((line) => `${spaces}${continuation}${line.trimStart()}`);
  return [`${spaces}${marker}${firstLine}`, ...rest].join(`
`);
}
function formatItemWithNestedBlocks(item, _baseIndent) {
  const children = item.children || [];
  if (children.length === 0) {
    return "";
  }
  const hasBlockChildren = children.some((child) => isBlockListItemChild(child));
  if (!hasBlockChildren) {
    return formatChildren(item).trim();
  }
  const texts = [];
  for (const block of children) {
    if (block.type === "text") {
      const text = (block.content || "").trim();
      if (text) {
        texts.push(text);
      }
      continue;
    }
    if (block.type !== "element") {
      continue;
    }
    if (!isBlockListItemChild(block)) {
      const text = formatInline(block).trim();
      if (text) {
        texts.push(text);
      }
      continue;
    }
    let text = "";
    if (block.name === "paragraph") {
      text = formatParagraph(block).trim();
    } else if (block.name === "list") {
      text = formatList(block);
    } else {
      text = formatBlock(block).trim();
    }
    if (text) {
      texts.push(text);
    }
  }
  if (texts.length === 0) {
    return "";
  }
  if (texts.length === 1) {
    return texts[0];
  }
  return texts.join(`

`);
}
function formatDefinitionList(node) {
  const items = node.children.filter((c) => c.type === "element" && c.name === "item");
  const baseIndent = parseInt(node.attributes.get("_indent") || "0", 10);
  const termSpaces = " ".repeat(baseIndent);
  const formatted = items.map((item) => {
    const termNode = item.children.find((c) => c.type === "element" && c.name === "term");
    const defNode = item.children.find((c) => c.type === "element" && c.name === "definition");
    const term = termNode ? formatChildren(termNode).trim() : "";
    const definition = defNode ? formatChildren(defNode).trim() : "";
    const termLine = `${termSpaces}${term}::`;
    if (definition) {
      const defSpaces = " ".repeat(baseIndent + 3);
      const defLines = definition.split(`
`);
      const indentedDef = defLines.map((line) => `${defSpaces}${line.replace(/[ \t]+$/g, "")}`).join(`
`);
      return `${termLine}

${indentedDef}`;
    }
    return termLine;
  });
  return formatted.join(`

`);
}
function formatParagraph(node) {
  return formatChildren(node);
}
function formatPreformatted(node) {
  const lang = node.attributes.get("data-lang") || "";
  const output = node.attributes.get("data-output") || "";
  const content = formatChildren(node);
  const format = node.attributes.get("_format") || "fenced";
  if (format === "fenced" || lang || output) {
    let fence = "```";
    if (lang) {
      fence += lang;
    }
    if (output) {
      fence += ` > ${output}`;
    }
    return `${fence}
${content}
\`\`\``;
  }
  const lines = content.split(`
`);
  const formatted = lines.map((line) => `>   ${line}`);
  return formatted.join(`
`);
}
function formatTable(node) {
  const rows = node.children.filter((c) => c.type === "element" && c.name === "row");
  const formatted = rows.map((row) => {
    const cells = row.children.filter((c) => c.type === "element" && c.name === "cell");
    const cellTexts = cells.map(formatInline);
    return `| ${cellTexts.join(" | ")} |`;
  });
  return formatted.join(`
`);
}
function formatTaggedBlock(node) {
  const tag = node.attributes.get("tag") || "Note";
  const content = formatChildren(node).trim();
  const indent = parseInt(node.attributes.get("_indent") || "0", 10);
  const spaces = " ".repeat(indent);
  const contentLength = content.split(`
`)[0]?.length || 0;
  const minLength = Math.max(tag.length + 3, contentLength + 3, 20);
  const underline = "_".repeat(minLength);
  if (content) {
    return `${spaces}${tag}${underline}
${content}
${spaces}${underline}`;
  }
  return `${spaces}${tag}${underline}
${spaces}${underline}`;
}
function formatLink(node) {
  const type = node.attributes.get("type") || "url";
  const target = node.attributes.get("target") || "";
  const text = formatChildren(node);
  if (type === "ref") {
    return `[${text}][${target}]`;
  }
  return `[${text}](${target})`;
}
function formatTarget(node) {
  const name = node.attributes.get("name") || "";
  const text = formatChildren(node);
  if (text && text !== name) {
    return `|${name}:${text}|`;
  }
  return `|${name}|`;
}
function formatMarkup(node) {
  const tag = node.attributes.get("tag") || "div";
  const attrs = [];
  for (const [key, value] of node.attributes) {
    if (key !== "tag" && !key.startsWith("_")) {
      attrs.push(`${key}="${value}"`);
    }
  }
  const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  const content = formatChildren(node);
  if (content) {
    return `<${tag}${attrStr}>${content}</${tag}>`;
  }
  return `<${tag}${attrStr} />`;
}
const textoBackend = (doc) => formatTexto(doc);

export { formatTexto, textoBackend };
