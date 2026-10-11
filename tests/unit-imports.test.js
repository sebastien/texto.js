import { describe, test, expect } from "bun:test";
import {
  TextoParser,
  DocumentBuilder,
  Cursor,
  createElement
} from "../src/js/texto/index.js";
describe("Imports", () => {
  test("TextoParser can be instantiated", () => {
    const parser = new TextoParser;
    expect(parser).toBeDefined();
  });
  test("DocumentBuilder works", () => {
    const builder = new DocumentBuilder;
    const doc = builder.getDocument();
    expect(doc.type).toBe("document");
  });
  test("Cursor works", () => {
    const cursor = new Cursor("hello world");
    expect(cursor.pos).toBe(0);
    expect(cursor.peek()).toBe("h");
  });
  test("createElement works", () => {
    const el = createElement("div", { class: "test" });
    expect(el.type).toBe("element");
    expect(el.name).toBe("div");
    expect(el.attributes.get("class")).toBe("test");
  });
});
