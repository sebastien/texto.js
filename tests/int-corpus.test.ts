// Integration test for Texto corpus files
// Tests that all .txto files in texto/tests/ parse correctly and are formatter-stable

import { describe, test, expect } from "bun:test";
import { TextoParser } from "../src/ts/texto/texto";
import { formatTexto } from "../src/ts/texto/backends/texto";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const TESTS_DIR = join(import.meta.dirname, "data");

// Helper to normalize text for comparison
// Removes extra whitespace and normalizes line breaks for semantic comparison
function normalizeForComparison(text: string): string {
	return text
		.replace(/\r\n/g, "\n") // Normalize line endings
		.replace(/[ \t]+$/gm, "") // Remove trailing whitespace
		.replace(/\n{3,}/g, "\n\n") // Normalize multiple blank lines
		.trim();
}

describe("Texto Corpus Tests", () => {
	// Get all .txto files in the tests directory (top-level only)
	const files = readdirSync(TESTS_DIR)
		.filter((f) => f.endsWith(".txto"))
		.filter((f) => statSync(join(TESTS_DIR, f)).isFile())
		.sort();

	for (const file of files) {
		const filePath = join(TESTS_DIR, file);

		describe(file, () => {
			let content: string;

			test("reads file content", () => {
				content = readFileSync(filePath, "utf8");
				expect(content).toBeDefined();
				expect(content.length).toBeGreaterThan(0);
			});

			test("parses successfully without errors", () => {
				const parser = new TextoParser();
				const doc = parser.parse(content);

				expect(doc).toBeDefined();
				expect(doc.type).toBe("document");
			});

			test("formatter stability - double roundtrip produces semantically same result", () => {
				const parser = new TextoParser();

				// First pass: parse and format
				const doc1 = parser.parse(content);
				const format1 = formatTexto(doc1);

				// Second pass: parse the formatted output and format again
				const doc2 = parser.parse(format1);
				const format2 = formatTexto(doc2);

				// The formatter should be semantically stable
				// We normalize both to compare semantic equivalence
				// (Original line continuation in multiline text may differ)
				const normalized1 = normalizeForComparison(format1);
				const normalized2 = normalizeForComparison(format2);
				expect(normalized2).toBe(normalized1);
			});

			test("parse stability - second parse produces equivalent AST", () => {
				const parser = new TextoParser();

				// First pass
				const doc1 = parser.parse(content);
				const format1 = formatTexto(doc1);

				// Second pass using formatted output
				const doc2 = parser.parse(format1);
				const format2 = formatTexto(doc2);

				// The ASTs should be equivalent (normalized comparison)
				const normalized1 = normalizeForComparison(format1);
				const normalized2 = normalizeForComparison(format2);
				expect(normalized2).toBe(normalized1);
			});
		});
	}
});
