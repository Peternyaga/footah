import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

if (!existsSync("out")) {
  throw new Error("Next.js export directory 'out' was not created.");
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/server", { recursive: true });
mkdirSync("dist/.openai", { recursive: true });
cpSync("out", "dist/assets", { recursive: true });
cpSync("scripts/site-worker.mjs", "dist/server/index.js");
cpSync(".openai/hosting.json", "dist/.openai/hosting.json");

console.log("Prepared static Sites bundle in dist/");
