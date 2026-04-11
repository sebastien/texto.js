// CLI format command - Parse and re-format to texto

import { readFileSync } from "node:fs";
import { formatTexto } from "../formatters/texto.ts";
import { TextoParser } from "../texto.ts";

export interface FormatOptions {
	file?: string;
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

	// Parse the document
	const parser = new TextoParser();
	const doc = parser.parse(input);

	// Re-format as texto
	return formatTexto(doc);
}
