import type { Document } from "../utils/types.ts";
import { htmlBackend } from "./html.ts";
import { jsonBackend } from "./json.ts";
import type { BackendOptions, OutputBackend } from "./types.ts";
import { xmlBackend } from "./xml.ts";

const BACKENDS: Record<string, OutputBackend> = {
	json: jsonBackend,
	xml: xmlBackend,
	html: htmlBackend,
};

export type BackendFormat = keyof typeof BACKENDS;

export function getAvailableBackends(): BackendFormat[] {
	return Object.keys(BACKENDS) as BackendFormat[];
}

export function renderBackend(
	doc: Document,
	format: string,
	options: BackendOptions = {},
): string {
	const normalized = format.toLowerCase();
	const backend = BACKENDS[normalized];

	if (!backend) {
		const available = getAvailableBackends().join(", ");
		throw new Error(
			`Unknown output type: ${format}. Available backends: ${available}`,
		);
	}

	return backend(doc, options);
}

export type { BackendOptions, OutputBackend };
export { htmlBackend, jsonBackend, xmlBackend };
