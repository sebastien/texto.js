// CLI format command - Parse and re-format to texto

import { readFileSync } from "node:fs";
import { formatTexto } from "../formatters/texto.ts";
import { createMarkdownParser } from "../profiles/markdown.ts";
import { createTextoParser } from "../profiles/texto.ts";
import type { Document } from "../texto.ts";

export interface FormatOptions {
	file?: string;
	profile?: "texto" | "markdown" | "md" | "auto";
}

function detectProfileFromFile(filePath: string): "texto" | "markdown" {
	if (filePath.endsWith(".md") || filePath.endsWith(".markdown")) {
		return "markdown";
	}
	if (filePath.endsWith(".txto")) {
		return "texto";
	}
	return "texto";
}

function isJsonInput(input: string): boolean {
	const trimmed = input.trim();
	return (
		(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
		(trimmed.startsWith("[") && trimmed.endsWith("]"))
	);
}

export async function formatCommand(options: FormatOptions): Promise<string> {
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

	let doc: Document;

	// Check if input is JSON (AST)
	if (isJsonInput(input)) {
		try {
			const { deserializeDocument } = await import("../index.ts");
			doc = deserializeDocument(input);
		} catch (error) {
			throw new Error(
				`Failed to parse JSON input as AST: ${error}. Input must be a valid Texto JSON AST.`,
			);
		}
	} else {
		// Parse the document
		let profile: "texto" | "markdown";

		if (options.profile && options.profile !== "auto") {
			profile = options.profile === "md" ? "markdown" : options.profile;
		} else if (options.file) {
			profile = detectProfileFromFile(options.file);
		} else {
			profile = "texto"; // Default for stdin
		}

		const parser =
			profile === "markdown" ? createMarkdownParser() : createTextoParser();

		doc = parser.parse(input);
	}

	// Re-format as texto
	return formatTexto(doc);
}
