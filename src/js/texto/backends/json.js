function formatJSON(doc, options = {}) {
  return JSON.stringify(documentToObject(doc, options), null, 2);
}
function documentToObject(doc, options) {
  return {
    type: "document",
    header: nodeToObject(doc.header, options),
    content: nodeToObject(doc.content, options),
    references: nodeToObject(doc.references, options),
    appendices: nodeToObject(doc.appendices, options)
  };
}
function nodeToObject(node, options) {
  const base = {
    id: node.id,
    type: node.type
  };
  if (options.includePositions && node.position) {
    base.position = {
      start: node.position.start,
      end: node.position.end,
      line: node.position.line,
      column: node.position.column,
      ...node.position.block !== undefined ? { block: node.position.block } : {}
    };
  }
  if (node.type === "element") {
    base.name = node.name;
    if (node.attributes.size > 0) {
      const attrs = {};
      for (const [key, value] of node.attributes) {
        attrs[key] = value;
      }
      base.attributes = attrs;
    }
    if (node.children.length > 0) {
      base.children = node.children.map((child) => nodeToObject(child, options));
    }
  } else if (node.type === "text" || node.type === "comment") {
    base.content = node.content;
  }
  return base;
}
function toJSON(node, includePositions = false) {
  if (node.type === "document") {
    return formatJSON(node, { includePositions });
  }
  return JSON.stringify(nodeToObject(node, { includePositions }), null, 2);
}
function deserializeDocument(jsonString) {
  const obj = JSON.parse(jsonString);
  function objectToNode(data) {
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid node data: expected object");
    }
    const record = data;
    const node = {
      id: typeof record.id === "number" ? record.id : Number(record.id ?? Number.NaN),
      type: record.type,
      attributes: new Map,
      children: []
    };
    if (!Number.isFinite(node.id)) {
      throw new Error("Invalid node data: expected numeric id");
    }
    if (record.name)
      node.name = record.name;
    if (record.content)
      node.content = record.content;
    if (record.attributes && typeof record.attributes === "object") {
      for (const [key, value] of Object.entries(record.attributes)) {
        node.attributes.set(key, value);
      }
    }
    if (record.children && Array.isArray(record.children)) {
      node.children = record.children.map(objectToNode);
    }
    if (record.position && typeof record.position === "object") {
      const pos = record.position;
      node.position = {
        start: pos.start,
        end: pos.end,
        line: pos.line,
        column: pos.column,
        ...pos.block !== undefined ? { block: pos.block } : {}
      };
    }
    return node;
  }
  const record = obj;
  if (record.type !== "document") {
    throw new Error("Invalid JSON: root must be a document");
  }
  return {
    type: "document",
    header: objectToNode(record.header),
    content: objectToNode(record.content),
    references: objectToNode(record.references),
    appendices: objectToNode(record.appendices)
  };
}
const jsonBackend = (doc, options = {}) => {
  return formatJSON(doc, { includePositions: options.includePositions });
};

export { deserializeDocument, formatJSON, jsonBackend, toJSON };
