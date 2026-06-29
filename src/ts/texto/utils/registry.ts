// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/utils/registry
// Generic named registry with consistent API for parsers, phases, backends, frontends, etc.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------

/**
 * Generic registry for name -> value mappings.
 * Provides a consistent API across different kinds of registries in the system.
 */
class Registry<K extends string | symbol = string, V = unknown> {
	private items: Map<K, V> = new Map();

	register(key: K, value: V): void {
		this.items.set(key, value);
	}

	get(key: K): V | undefined {
		return this.items.get(key);
	}

	has(key: K): boolean {
		return this.items.has(key);
	}

	unregister(key: K): void {
		this.items.delete(key);
	}

	clear(): void {
		this.items.clear();
	}

	keys(): K[] {
		return [...this.items.keys()];
	}

	values(): V[] {
		return [...this.items.values()];
	}

	entries(): [K, V][] {
		return [...this.items.entries()];
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { Registry };

// EOF
