// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/frontends/registry
// Registers input frontends and exposes parsing helpers.

import type { Document } from "../utils/types.ts";
import { Registry } from "../utils/registry.ts";
import { htmlFrontend } from "./html.ts";
import { markdownFrontend } from "./markdown.ts";
import { textoFrontend } from "./texto.ts";
import type { FrontendOptions, InputFrontend } from "./types.ts";

// Use the common Registry abstraction for frontend storage
const FRONTENDS = new Registry<string, InputFrontend>();
FRONTENDS.register("texto", textoFrontend);
FRONTENDS.register("markdown", markdownFrontend);
FRONTENDS.register("md", markdownFrontend);
FRONTENDS.register("html", htmlFrontend);

type FrontendFormat = string;

function getAvailableFrontends(): FrontendFormat[] {
	return FRONTENDS.keys();
}

function parseFrontend(
	input: string,
	format: string,
	options: FrontendOptions = {},
): Document {
	const normalized = format.toLowerCase();
	const frontend = FRONTENDS.get(normalized);

	if (!frontend) {
		const available = getAvailableFrontends().join(", ");
		throw new Error(
			`Unknown input type: ${format}. Available frontends: ${available}`,
		);
	}

	return frontend(input, options);
}

export type { FrontendFormat, FrontendOptions, InputFrontend };
export { FRONTENDS, getAvailableFrontends, parseFrontend };

// EOF
