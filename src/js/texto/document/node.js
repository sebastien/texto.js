let nextNodeId = 1;
function resetNodeIdCounter(start = 1) {
  nextNodeId = Math.max(1, start);
}
function allocateNodeId() {
  const id = nextNodeId;
  nextNodeId += 1;
  return id;
}
function createElement(name, attributes = {}, position) {
  return {
    id: allocateNodeId(),
    type: "element",
    name,
    attributes: new Map(Object.entries(attributes)),
    children: [],
    position
  };
}
function createText(content, position) {
  return {
    id: allocateNodeId(),
    type: "text",
    content,
    attributes: new Map,
    children: [],
    position
  };
}
function createComment(content, position) {
  return {
    id: allocateNodeId(),
    type: "comment",
    content,
    attributes: new Map,
    children: [],
    position
  };
}
function appendChild(parent, child) {
  parent.children.push(child);
}
function setAttribute(node, key, value) {
  node.attributes.set(key, value);
}
function getAttribute(node, key) {
  return node.attributes.get(key);
}
function hasAttribute(node, key) {
  return node.attributes.has(key);
}
function removeAttribute(node, key) {
  node.attributes.delete(key);
}
function isElement(node) {
  return node.type === "element";
}
function isText(node) {
  return node.type === "text";
}
function isComment(node) {
  return node.type === "comment";
}

export {
  appendChild,
  createComment,
  createElement,
  createText,
  getAttribute,
  hasAttribute,
  isComment,
  isElement,
  isText,
  removeAttribute,
  resetNodeIdCounter,
  setAttribute
};
