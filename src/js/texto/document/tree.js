function getChildren(node) {
  return node.children;
}
function getFirstChild(node) {
  return node.children[0] || null;
}
function getLastChild(node) {
  return node.children[node.children.length - 1] || null;
}
function findChild(node, predicate) {
  for (const child of node.children) {
    if (predicate(child)) {
      return child;
    }
  }
  return null;
}
function findChildren(node, predicate) {
  return node.children.filter(predicate);
}
function findDescendants(node, name) {
  const results = [];
  for (const child of node.children) {
    if (child.type === "element" && child.name === name) {
      results.push(child);
    }
    results.push(...findDescendants(child, name));
  }
  return results;
}
function getElementsByName(node, name) {
  return findDescendants(node, name);
}

export {
  findChild,
  findChildren,
  findDescendants,
  getChildren,
  getElementsByName,
  getFirstChild,
  getLastChild
};
