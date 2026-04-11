import type { Document } from "../utils/types.ts";

export interface BackendOptions {
	includePositions?: boolean;
}

export type OutputBackend = (doc: Document, options?: BackendOptions) => string;
