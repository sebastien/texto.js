// CLI index - Main entry point for texto command-line tool

import type { CLIMeta } from "../utils/cli.ts";
import { type FormatOptions, formatCommand } from "./format.ts";
import { type ParseOptions, parseCommand } from "./parse.ts";

const meta: CLIMeta = {
	command: "texto",
	description: "Parse and format Texto documents",
	version: "1.0.0",
	width: 80,
};

// Parse simple flags manually
function parseFlags(args: string[]): {
	flags: Map<string, string | boolean>;
	positional: string[];
} {
	const flags = new Map<string, string | boolean>();
	const positional: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg.startsWith("--")) {
			const eqIdx = arg.indexOf("=");
			if (eqIdx > 0) {
				// --flag=value
				const name = arg.slice(2, eqIdx);
				const value = arg.slice(eqIdx + 1);
				flags.set(name, value);
			} else if (arg.startsWith("--no-")) {
				// --no-flag
				flags.set(arg.slice(5), false);
			} else {
				const name = arg.slice(2);
				if (
					(name === "type" || name === "profile") &&
					i + 1 < args.length &&
					!args[i + 1].startsWith("-")
				) {
					flags.set(name, args[i + 1]);
					i += 1;
				} else {
					// --flag (boolean)
					flags.set(name, true);
				}
			}
		} else if (arg.startsWith("-") && arg.length > 1) {
			// Short flag(s), with support for value flags like -txml or -pmarkdown
			const flagStr = arg.slice(1);
			if (flagStr.length > 1) {
				// Check if it's -t<value> or -p<value>
				if (flagStr[0] === "t") {
					flags.set("type", flagStr.slice(1));
				} else if (flagStr[0] === "p") {
					flags.set("profile", flagStr.slice(1));
				} else {
					for (const char of flagStr) {
						flags.set(char, true);
					}
				}
			} else if (
				flagStr === "t" &&
				i + 1 < args.length &&
				!args[i + 1].startsWith("-")
			) {
				flags.set("t", args[i + 1]);
				i += 1;
			} else if (
				flagStr === "p" &&
				i + 1 < args.length &&
				!args[i + 1].startsWith("-")
			) {
				flags.set("profile", args[i + 1]);
				i += 1;
			} else {
				for (const char of flagStr) {
					flags.set(char, true);
				}
			}
		} else {
			// Positional argument
			positional.push(arg);
		}
	}

	return { flags, positional };
}

async function main(): Promise<void> {
	const commandArgs = process.argv.slice(2);

	// No arguments or help flag
	if (commandArgs.length === 0) {
		printUsage();
		process.exit(0);
	}

	const firstArg = commandArgs[0];

	// Help flag
	if (firstArg === "--help" || firstArg === "-h") {
		printUsage();
		process.exit(0);
	}

	// Version flag
	if (firstArg === "--version" || firstArg === "-v") {
		console.log(meta.version);
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
				console.error(`Unknown command: ${command}`);
				printUsage();
				process.exit(1);
		}
	} catch (error) {
		console.error(`Error: ${error}`);
		process.exit(1);
	}
}

async function handleParse(argsList: string[]): Promise<void> {
	const { flags, positional } = parseFlags(argsList);

	if (flags.has("help") || flags.has("h")) {
		console.log("Usage: texto parse [options] [file]");
		console.log("");
		console.log("Parse document to an output backend");
		console.log("");
		console.log("Options:");
		console.log("  -h, --help              Show help");
		console.log(
			"  -p, --profile           Parser profile (texto, markdown, md, auto)",
		);
		console.log("  -t, --type              Output backend (json, xml, html)");
		console.log("  --positions             Include source positions");
		console.log("");
		console.log("Arguments:");
		console.log(
			"  file                    Input file (reads stdin if not provided)",
		);
		console.log("");
		console.log("Examples:");
		console.log(
			"  texto parse doc.md              # Auto-detect markdown from .md",
		);
		console.log(
			"  texto parse doc.txto            # Auto-detect texto from .txto",
		);
		console.log("  texto parse -p markdown file   # Force markdown profile");
		console.log(
			"  texto parse -p texto file.md   # Force texto profile on .md file",
		);
		console.log(
			"  texto parse -thtml file.md     # Markdown profile, HTML output",
		);
		console.log("  echo '# Hi' | texto parse      # Stdin with texto profile");
		process.exit(0);
	}

	const options: ParseOptions = {
		file: positional[0],
		profile: (typeof flags.get("profile") === "string"
			? (flags.get("profile") as "texto" | "markdown" | "md" | "auto")
			: typeof flags.get("p") === "string"
				? (flags.get("p") as "texto" | "markdown" | "md" | "auto")
				: "auto") as "texto" | "markdown" | "md" | "auto",
		includePositions: flags.has("positions"),
		format:
			(typeof flags.get("type") === "string"
				? (flags.get("type") as string)
				: typeof flags.get("t") === "string"
					? (flags.get("t") as string)
					: undefined) || "json",
	};

	const output = await parseCommand(options);
	console.log(output);
}

async function handleFormat(argsList: string[]): Promise<void> {
	const { flags, positional } = parseFlags(argsList);

	if (flags.has("help") || flags.has("h")) {
		console.log("Usage: texto format [options] [file]");
		console.log("");
		console.log("Parse and re-format texto document");
		console.log("");
		console.log("Options:");
		console.log("  -h, --help              Show help");
		console.log(
			"  -p, --profile           Parser profile (texto, markdown, auto)",
		);
		console.log("");
		console.log("Arguments:");
		console.log(
			"  file                    Input file (reads stdin if not provided)",
		);
		process.exit(0);
	}

	const options: FormatOptions = {
		file: positional[0],
	};

	const output = await formatCommand(options);
	console.log(output);
}

function printUsage(): void {
	console.log(`${meta.command} ${meta.version}`);
	console.log("");
	console.log(meta.description);
	console.log("");
	console.log("Usage:");
	console.log(
		"  texto parse [options] [file]    Parse document to backend output",
	);
	console.log("  texto format [options] [file]   Parse and re-format document");
	console.log("  texto --help                    Show this help");
	console.log("  texto --version                 Show version");
	console.log("");
	console.log("Options:");
	console.log("  -h, --help                      Show help message");
	console.log(
		"  -p, --profile                   Parser profile (texto, markdown, auto)",
	);
	console.log(
		"  -t, --type                      Output backend (json, xml, html)",
	);
	console.log("  --positions                     Include source positions");
	console.log("");
	console.log("Profile Selection:");
	console.log("  Auto-detect from file extension:");
	console.log("    .md, .markdown → markdown profile");
	console.log("    .txto          → texto profile");
	console.log("  Force with -p flag:");
	console.log("    -p texto        Force texto parser");
	console.log("    -p markdown     Force markdown parser");
	console.log("");
	console.log("Examples:");
	console.log(
		"  texto parse doc.md              # Auto-detect markdown from extension",
	);
	console.log(
		"  texto parse -p markdown doc.txt # Force markdown on .txt file",
	);
	console.log("  texto parse -thtml doc.md      # Markdown → HTML output");
	console.log("  echo '# Hi' | texto parse       # Stdin with texto profile");
	console.log('  echo "Hello" | texto format      # Parse stdin and reformat');
}

// Run CLI
if (import.meta.main) {
	main().catch((error) => {
		console.error(`Fatal error: ${error}`);
		process.exit(2);
	});
}

export { formatCommand, main, parseCommand };
