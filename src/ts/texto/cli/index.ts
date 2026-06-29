// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/cli/index
// Unified CLI entry point for converting between supported frontends/backends.

import { readFileSync, writeFileSync } from "node:fs";
import { renderBackend } from "../backends/index.ts";
import { parseFrontend } from "../frontends/registry.ts";
import { args, type CLIMeta, type CLIParams, help } from "../utils/cli.ts";

const version = "1.0.0";

interface CLIOptions {
	file?: string;
	profile?: "texto" | "markdown" | "md" | "html" | "auto";
	format?: "texto" | "markdown" | "html" | "json" | "xml" | "auto";
	includePositions?: boolean;
	bodyOnly?: boolean;
	strict?: boolean;
}

const meta: CLIMeta = {
	command: "texto",
	description: "Convert between texto, markdown, html, json and xml",
	version,
	width: 80,
};

const mainParams: CLIParams = {
	from: {
		name: "from",
		short: "f",
		long: "from",
		type: "string",
		description: "Input format (texto, markdown, html, auto)",
		default: "auto",
		choices: ["texto", "markdown", "md", "html", "auto"],
	},
	to: {
		name: "to",
		short: "t",
		long: "to",
		type: "string",
		description: "Output format (texto, markdown, html, json, xml, auto)",
		default: "auto",
		choices: ["texto", "markdown", "html", "json", "xml", "auto"],
	},
	output: {
		name: "output",
		short: "o",
		long: "output",
		type: "string",
		description: "Output file path (stdout if not provided)",
	},
	positions: {
		name: "positions",
		long: "positions",
		type: "boolean",
		description: "Include source positions in JSON/XML output",
	},
	bodyOnly: {
		name: "bodyOnly",
		long: "body-only",
		type: "boolean",
		description: "Emit only the inner HTML body content",
	},
	strict: {
		name: "strict",
		short: "s",
		long: "strict",
		type: "boolean",
		description: "Strip or unwrap unknown HTML tags on input",
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

function inferInputFormat(filePath?: string): "texto" | "markdown" | "html" {
	if (!filePath) return "texto";
	const normalized = filePath.toLowerCase();
	if (normalized.endsWith(".md") || normalized.endsWith(".markdown")) {
		return "markdown";
	}
	if (normalized.endsWith(".html") || normalized.endsWith(".htm")) {
		return "html";
	}
	return "texto";
}

function inferOutputFormat(
	outputPath?: string,
): "texto" | "markdown" | "html" | "json" | "xml" | null {
	if (!outputPath) return null;
	const normalized = outputPath.toLowerCase();
	if (normalized.endsWith(".txto")) return "texto";
	if (normalized.endsWith(".md") || normalized.endsWith(".markdown")) {
		return "markdown";
	}
	if (normalized.endsWith(".html") || normalized.endsWith(".htm")) {
		return "html";
	}
	if (normalized.endsWith(".json")) return "json";
	if (normalized.endsWith(".xml")) return "xml";
	return null;
}

async function renderCommand(options: CLIOptions): Promise<string> {
	const input = await getInput(options.file);
	const inputFormat =
		options.profile && options.profile !== "auto"
			? options.profile === "md"
				? "markdown"
				: options.profile
			: inferInputFormat(options.file);
	const outputFormat =
		options.format && options.format !== "auto" ? options.format : "html";
	const doc = parseFrontend(input, inputFormat, { strict: options.strict });
	return renderBackend(doc, outputFormat, {
		includePositions: options.includePositions,
		bodyOnly: options.bodyOnly,
	});
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
	if (["parse", "format", "convert"].includes(firstArg)) {
		throw new Error(
			`Subcommands have been removed. Use 'texto -f <format> -t <format> [file]' instead.`,
		);
	}

	const parsed = args(mainParams, ...commandArgs);
	if (parsed.help) {
		printMainHelp();
		process.exit(0);
	}

	const outputPath = parsed.output as string | undefined;
	const format =
		(parsed.to as CLIOptions["format"]) === "auto"
			? inferOutputFormat(outputPath) || "html"
			: (parsed.to as CLIOptions["format"]);
	const output = await renderCommand({
		file: parsed._positional?.[0] as string | undefined,
		profile: parsed.from as CLIOptions["profile"],
		format,
		includePositions: parsed.positions as boolean,
		bodyOnly: parsed.bodyOnly as boolean,
		strict: parsed.strict as boolean,
	});

	writeOutput(outputPath, output);
}

function printMainHelp(): void {
	console.log(help(mainParams, meta));
	console.log("");
	console.log("Arguments:");
	console.log("  file                    Input file (reads stdin if omitted)");
	console.log("");
	console.log("Input format is inferred from file extension when --from=auto:");
	console.log("  .txto                   Texto markup");
	console.log("  .md, .markdown          Markdown");
	console.log("  .html, .htm             HTML");
	console.log("");
	console.log("Output format is inferred from --output when --to=auto:");
	console.log("  .txto                   Texto markup");
	console.log("  .md, .markdown          Markdown");
	console.log("  .html, .htm             HTML");
	console.log("  .json                   JSON AST");
	console.log("  .xml                    XML AST");
	console.log("");
	console.log("Examples:");
	console.log("  texto doc.txto");
	console.log("  texto -f markdown -t html doc.md");
	console.log("  texto -f html -t texto doc.html");
	console.log("  texto -t markdown -o out.md doc.txto");
	console.log("  echo '# Hi' | texto -f markdown -t json");
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(`Fatal error: ${error}`);
		process.exit(2);
	});
}

export type { CLIOptions };
export { main, renderCommand };

// EOF
