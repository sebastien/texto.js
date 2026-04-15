import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("texto format CLI regression", () => {
	let tempDir: string;
	let fixturePath: string;
	const cliPath = join(import.meta.dirname, "../src/ts/texto/cli/index.ts");

	beforeAll(() => {
		tempDir = mkdtempSync(join(tmpdir(), "texto-format-"));
		fixturePath = join(tempDir, "regression.txto");
		const fixture = [
			"# Hello World",
			"",
			"This is a *texto* document",
			"",
			"- It supports **markdown-like** syntax",
			"- It can be edited in-place",
			"",
			"## Features",
			"",
			"- Fast parsing",
			"- Simple syntaxasdasd",
			"- Easy to use [link](google.com) *hello* **world** `code` _term_",
			"",
			"Feel free to try it out and see how it works!",
			"",
		].join("\n");
		writeFileSync(fixturePath, fixture);
	});

	afterAll(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	test("keeps inline list item content on a single line", () => {
		const proc = Bun.spawnSync(
			[process.execPath, "run", cliPath, "format", fixturePath],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		expect(proc.exitCode).toBe(0);

		const output = proc.stdout.toString();

		expect(output).toContain(
			"- Easy to use [link](google.com) *hello* **world** `code` *term*",
		);
		expect(output).toContain("Easy to use");
		expect(output).toContain("[link](google.com)");
		expect(output).not.toContain("- link\n\n");
		expect(output).not.toContain("\n\n  hello\n\n");
		expect(output).not.toContain("\n\n  world\n\n");
		expect(output).not.toContain("\n\n  code\n\n");
		expect(output).not.toContain("\n\n  term\n\n");
	});
});
