function getElementChild(node, name) {
  return node.children.find((child) => child.type === "element" && child.name === name);
}
function getElementChildren(node, name) {
  return node.children.filter((child) => child.type === "element" && child.name === name);
}
function renderInlineChildren(node, renderInline) {
  return node.children.map((child) => renderInline(child)).join("");
}
function renderBlockChildren(node, renderBlock) {
  const blocks = node.children.map((child) => renderBlock(child)).filter(Boolean);
  return blocks.join(`

`);
}
function indentBlock(text, prefix) {
  return text.split(`
`).map((line) => `${prefix}${line}`).join(`
`);
}
function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function getSectionParts(node) {
  return {
    depth: Math.max(1, parseInt(node.attributes.get("depth") || "1", 10)),
    title: getElementChild(node, "title"),
    content: getElementChild(node, "content")
  };
}

export {
  escapeAttribute,
  getElementChild,
  getElementChildren,
  getSectionParts,
  indentBlock,
  renderBlockChildren,
  renderInlineChildren
};
