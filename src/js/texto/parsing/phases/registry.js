class PhaseRegistry {
  preParsePhases = [];
  inlinePhases = [];
  postParsePhases = [];
  register(phase) {
    switch (phase.phaseType) {
      case "pre-parse":
        this.preParsePhases.push(phase);
        break;
      case "inline":
        this.inlinePhases.push(phase);
        break;
      case "post-parse":
        this.postParsePhases.push(phase);
        break;
    }
  }
  unregister(name) {
    this.preParsePhases = this.preParsePhases.filter((p) => p.name !== name);
    this.inlinePhases = this.inlinePhases.filter((p) => p.name !== name);
    this.postParsePhases = this.postParsePhases.filter((p) => p.name !== name);
  }
  getPreParsePhases() {
    return [...this.preParsePhases];
  }
  getInlinePhases() {
    return [...this.inlinePhases];
  }
  getPostParsePhases() {
    return [...this.postParsePhases];
  }
  hasPhase(name) {
    return this.preParsePhases.some((p) => p.name === name) || this.inlinePhases.some((p) => p.name === name) || this.postParsePhases.some((p) => p.name === name);
  }
  clear() {
    this.preParsePhases = [];
    this.inlinePhases = [];
    this.postParsePhases = [];
  }
}

export { PhaseRegistry };
