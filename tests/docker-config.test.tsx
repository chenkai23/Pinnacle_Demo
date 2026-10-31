// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import config from "../next.config";

it("packages the standalone server and static assets without local book data", () => {
  expect(config.output).toBe("standalone");
  const dockerfile = readFileSync("Dockerfile", "utf8");
  expect(dockerfile).toContain("/app/.next/standalone ./");
  expect(dockerfile).toContain("/app/.next/static ./.next/static");
  expect(dockerfile).toContain("USER node");
  expect(dockerfile).toContain("HEALTHCHECK");
  for (const entry of ["**/*.epub", ".env*", ".git", "node_modules"]) {
    expect(readFileSync(".dockerignore", "utf8").split(/\r?\n/)).toContain(entry);
  }
  expect(readFileSync("compose.yaml", "utf8")).toContain("127.0.0.1:${READER_PORT:-3000}:3000");
  expect(readFileSync(".gitattributes", "utf8")).toContain("*.sh text eol=lf");
});
