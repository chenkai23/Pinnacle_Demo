// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("documents existing npm and Docker entry points with only the requested sections", () => {
  const readme = readFileSync("README.md", "utf8");
  expect(readme.match(/^## .+$/gm)).toEqual(["## Introduction", "## Startup", "## Architecture"]);
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  for (const script of ["dev", "build"]) {
    expect(scripts[script]).toBeTruthy();
    expect(readme).toContain(`npm run ${script}`);
  }
  expect(scripts.start).toBeTruthy();
  expect(readme).toContain("npm start");
  expect(readme).toContain("docker compose up -d --build");
  expect(existsSync("compose.yaml")).toBe(true);
  for (const match of readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (!/^https?:/.test(match[1])) expect(existsSync(match[1])).toBe(true);
  }
});

it("uses consistent dated workflow headings without obsolete increment prefixes", () => {
  const workflow = readFileSync("AI_WORKFLOW.md", "utf8");
  expect(workflow.split(/\r?\n/)[0]).toBe("# AI Workflow");
  const headings = workflow.match(/^## .+$/gm) || [];
  expect(headings.length).toBeGreaterThan(0);
  for (const heading of headings) {
    expect(heading).toMatch(/^## \d{4}-\d{2}-\d{2} — [A-Z]/);
    expect(heading).not.toContain("Increment ");
  }
});
