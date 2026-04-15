// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/cli/index
// Exposes the cli module entry points.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// CLI index - Main entry point for texto command-line tool

import { readFileSync, writeFileSync } from "node:fs";
import { args, type CLIMeta, type CLIParams, help } from "../utils/cli.ts";
import { type FormatOptions, formatCommand } from "./format.ts";
import { type ParseOptions, parseCommand } from "./parse.ts";

const version = "1.0.0";

const meta: CLIMeta = {
	command: "texto",
	description: "Parse and format Texto documents",
	version,
	width: 80,
};

const mainParams: CLIParams = {
	from: {
		name: "from",
		short: "f",
		long: "from",
		type: "string",
		description: "Parser profile (texto, markdown, auto)",
		default: "auto",
		choices: ["texto", "markdown", "md", "auto"],
	},
	to: {
		name: "to",
		short: "t",
		long: "to",
		type: "string",
		description: "Output format (json, html, xml, texto)",
		default: "html",
		choices: ["json", "html", "xml", "texto"],
	},
	output: {
		name: "output",
		short: "o",
		long: "output",
		type: "string",
		description: "Output file path (stdout if not provided)",
	},
	help: {
		name: "help",
		short: "h",
		long: "help",
		type: "boolean",
		description: "Show help message",
	},
};

const parseParams: CLIParams = {
	from: {
		name: "from",
		short: "f",
		long: "from",
		type: "string",
		description: "Parser profile (texto, markdown, auto)",
		default: "auto",
		choices: ["texto", "markdown", "md", "auto"],
	},
	to: {
		name: "to",
		short: "t",
		long: "to",
		type: "string",
		description: "Output format (json, html, xml, texto)",
		default: "json",
		choices: ["json", "html", "xml", "texto"],
	},
	positions: {
		name: "positions",
		long: "positions",
		type: "boolean",
		description: "Include source positions in output",
	},
	help: {
		name: "help",
		short: "h",
		long: "help",
		type: "boolean",
		description: "Show help message",
	},
};

const formatParams: CLIParams = {
	from: {
		name: "from",
		short: "f",
		long: "from",
		type: "string",
		description: "Parser profile (texto, markdown, auto)",
		default: "auto",
		choices: ["texto", "markdown", "md", "auto"],
	},
	help: {
		name: "help",
		short: "h",
		long: "help",
		type: "boolean",
		description: "Show help message",
	},
};

async function getInput(file?: string): Promise<string> {
	if (file) {
		try {
			return readFileSync(file, "utf8");
		} catch (error) {
			throw new Error(`Cannot read file: ${file} - ${error}`);
		}
	}
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString("utf8");
}

function writeOutput(outputPath: string | undefined, content: string): void {
	if (outputPath) {
		writeFileSync(outputPath, content, "utf8");
	} else {
		console.log(content);
	}
}

async function main(): Promise<void> {
	const commandArgs = process.argv.slice(2);

	if (commandArgs.length === 0) {
		printMainHelp();
		process.exit(0);
	}

	const firstArg = commandArgs[0];

	if (firstArg === "--help" || firstArg === "-h") {
		printMainHelp();
		process.exit(0);
	}

	if (firstArg === "--version" || firstArg === "-v") {
		console.log(version);
		process.exit(0);
	}

	const command = firstArg;
	const remainingArgs = commandArgs.slice(1);

	try {
		switch (command) {
			case "parse":
				await handleParse(remainingArgs);
				break;

			case "format":
				await handleFormat(remainingArgs);
				break;

			default:
				await handleMain(commandArgs);
		}
	} catch (error) {
		console.error(`Error: ${error}`);
		process.exit(1);
	}
}

async function handleMain(argsList: string[]): Promise<void> {
	const a = args(mainParams, ...argsList);

	if (a.help) {
		printMainHelp();
		process.exit(0);
	}

	const file = a._positional?.[0] as string | undefined;
	const input = await getInput(file);

	const profile = a.from as string;
	const toFormat = a.to as string;

	let parser: TextoParser;
	if (profile === "auto" || profile === undefined) {
		if (file) {
			if (file.endsWith(".md") || file.endsWith(".markdown")) {
				const { createMarkdownParser } = await import(
					"../profiles/markdown.ts"
				);
				parser = createMarkdownParser();
			} else {
				const { createTextoParser } = await import("../profiles/texto.ts");
				parser = createTextoParser();
			}
		} else {
			const { createTextoParser } = await import("../profiles/texto.ts");
			parser = createTextoParser();
		}
	} else if (profile === "markdown" || profile === "md") {
		const { createMarkdownParser } = await import("../profiles/markdown.ts");
		parser = createMarkdownParser();
	} else {
		const { createTextoParser } = await import("../profiles/texto.ts");
		parser = createTextoParser();
	}

	const doc = parser.parse(input);

	const { renderBackend } = await import("../backends/index.ts");
	const output = renderBackend(doc, toFormat, {});

	writeOutput(a.output as string | undefined, output);
}

async function handleParse(argsList: string[]): Promise<void> {
	const a = args(parseParams, ...argsList);

	if (a.help) {
		console.log(
			help(parseParams, {
				command: "texto parse",
				description: "Parse document and export AST to JSON",
				width: 80,
			}),
		);
		console.log("");
		console.log("Arguments:");
		console.log(
			"  file                    Input file (reads stdin if not provided)",
		);
		process.exit(0);
	}

	const file = a._positional?.[0] as string | undefined;
	const _input = await getInput(file);

	const options: ParseOptions = {
		file,
		profile: a.from as "texto" | "markdown" | "md" | "auto",
		format: a.to as "json" | "xml" | "html" | "texto",
		includePositions: a.positions as boolean,
	};

	const output = await parseCommand(options);
	writeOutput(undefined, output);
}

async function handleFormat(argsList: string[]): Promise<void> {
	const a = args(formatParams, ...argsList);

	if (a.help) {
		console.log(
			help(formatParams, {
				command: "texto format",
				description: "Parse and re-format texto document to texto markup",
				width: 80,
			}),
		);
		console.log("");
		console.log("Arguments:");
		console.log(
			"  file                    Input file (reads stdin if not provided)",
		);
		console.log("");
		console.log("Input can be:");
		console.log("  - Texto markup (.txto files)");
		console.log("  - Markdown (.md files)");
		console.log("  - JSON AST (auto-detected)");
		process.exit(0);
	}

	const file = a._positional?.[0] as string | undefined;
	const _input = await getInput(file);

	const options: FormatOptions = {
		file,
		profile: a.from as "texto" | "markdown" | "md" | "auto",
	};

	const output = await formatCommand(options);
	writeOutput(undefined, output);
}

function printMainHelp(): void {
	console.log(help(mainParams, meta));
	console.log("");
	console.log("Commands:");
	console.log(
		"  parse                    Parse document and export AST to JSON",
	);
	console.log("  format                   Parse and re-format to texto markup");
	console.log("  --help                   Show this help");
	console.log("  --version                Show version");
	console.log("");
	console.log("Examples:");
	console.log("  texto doc.txto                    # Parse and output HTML");
	console.log("  texto -f markdown doc.md         # Force markdown profile");
	console.log("  texto -t json -o out.json doc    # JSON output to file");
	console.log("  texto parse doc.md               # Export AST as JSON");
	console.log("  texto format doc.md              # Convert to texto markup");
	console.log("  echo '# Hi' | texto               # Parse stdin");
}

// Run CLI
if (import.meta.main) {
	main().catch((error) => {
		console.error(`Fatal error: ${error}`);
		process.exit(2);
	});
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { formatCommand, main, parseCommand };

// EOF
