import { TextoParser, formatJSON, toJSON } from "../src/js/texto/index.js";
const markup = `
# Hello World

This is a **bold** paragraph with _emphasis_.

\`\`\`typescript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

## Lists and More

- First item
- Second item with **bold text**
- Third item

That's it!
`;
const parser = new TextoParser;
const doc = parser.parse(markup);
function printNodeTree(node, indent = "") {
  let posInfo = "";
  if (node.position) {
    const { start, end, line, column } = node.position;
    posInfo = ` [${start}-${end}, line ${line}, col ${column}]`;
  }
  if (node.type === "element") {
    console.log(`${indent}${node.tagName}${posInfo}`);
    if (node.attributes.size > 0) {
      const attrs = Array.from(node.attributes.entries()).map(([k, v]) => `${k}="${v}"`).join(" ");
      console.log(`${indent}  attributes: { ${attrs} }`);
    }
  } else if (node.type === "text") {
    const content = node.content?.substring(0, 50) || "";
    const ellipsis = (node.content?.length || 0) > 50 ? "..." : "";
    console.log(`${indent}text: "${content}${ellipsis}"${posInfo}`);
  } else if (node.type === "comment") {
    console.log(`${indent}comment: "${node.content}"${posInfo}`);
  }
  for (const child of node.children) {
    printNodeTree(child, indent + "  ");
  }
}
function findNodesByTag(node, tagName, results = []) {
  if (node.type === "element" && node.tagName === tagName && node.position) {
    results.push({ node, position: node.position });
  }
  for (const child of node.children) {
    findNodesByTag(child, tagName, results);
  }
  return results;
}
console.log("=".repeat(60));
console.log("EXAMPLE: Parsing Texto Markup with Offset Tracking");
console.log("=".repeat(60));
console.log();
console.log("1. DOCUMENT TREE WITH SOURCE OFFSETS:");
console.log("-".repeat(40));
console.log(`Document content has ${doc.content.children.length} top-level blocks:`);
console.log();
for (const child of doc.content.children) {
  printNodeTree(child);
  console.log();
}
console.log("2. FIND ELEMENTS WITH POSITIONS:");
console.log("-".repeat(40));
const sections = findNodesByTag(doc.content, "section");
console.log(`Found ${sections.length} section(s):`);
for (const { node, position } of sections) {
  const titleAttr = node.attributes.get("data-title") || "untitled";
  console.log(`  - Section "${titleAttr}" at offset ${position.start}-${position.end} (line ${position.line})`);
}
const paragraphs = findNodesByTag(doc.content, "p");
console.log(`
Found ${paragraphs.length} paragraph(s):`);
for (const { node, position } of paragraphs.slice(0, 3)) {
  console.log(`  - Paragraph at offset ${position.start}-${position.end} (line ${position.line})`);
}
const preBlocks = findNodesByTag(doc.content, "pre");
console.log(`
Found ${preBlocks.length} preformatted block(s):`);
for (const { node, position } of preBlocks) {
  const lang = node.attributes.get("data-lang") || "none";
  console.log(`  - Code block (lang=${lang}) at offset ${position.start}-${position.end} (line ${position.line})`);
}
console.log(`
3. JSON OUTPUT WITH POSITIONS:`);
console.log("-".repeat(40));
console.log("Use formatJSON(doc, { includePositions: true }) to get JSON with offsets");
console.log();
const jsonOutput = formatJSON(doc, { includePositions: true });
const parsed = JSON.parse(jsonOutput);
const sampleNode = parsed.content;
console.log("JSON structure preview:");
console.log(JSON.stringify({
  type: sampleNode.type,
  position: sampleNode.position,
  children: sampleNode.children?.slice(0, 2).map((c) => ({
    type: c.type,
    tagName: c.tagName,
    position: c.position
  }))
}, null, 2));
console.log(`
4. WORKING WITH OFFSETS PROGRAMMATICALLY:`);
console.log("-".repeat(40));
function getSourceText(position) {
  return markup.substring(position.start, position.end);
}
if (preBlocks.length > 0) {
  const firstPre = preBlocks[0];
  console.log("Source text for first code block:");
  console.log("-".repeat(30));
  console.log(getSourceText(firstPre.position));
  console.log("-".repeat(30));
}
console.log();
console.log("=".repeat(60));
console.log("Summary: Each node has a position property with:");
console.log("  - start: Start offset in source text");
console.log("  - end: End offset in source text");
console.log("  - line: Line number");
console.log("  - column: Column number");
console.log("=".repeat(60));
