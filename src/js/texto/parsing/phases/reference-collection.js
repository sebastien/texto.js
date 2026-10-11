class ReferenceCollectionPhase {
  name = "reference-collection";
  phaseType = "pre-parse";
  references = new Map;
  execute(input, _context, _document) {
    this.references.clear();
    this.collectReferences(input);
    const data = new Map;
    data.set("references", this.references);
    return { data, continue: true };
  }
  collectReferences(text) {
    const lines = text.split(`
`);
    let inCodeBlock = false;
    let codeBlockFence = "";
    for (let i = 0;i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
        const fence = trimmed.slice(0, 3);
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockFence = fence;
        } else if (trimmed.startsWith(codeBlockFence)) {
          inCodeBlock = false;
          codeBlockFence = "";
        }
        continue;
      }
      if (inCodeBlock) {
        continue;
      }
      const ref = this.parseReferenceDefinition(lines, i);
      if (ref) {
        const normalizedLabel = ref.label.toLowerCase().trim().replace(/\s+/g, " ");
        this.references.set(normalizedLabel, ref);
        i += this.countConsumedLines(lines, i, ref) - 1;
      }
    }
  }
  parseReferenceDefinition(lines, startIndex) {
    const firstLine = lines[startIndex];
    const trimmed = firstLine.trimStart();
    const labelMatch = trimmed.match(/^\[([^\]]+)\]:\s*/);
    if (!labelMatch) {
      return null;
    }
    const label = labelMatch[1];
    let remaining = trimmed.slice(labelMatch[0].length);
    let url = "";
    let title = "";
    let _consumedLines = 1;
    if (remaining.startsWith("<")) {
      const urlEnd = remaining.indexOf(">", 1);
      if (urlEnd === -1) {
        return null;
      }
      url = remaining.slice(1, urlEnd);
      remaining = remaining.slice(urlEnd + 1).trimStart();
    } else {
      const urlMatch = remaining.match(/^[^\s]+/);
      if (urlMatch) {
        url = urlMatch[0];
        remaining = remaining.slice(url.length).trimStart();
      }
    }
    if (!url) {
      return null;
    }
    if (remaining) {
      const titleResult = this.extractTitle(remaining);
      if (titleResult) {
        title = titleResult.title;
      }
    }
    if (!title && startIndex + 1 < lines.length) {
      const nextLine = lines[startIndex + 1];
      const nextTrimmed = nextLine.trim();
      if (nextTrimmed.startsWith('"') || nextTrimmed.startsWith("'") || nextTrimmed.startsWith("(")) {
        const titleResult = this.extractTitle(nextTrimmed);
        if (titleResult && !titleResult.remaining) {
          title = titleResult.title;
          _consumedLines++;
        }
      }
    }
    return {
      label,
      url,
      title,
      line: startIndex + 1
    };
  }
  extractTitle(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('"')) {
      const end = trimmed.indexOf('"', 1);
      if (end !== -1) {
        return {
          title: trimmed.slice(1, end),
          remaining: trimmed.slice(end + 1).trim()
        };
      }
    } else if (trimmed.startsWith("'")) {
      const end = trimmed.indexOf("'", 1);
      if (end !== -1) {
        return {
          title: trimmed.slice(1, end),
          remaining: trimmed.slice(end + 1).trim()
        };
      }
    } else if (trimmed.startsWith("(")) {
      const end = trimmed.indexOf(")", 1);
      if (end !== -1) {
        return {
          title: trimmed.slice(1, end),
          remaining: trimmed.slice(end + 1).trim()
        };
      }
    }
    return null;
  }
  countConsumedLines(lines, startIndex, ref) {
    let count = 1;
    if (startIndex + 1 < lines.length) {
      const nextLine = lines[startIndex + 1].trim();
      if ((nextLine.startsWith('"') || nextLine.startsWith("'") || nextLine.startsWith("(")) && ref.title) {
        count++;
      }
    }
    return count;
  }
  getReferences() {
    return new Map(this.references);
  }
  lookup(label) {
    const normalized = label.toLowerCase().trim().replace(/\s+/g, " ");
    return this.references.get(normalized);
  }
}

export { ReferenceCollectionPhase };
