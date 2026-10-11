import { ReferenceCollectionPhase } from "../parsing/phases/reference-collection.js";
import { TextoParser } from "../texto.js";

class MarkdownParser extends TextoParser {
  referencePhase;
  constructor(options = {}) {
    const referencePhase = new ReferenceCollectionPhase;
    super({
      blockParsers: options.blockParsers,
      inlineParsers: options.inlineParsers,
      preParsePhases: [referencePhase]
    });
    this.referencePhase = referencePhase;
  }
  lookupReference(label) {
    return this.referencePhase.lookup(label);
  }
  getReferences() {
    return this.referencePhase.getReferences();
  }
}

export { MarkdownParser };
