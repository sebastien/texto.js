// Parser registry with priority-based ordering

interface NamedParser {
	name: string;
	priority: number;
}

export class ParserRegistry<T extends NamedParser> {
	private parsers: Map<string, T> = new Map();
	private order: { name: string; priority: number }[] = [];

	register(parser: T, priority: number = 20): void {
		this.parsers.set(parser.name, parser);

		// Remove existing entry if present
		this.order = this.order.filter((entry) => entry.name !== parser.name);

		// Add new entry
		this.order.push({ name: parser.name, priority });

		// Sort by priority
		this.order.sort((a, b) => a.priority - b.priority);
	}

	unregister(name: string): void {
		this.parsers.delete(name);
		this.order = this.order.filter((entry) => entry.name !== name);
	}

	get(name: string): T | undefined {
		return this.parsers.get(name);
	}

	getOrdered(): T[] {
		return this.order
			.map((entry) => this.parsers.get(entry.name))
			.filter((parser): parser is T => parser !== undefined);
	}

	has(name: string): boolean {
		return this.parsers.has(name);
	}

	clear(): void {
		this.parsers.clear();
		this.order = [];
	}
}
