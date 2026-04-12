// Phase registry for managing parsing phases
// Enables composition of pre-parse, inline, and post-parse phases

import type {
	InlinePhase,
	ParsingPhase,
	PostParsePhase,
	PreParsePhase,
} from "./types.ts";

/**
 * Registry for managing and executing parsing phases.
 */
export class PhaseRegistry {
	private preParsePhases: PreParsePhase[] = [];
	private inlinePhases: InlinePhase[] = [];
	private postParsePhases: PostParsePhase[] = [];

	/**
	 * Register a phase.
	 */
	register(phase: ParsingPhase): void {
		switch (phase.phaseType) {
			case "pre-parse":
				this.preParsePhases.push(phase as PreParsePhase);
				break;
			case "inline":
				this.inlinePhases.push(phase as InlinePhase);
				break;
			case "post-parse":
				this.postParsePhases.push(phase as PostParsePhase);
				break;
		}
	}

	/**
	 * Unregister a phase by name.
	 */
	unregister(name: string): void {
		this.preParsePhases = this.preParsePhases.filter((p) => p.name !== name);
		this.inlinePhases = this.inlinePhases.filter((p) => p.name !== name);
		this.postParsePhases = this.postParsePhases.filter((p) => p.name !== name);
	}

	/**
	 * Get all pre-parse phases.
	 */
	getPreParsePhases(): PreParsePhase[] {
		return [...this.preParsePhases];
	}

	/**
	 * Get all inline phases.
	 */
	getInlinePhases(): InlinePhase[] {
		return [...this.inlinePhases];
	}

	/**
	 * Get all post-parse phases.
	 */
	getPostParsePhases(): PostParsePhase[] {
		return [...this.postParsePhases];
	}

	/**
	 * Check if a phase is registered.
	 */
	hasPhase(name: string): boolean {
		return (
			this.preParsePhases.some((p) => p.name === name) ||
			this.inlinePhases.some((p) => p.name === name) ||
			this.postParsePhases.some((p) => p.name === name)
		);
	}

	/**
	 * Clear all phases.
	 */
	clear(): void {
		this.preParsePhases = [];
		this.inlinePhases = [];
		this.postParsePhases = [];
	}
}
