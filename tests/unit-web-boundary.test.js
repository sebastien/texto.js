import { describe, expect, test } from "bun:test";
import { existsSync, globSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// The web entry point (index.js) must stay loadable in a browser: no Node
// builtins, no bare specifiers, no TypeScript sources, no Node-only globals.
// This test mechanically enforces that boundary by walking the import graph.

const ROOT = resolve(import.meta.dirname, "..");
const ENTRY = join(ROOT, "src/js/texto/index.js");

// Everything Node-only lives under this one subtree, so the boundary is a path
// convention rather than a list to maintain: adding a Node-only module means
// putting it under server/, and the checks below cover it with no edit here.
// (See the "layering" test, which pins server/ as the Node surface.)
const NODE_ONLY_SUBTREE = "src/js/texto/server/";

// Patterns that would break or pollute a browser environment. These apply
// anywhere in the web graph, so they catch Node-isms even outside the subtree.
const FORBIDDEN = [
  { pattern: /^node:/, reason: "node: builtin import" },
  { pattern: /\.ts(["']|$)/, reason: "TypeScript source import" },
  { pattern: /(?<![\w.$])process\s*\./, reason: "process global access" },
  { pattern: /(?<![\w.$])Buffer\s*\./, reason: "Buffer global access" },
  { pattern: /import\.meta(?!\.url)/, reason: "Node-flavored import.meta usage" },
  { pattern: /(?<![\w.$])require\s*\(/, reason: "CommonJS require()" }
];

// Files that MUST be reachable (the web surface stays feature-complete).
const REQUIRED_FILES = [
  "src/js/texto/frontends/html.js",
  "src/js/texto/frontends/index.js",
  "src/js/texto/frontends/markdown.js",
  "src/js/texto/frontends/texto.js",
  "src/js/texto/backends/index.js",
  "src/js/texto/delta.js"
];

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith("."))
    return { bare: specifier };
  const target = resolve(dirname(fromFile), specifier);
  for (const candidate of [target, target + ".js", target + ".ts", join(target, "index.js")]) {
    if (existsSync(candidate))
      return { file: candidate };
  }
  return { unresolved: specifier };
}

function extractSpecifiers(source) {
  const specifiers = [];
  // Strip comments first, so a mention of `import` in prose or a trailing
  // note can never be mistaken for a declaration.
  const cleaned = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // Every declaration is bounded by its terminating ';', so a side-effect
  // `import "./x";` can never be swallowed by an unrelated `from "..."`
  // appearing further down the file — which the previous regex did exactly.
  // This one pattern covers static imports, export-from, bare side-effect
  // imports, and dynamic import("...") alike.
  const keywordRe = /(?:^|[\s;}])(?:import|export)\b/g;
  const quotedRe = /["']([^"']+)["']/;
  let match;
  while ((match = keywordRe.exec(cleaned))) {
    const body = cleaned.slice(match.index + match[0].length).split(";")[0];
    const quoted = quotedRe.exec(body);
    if (quoted)
      specifiers.push(quoted[1]);
  }
  return specifiers;
}

function walkImportGraph(entry) {
  const files = [];
  const externals = new Map();
  const unresolved = [];
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file))
      continue;
    seen.add(file);
    files.push(file);
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch  {
      continue;
    }
    for (const specifier of extractSpecifiers(source)) {
      const resolved = resolveImport(file, specifier);
      if (resolved.file) {
        queue.push(resolved.file);
      } else if (resolved.bare) {
        externals.set(resolved.bare, file);
      } else {
        unresolved.push(`${specifier} (from ${file})`);
      }
    }
  }
  return { files, externals, unresolved };
}

function rel(file) {
  return file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file;
}

describe("Web entry boundary", () => {
  const graph = walkImportGraph(ENTRY);

  test("all imports resolve", () => {
    expect(graph.unresolved).toEqual([]);
  });

  test("no bare or node: specifiers in the web graph", () => {
    expect([...graph.externals.keys()]).toEqual([]);
  });

  test("web graph stays inside src/js/texto (no deps/ imports)", () => {
    const outside = graph.files.map(rel).filter((f) => !f.startsWith("src/js/texto/"));
    expect(outside).toEqual([]);
  });

  test("no TypeScript files in the web graph", () => {
    const tsFiles = graph.files.filter((f) => f.endsWith(".ts"));
    expect(tsFiles.map(rel)).toEqual([]);
  });

  test("no Node-only globals or API in the web graph", () => {
    const offenders = [];
    for (const file of graph.files) {
      const source = readFileSync(file, "utf8");
      for (const { pattern, reason } of FORBIDDEN) {
        if (pattern.test(source))
          offenders.push(`${rel(file)}: ${reason}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no module from the Node-only subtree is reachable from the web entry", () => {
    const leaked = graph.files.map(rel).filter((f) => f.startsWith(NODE_ONLY_SUBTREE));
    expect(leaked).toEqual([]);
  });

  test("the Node-only subtree is where the Node surface actually lives", () => {
    // Non-enumerating on purpose: any new file dropped under server/ is
    // covered by the reachability check above without editing this test.
    const files = globSync(join(ROOT, NODE_ONLY_SUBTREE, "**/*.js"));
    expect(files.length).toBeGreaterThan(0);
  });

  test("layering: server/ builds on the web entry, never the reverse", () => {
    const serverSource = readFileSync(join(ROOT, NODE_ONLY_SUBTREE, "index.js"), "utf8");
    expect(serverSource).toContain(`"../index.js"`);
    const webSource = readFileSync(ENTRY, "utf8");
    expect(webSource).not.toContain("server/");
  });

  test("web surface keeps its full feature set (html input included)", () => {
    const reachable = new Set(graph.files.map(rel));
    const missing = REQUIRED_FILES.filter((f) => !reachable.has(f));
    expect(missing).toEqual([]);
  });
});
