import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
describe("texto CLI type flags", () => {
  let tempDir;
  let fixturePath;
  const cliPath = join(import.meta.dirname, "../src/js/texto/server/main.js");
  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "texto-cli-"));
    fixturePath = join(tempDir, "sample.txto");
    writeFileSync(fixturePath, `Hello world
`);
  });
  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
  test("supports -thtml shorthand", () => {
    const proc = Bun.spawnSync([process.execPath, "run", cliPath, "-thtml", fixturePath], {
      stdout: "pipe",
      stderr: "pipe"
    });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString()).toContain("<!doctype html>");
  });
  test("supports -txml shorthand", () => {
    const proc = Bun.spawnSync([process.execPath, "run", cliPath, "-txml", fixturePath], {
      stdout: "pipe",
      stderr: "pipe"
    });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString()).toContain('<ast type="document">');
  });
  test("supports --body-only", () => {
    const proc = Bun.spawnSync([process.execPath, "run", cliPath, "--body-only", fixturePath], {
      stdout: "pipe",
      stderr: "pipe"
    });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString()).toBe(`<p>Hello world</p>
`);
  });
});
