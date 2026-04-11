import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("texto parse type flags", () => {
	let tempDir: string;
	let fixturePath: string;
	const cliPath = join(import.meta.dirname, "../src/ts/texto/cli/index.ts");

	beforeAll(() => {
		tempDir = mkdtempSync(join(tmpdir(), "texto-cli-"));
		fixturePath = join(tempDir, "sample.txto");
		writeFileSync(fixturePath, "Hello world\n");
	});

	afterAll(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	test("supports -thtml shorthand", () => {
		const proc = Bun.spawnSync(
			[process.execPath, "run", cliPath, "parse", "-thtml", fixturePath],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		expect(proc.exitCode).toBe(0);
		expect(proc.stdout.toString()).toContain("<!doctype html>");
	});

	test("supports -txml shorthand", () => {
		const proc = Bun.spawnSync(
			[process.execPath, "run", cliPath, "parse", "-txml", fixturePath],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		expect(proc.exitCode).toBe(0);
		expect(proc.stdout.toString()).toContain('<ast type="document">');
	});
});
