/* Build CyberTrain into ./dist — run by GitHub Actions on every push.
   Usage: node build.mjs [version-tag]                                  */
import { build } from "esbuild";
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";

const version = "cybertrain-ex-" + (process.argv[2] || "dev").slice(0, 10);
mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["entry.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: "dist/app.js",
  logLevel: "info",
});

for (const f of ["index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"]) {
  copyFileSync("static/" + f, "dist/" + f);
}
writeFileSync("dist/sw.js", readFileSync("static/sw.js", "utf8").replace("__VERSION__", version));
console.log("Built dist/ @", version);
