import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { htmlToDocument, setHtmlParser } from "../src/js/texto/frontends/html.js";

// Exercises the non-browser seam in frontends/html.js. Bun ships no DOMParser,
// so parseHTML() takes the fallback branch unconditionally.
//
// NOTE: bun shares a single module registry across every test file in a run, so
// a fallback registered anywhere (here, or by any file importing
// server/domish.js) is visible to every other test. Nothing can read
// the currently registered fallback back, so each test clears it explicitly
// instead of relying on fresh module state.

function element(nodeName, childNodes = []) {
  return {
    nodeType: 1,
    nodeName,
    childNodes,
    getAttribute() {
      return null;
    }
  };
}

function text(data) {
  return { nodeType: 3, nodeName: "#text", data };
}

describe("HTML parser fallback (non-browser)", () => {
  test("Bun has no DOMParser, so the fallback branch is what runs", () => {
    expect(typeof DOMParser).toBe("undefined");
  });

  describe("with no fallback registered", () => {
    beforeEach(() => setHtmlParser(null));
    afterEach(() => setHtmlParser(null));

    test("throws instead of silently returning nothing", () => {
      expect(() => htmlToDocument("<p>hi</p>")).toThrow();
    });

    test("the error names both ways out: DOMParser and a fallback", () => {
      expect(() => htmlToDocument("<p>hi</p>")).toThrow(/DOMParser/);
      expect(() => htmlToDocument("<p>hi</p>")).toThrow(/fallback HTML parser/);
      expect(() => htmlToDocument("<p>hi</p>")).toThrow(/setHtmlParser/);
    });
  });

  describe("with a fallback registered", () => {
    const seen = [];

    beforeEach(() => {
      seen.length = 0;
      setHtmlParser((html) => {
        seen.push(html);
        // A bare <body> is a legal return value: FrontEndProcessor dispatches
        // it straight to onBody(). Document elements (<html>) are handled too.
        return element("body", [element("p", [text("hi")])]);
      });
    });
    afterEach(() => setHtmlParser(null));

    test("receives the raw input", () => {
      htmlToDocument("<p>hi</p>");
      expect(seen).toEqual(["<p>hi</p>"]);
    });

    test("its result is walked into a document", () => {
      const doc = htmlToDocument("<p>hi</p>");
      const paragraphs = doc.content.children.filter((node) => node.name === "paragraph");
      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].children[0].content).toBe("hi");
    });

    test("a document-element root is handled as well as a bare body", () => {
      setHtmlParser(() => element("html", [element("body", [element("p", [text("yo")])])]));
      const doc = htmlToDocument("<p>yo</p>");
      const paragraphs = doc.content.children.filter((node) => node.name === "paragraph");
      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].children[0].content).toBe("yo");
    });

    test("setHtmlParser(null) clears a previously registered fallback", () => {
      setHtmlParser(null);
      expect(() => htmlToDocument("<p>hi</p>")).toThrow(/fallback HTML parser/);
    });
  });
});
