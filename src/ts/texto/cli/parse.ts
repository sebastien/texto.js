// CLI parse command - Parse texto to backend output

import { readFileSync } from "node:fs";
import { renderBackend } from "../backends/index.ts";
import { createMarkdownParser } from "../profiles/markdown.ts";
import { createTextoParser } from "../profiles/texto.ts";
import { TextoParser } from "../texto.ts";

export interface ParseOptions {
	file?: string;
	profile?: "texto" | "markdown" | "md" | "auto";
	format?: "json" | "xml" | "html" | string;
	includePositions?: boolean;
}

/**
 * Detect profile from file extension
 */
function detectProfileFromFile(filePath: string): "texto" | "markdown" {
	if (filePath.endsWith(".md") || filePath.endsWith(".markdown")) {
		return "markdown";
	}
	if (filePath.endsWith(".txto")) {
		return "texto";
	}
	// Default to texto for unknown extensions
	return "texto";
}

/**
 * Create parser based on profile
 */
function createParser(profile: "texto" | "markdown"): TextoParser {
	switch (profile) {
		case "markdown":
		case "md":
			return createMarkdownParser();
		case "texto":
		default:
			return createTextoParser();
	}
}

export async function parseCommand(options: ParseOptions): Promise<string> {
	let input: string;

	// Read input from file or stdin
	if (options.file) {
		try {
			input = readFileSync(options.file, "utf8");
		} catch (error) {
			throw new Error(`Cannot read file: ${options.file} - ${error}`);
		}
	} else {
		// Read from stdin
		const chunks: Buffer[] = [];
		for await (const chunk of process.stdin) {
			chunks.push(chunk);
		}
		input = Buffer.concat(chunks).toString("utf8");
	}

	// Determine profile
	let profile: "texto" | "markdown";
	if (options.profile && options.profile !== "auto") {
		profile = options.profile === "md" ? "markdown" : options.profile;
	} else if (options.file) {
		profile = detectProfileFromFile(options.file);
	} else {
		profile = "texto"; // Default for stdin
	}

	// Create appropriate parser
	const parser = createParser(profile);

	// Parse the document
	const doc = parser.parse(input);

	// Render with output backend
	return renderBackend(doc, options.format || "json", {
		includePositions: options.includePositions,
	});
}
