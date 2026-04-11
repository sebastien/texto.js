// Texto Parser - Server/CLI Entry Point
// Re-exports all browser-safe APIs plus Node.js-specific CLI functionality

// CLI exports (Node.js-specific)
export {
	type FormatOptions,
	formatCommand,
	main,
	type ParseOptions,
	parseCommand,
} from "./cli/index.ts";
// Re-export all browser-safe APIs from core index
export * from "./index.ts";
// EOF
