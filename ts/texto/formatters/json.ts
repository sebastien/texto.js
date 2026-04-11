// JSON formatter - Convert AST to JSON output

import { Document, Node } from '../utils/types.ts';

interface JSONOptions {
  includePositions?: boolean;
}

export function formatJSON(doc: Document, options: JSONOptions = {}): string {
  const obj = documentToObject(doc, options);
  return JSON.stringify(obj, null, 2);
}

function documentToObject(doc: Document, options: JSONOptions): unknown {
  return {
    type: 'document',
    header: nodeToObject(doc.header, options),
    content: nodeToObject(doc.content, options),
    references: nodeToObject(doc.references, options),
    appendices: nodeToObject(doc.appendices, options)
  };
}

function nodeToObject(node: Node, options: JSONOptions): unknown {
  const base: Record<string, unknown> = {
    type: node.type
  };

  if (options.includePositions && node.position) {
    base.position = {
      start: node.position.start,
      end: node.position.end,
      line: node.position.line,
      column: node.position.column
    };
  }

  if (node.type === 'element') {
    base.tagName = node.tagName;
    
    // Convert attributes Map to plain object
    if (node.attributes.size > 0) {
      const attrs: Record<string, string> = {};
      for (const [key, value] of node.attributes) {
        attrs[key] = value;
      }
      base.attributes = attrs;
    }
    
    // Recurse into children
    if (node.children.length > 0) {
      base.children = node.children.map((child) => nodeToObject(child, options));
    }
  } else if (node.type === 'text') {
    base.content = node.content;
  } else if (node.type === 'comment') {
    base.content = node.content;
  }

  return base;
}

// Convenience function for one-off formatting
export function toJSON(node: Document | Node, includePositions = false): string {
  if (node.type === 'document') {
    return formatJSON(node as Document, { includePositions });
  }
  return JSON.stringify(nodeToObject(node as Node, { includePositions }), null, 2);
}
