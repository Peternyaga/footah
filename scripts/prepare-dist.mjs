import { cpSync, existsSync, rmSync } from "node:fs";

if (!existsSync("out")) {
  throw new Error("Next.js export directory 'out' was not created.");
}

rmSync("dist", { recursive: true, force: true });
cpSync("out", "dist", { recursive: true });

console.log("Prepared static Sites bundle in dist/");
