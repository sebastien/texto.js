import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { parseCommand } from "../src/ts/texto/cli/parse";

describe("parse output backends", () => {
	let tempDir: string;
	let fixturePath: string;

	beforeAll(() => {
		tempDir = mkdtempSync(join(tmpdir(), "texto-backends-"));
		fixturePath = join(tempDir, "sample.txto");
		writeFileSync(fixturePath, "Hello world\n");
	});

	afterAll(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	test("defaults to json backend", async () => {
		const output = await parseCommand({ file: fixturePath });
		expect(output).toContain('"type": "document"');
		expect(output).toContain('"content"');
	});

	test("supports xml backend", async () => {
		const output = await parseCommand({ file: fixturePath, format: "xml" });
		expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(output).toContain('<ast type="document">');
	});

	test("supports html backend", async () => {
		const output = await parseCommand({ file: fixturePath, format: "html" });
		expect(output).toContain("<!doctype html>");
		expect(output).toContain("<p>Hello world</p>");
	});

	test("rejects unknown backend", async () => {
		await expect(
			parseCommand({ file: fixturePath, format: "wat" as never }),
		).rejects.toThrow("Unknown output type");
	});
});
