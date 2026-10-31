// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import config from "../next.config";
import JSZip from "jszip";

it("packages the standalone server, static assets and test ebooks", () => {
  expect(config.output).toBe("standalone");
  const dockerfile = readFileSync("Dockerfile", "utf8");
  expect(dockerfile).toContain("/app/.next/standalone ./");
  expect(dockerfile).toContain("/app/.next/static ./.next/static");
  expect(dockerfile).toContain("/app/ebook ./ebook");
  expect(dockerfile).toContain("USER node");
  expect(dockerfile).toContain("HEALTHCHECK");
  for (const entry of ["**/*.epub", ".env*", ".git", "node_modules"]) {
    expect(readFileSync(".dockerignore", "utf8").split(/\r?\n/)).toContain(entry);
  }
  expect(readFileSync("compose.yaml", "utf8")).toContain("127.0.0.1:${READER_PORT:-3000}:3000");
  expect(readFileSync(".gitattributes", "utf8")).toContain("*.sh text eol=lf");
  expect(readFileSync(".gitignore", "utf8")).toContain("!/ebook/*.epub");
  expect(readFileSync(".dockerignore", "utf8")).toContain("!ebook/*.epub");
});

it("keeps both real EPUB fixtures in ebook with valid container metadata", async () => {
  for (const name of ["Alice's Adventures in Wonderland by Lewis Carroll.epub", "The Wonderful Wizard of Oz by L. Frank Baum.epub"]) {
    const archive = await JSZip.loadAsync(readFileSync(`ebook/${name}`));
    expect(await archive.file("mimetype")?.async("string")).toBe("application/epub+zip");
    expect(await archive.file("META-INF/container.xml")?.async("string")).toContain("rootfile");
  }
});
