const { build } = require("esbuild");
const replace = require("replace-in-file");

build({
  entryPoints: ["./src/contract.ts"],
  outdir: "./dist",
  minify: false,
  bundle: true,
})
  .catch(() => process.exit(1))
  .finally(() => {
    replace.sync({
      files: "./dist/contract.js",
      from: [/\(\(\) => {/g, /}\)\(\);/g],
      to: "",
      countMatches: true,
    });
    replace.sync({
      files: "./dist/contract.js",
      from: ["async function handle"],
      to: "export async function handle",
      countMatches: true,
    });
  });

build({
  entryPoints: ["./src/tests.ts"],
  outdir: "./dist",
  minify: false,
  bundle: false,
}).catch(() => process.exit(1));
