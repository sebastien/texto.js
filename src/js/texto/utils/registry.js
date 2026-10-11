class Registry {
  items = new Map;
  register(key, value) {
    this.items.set(key, value);
  }
  get(key) {
    return this.items.get(key);
  }
  has(key) {
    return this.items.has(key);
  }
  unregister(key) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
  keys() {
    return [...this.items.keys()];
  }
  values() {
    return [...this.items.values()];
  }
  entries() {
    return [...this.items.entries()];
  }
}

export { Registry };
