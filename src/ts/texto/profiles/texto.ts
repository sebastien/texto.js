// Default Texto parser profile
// Creates a standard TextoParser with default parser registration

import { TextoParser } from "../texto.ts";

/**
 * Creates a standard Texto parser with default configuration.
 * This is the default profile for .txto files and stdin input.
 *
 * @returns A configured TextoParser instance
 */
export function createTextoParser(): TextoParser {
	return new TextoParser();
}
