// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/frontends/registry
// Registers input frontends and exposes parsing helpers.

import type { Document } from "../utils/types.ts";
import { htmlFrontend } from "./html.ts";
import { markdownFrontend } from "./markdown.ts";
import { textoFrontend } from "./texto.ts";
import type { FrontendOptions, InputFrontend } from "./types.ts";

const FRONTENDS: Record<string, InputFrontend> = {
	texto: textoFrontend,
	markdown: markdownFrontend,
	md: markdownFrontend,
	html: htmlFrontend,
};

type FrontendFormat = keyof typeof FRONTENDS;

function getAvailableFrontends(): FrontendFormat[] {
	return Object.keys(FRONTENDS) as FrontendFormat[];
}

function parseFrontend(
	input: string,
	format: string,
	options: FrontendOptions = {},
): Document {
	const normalized = format.toLowerCase();
	const frontend = FRONTENDS[normalized];

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
