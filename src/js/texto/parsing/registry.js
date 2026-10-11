class ParserRegistry {
  parsers = new Map;
  order = [];
  register(parser, priority = 20) {
    this.parsers.set(parser.name, parser);
    this.order = this.order.filter((entry) => entry.name !== parser.name);
    this.order.push({ name: parser.name, priority });
    this.order.sort((a, b) => a.priority - b.priority);
  }
  unregister(name) {
    this.parsers.delete(name);
    this.order = this.order.filter((entry) => entry.name !== name);
  }
  get(name) {
    return this.parsers.get(name);
  }
  getOrdered() {
    return this.order.map((entry) => this.parsers.get(entry.name)).filter((parser) => parser !== undefined);
  }
  has(name) {
    return this.parsers.has(name);
  }
  clear() {
    this.parsers.clear();
    this.order = [];
  }
}

export { ParserRegistry };
