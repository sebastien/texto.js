import { describe, test, expect } from "bun:test";
import { IndentedPreBlockParser } from "../src/js/texto/parsers/block/indented-pre.js";
import { ParsingContext } from "../src/js/texto/parsing/context.js";
import { DocumentBuilder } from "../src/js/texto/document/builder.js";
import { Cursor } from "../src/js/texto/utils/cursor.js";
describe("IndentedPreBlockParser recognition", () => {
  const createContext = (text) => {
    const builder = new DocumentBuilder;
    const context = new ParsingContext(builder, text);
    context.setText(text);
    context.setCurrentBlock(0, text.length);
    return context;
  };
  test("recognises tab-indented pre line", () => {
    const parser = new IndentedPreBlockParser;
    const text = ">\tcontent";
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).not.toBeNull();
    expect(info?.type).toBe("indented-pre");
  });
  test("recognises space-indented pre line", () => {
    const parser = new IndentedPreBlockParser;
    const text = ">   content";
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).not.toBeNull();
    expect(info?.type).toBe("indented-pre");
  });
  test("recognises pre line with exactly 3 spaces", () => {
    const parser = new IndentedPreBlockParser;
    const text = ">   x";
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).not.toBeNull();
  });
  test("does not recognise only 2 spaces", () => {
    const parser = new IndentedPreBlockParser;
    const text = ">  x";
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).toBeNull();
  });
  test("does not recognise no indentation", () => {
    const parser = new IndentedPreBlockParser;
    const text = ">x";
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).toBeNull();
  });
  test("does not recognise without > marker", () => {
    const parser = new IndentedPreBlockParser;
    const text = "   content";
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).toBeNull();
  });
  test("does not recognise regular paragraph", () => {
    const parser = new IndentedPreBlockParser;
    const text = "Just a paragraph";
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).toBeNull();
  });
});
describe("IndentedPreBlockParser parsing", () => {
  const createContext = (text) => {
    const builder = new DocumentBuilder;
    const context = new ParsingContext(builder, text);
    context.setText(text);
    context.setCurrentBlock(0, text.length);
    return context;
  };
  test("parses single pre line", () => {
    const parser = new IndentedPreBlockParser;
    const text = `>   line1
`;
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).not.toBeNull();
    cursor.pos = 0;
    cursor.lineNumber = 1;
    cursor.columnNumber = 0;
    const result = parser.process(cursor, context, info);
    expect(result.node).not.toBeUndefined();
    expect(result.node.name).toBe("preformatted");
    expect(result.node.attributes.get("_format")).toBe("indented");
    expect(result.node.children[0].content).toBe("line1");
  });
  test("parses multiple pre lines", () => {
    const parser = new IndentedPreBlockParser;
    const text = `>   line1
>   line2
>   line3
`;
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).not.toBeNull();
    cursor.pos = 0;
    cursor.lineNumber = 1;
    cursor.columnNumber = 0;
    const result = parser.process(cursor, context, info);
    expect(result.node).not.toBeUndefined();
    expect(result.node.children[0].content).toBe(`line1
line2
line3`);
  });
  test("parses tab-indented lines", () => {
    const parser = new IndentedPreBlockParser;
    const text = `>	line1
>	line2
`;
    const context = createContext(text);
    const cursor = new Cursor(text);
    const info = parser.recognises(cursor, context);
    expect(info).not.toBeNull();
    cursor.pos = 0;
    cursor.lineNumber = 1;
    cursor.columnNumber = 0;
    const result = parser.process(cursor, context, info);
    expect(result.node).not.toBeUndefined();
    expect(result.node.children[0].content).toBe(`line1
line2`);
  });
});
