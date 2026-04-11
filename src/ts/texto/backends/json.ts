import { formatJSON } from "../formatters/json.ts";
import type { Document } from "../utils/types.ts";
import type { BackendOptions, OutputBackend } from "./types.ts";

export const jsonBackend: OutputBackend = (
	doc: Document,
	options: BackendOptions = {},
): string => {
	return formatJSON(doc, { includePositions: options.includePositions });
};
