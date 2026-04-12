// Integration test for Markdown Test Suite
// Tests all core .md files in deps/md/tests/ (excluding extensions/)

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { renderBackend } from "../src/ts/texto/backends/index.ts";
import { createMarkdownParser } from "../src/ts/texto/profiles/markdown.ts";

const TESTS_DIR = join(import.meta.dirname, "../deps/md/tests");

/**
 * Normalize HTML for comparison by:
 * - Removing extra whitespace between tags (outside pre/code blocks)
 * - Normalizing line endings
 * - Standardizing self-closing tags
 * - Preserving whitespace inside <pre> and <code> blocks
 */
function normalizeHTML(html: string): string {
	// First, protect content inside <pre> and <code> blocks
	const preservedBlocks: string[] = [];
	let processed = html
		.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, (match) => {
			preservedBlocks.push(match);
			return `\x00${preservedBlocks.length - 1}\x00`;
		})
		.replace(/<code[^>]*>[\s\S]*?<\/code>/g, (match) => {
			// Only preserve if not already inside a pre block
			if (!match.includes("\x00")) {
				preservedBlocks.push(match);
				return `\x00${preservedBlocks.length - 1}\x00`;
			}
			return match;
		});

	// Normalize whitespace outside preserved blocks
	processed = processed
		.replace(/\r\n/g, "\n")
		.replace(/>\s+</g, "><")
		.replace(/\s+/g, " ")
		.replace(/<hr \/>/g, "<hr/>")
		.replace(/<img([^>]+)\/>/g, "<img$1>");

	// Restore preserved blocks
	for (let i = 0; i < preservedBlocks.length; i++) {
		processed = processed.replace(`\x00${i}\x00`, preservedBlocks[i]);
	}

	return processed.trim();
}

/**
 * Get all core markdown test files (excluding extensions/)
 */
function getTestFiles(): string[] {
	const files: string[] = [];
	const entries = readdirSync(TESTS_DIR, { withFileTypes: true });

	for (const entry of entries) {
		// Skip directories (like extensions/)
		if (entry.isDirectory()) continue;

		// Only include .md files
		if (entry.name.endsWith(".md")) {
			files.push(entry.name);
		}
	}

	return files.sort();
}

describe("Markdown Test Suite", () => {
	const testFiles = getTestFiles();

	// Log how many tests we're running
	console.log(`Running ${testFiles.length} markdown tests from ${TESTS_DIR}`);

	for (const file of testFiles) {
		const testName = file.replace(".md", "");

		test(testName, () => {
			// Read input markdown
			const mdPath = join(TESTS_DIR, file);
			const input = readFileSync(mdPath, "utf8");

			// Read expected output
			const outPath = join(TESTS_DIR, `${testName}.out`);
			let expected: string;
			try {
				expected = readFileSync(outPath, "utf8").trim();
			} catch (error) {
				throw new Error(`Missing expected output file: ${outPath}`);
			}

			// Parse with markdown profile
			const parser = createMarkdownParser();
			const doc = parser.parse(input);

			// Render to HTML
			const fullHTML = renderBackend(doc, "html");

			// Extract body content for comparison
			const bodyMatch = fullHTML.match(/<body>([\s\S]*?)<\/body>/);
			let actual = bodyMatch ? bodyMatch[1].trim() : fullHTML.trim();

			// Handle both wrapped and unwrapped expected outputs
			// Some .out files have <p>...</p> directly, others may have different structure
			// We normalize both for comparison
			const normalizedActual = normalizeHTML(actual);
			const normalizedExpected = normalizeHTML(expected);

			// For debugging failed tests
			if (normalizedActual !== normalizedExpected) {
				console.log(`\nTest: ${testName}`);
				console.log("Expected:", normalizedExpected);
				console.log("Actual:  ", normalizedActual);
			}

			expect(normalizedActual).toBe(normalizedExpected);
		});
	}
});
