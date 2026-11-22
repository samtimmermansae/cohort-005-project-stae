// Fails when a commit switches an oxlint rule off for a file that HEAD did
// not already exempt. The exemption lists in .oxlintrc.json only shrink: they
// exist for legacy files waiting to be split, and a split must not carry the
// old exemptions over under new file names.
// Usage: tsx scripts/check-lint-exemptions.ts [base-ref]   (default: HEAD)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const CONFIG = ".oxlintrc.json";
const OFF_VALUES = new Set<unknown>(["off", "allow", 0]);
// The key for a rule switched off everywhere, at the top level of the config.
const EVERY_FILE = "<every file>";

const rulesSchema = z.record(z.unknown());
const configSchema = z.object({
  rules: rulesSchema.optional(),
  overrides: z
    .array(z.object({ files: z.array(z.string()), rules: rulesSchema }))
    .optional(),
});

export type Exemption = { rule: string; file: string };

// .oxlintrc.json is JSON with comments. Strips them, leaving strings intact.
export function stripJsonComments(text: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      out += char;
      if (char === "\\") out += text[++i] ?? "";
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
      out += char;
    } else if (char === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (char === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
      if (i === 0) break;
    } else {
      out += char;
    }
  }
  return out;
}

function offRules(rules: Record<string, unknown>): string[] {
  return Object.entries(rules)
    .filter(([, value]) => OFF_VALUES.has(value))
    .map(([rule]) => rule);
}

export function listExemptions(configText: string): Exemption[] {
  const config = configSchema.parse(JSON.parse(stripJsonComments(configText)));
  const global = offRules(config.rules ?? {}).map((rule) => ({
    rule,
    file: EVERY_FILE,
  }));
  const perFile = (config.overrides ?? []).flatMap((override) =>
    offRules(override.rules).flatMap((rule) =>
      override.files.map((file) => ({ rule, file }))
    )
  );
  return [...global, ...perFile];
}

export function findNewExemptions(
  baseText: string,
  currentText: string
): Exemption[] {
  const key = ({ rule, file }: Exemption) => `${rule}\u0000${file}`;
  const base = new Set(listExemptions(baseText).map(key));
  return listExemptions(currentText).filter(
    (exemption) => !base.has(key(exemption))
  );
}

function readBase(ref: string): string | undefined {
  try {
    return execFileSync("git", ["show", `${ref}:${CONFIG}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // No such ref, or the config did not exist there: nothing to compare.
    return undefined;
  }
}

function main(): void {
  const ref = process.argv[2] ?? "HEAD";
  const base = readBase(ref);
  if (base === undefined) return;
  const added = findNewExemptions(base, readFileSync(CONFIG, "utf8"));
  if (added.length === 0) return;

  console.error(`${CONFIG} switches off rules that ${ref} did not:\n`);
  for (const { rule, file } of added) console.error(`  ${rule}: ${file}`);
  console.error(`
Remove these entries and make each file pass the rule instead:
- max-lines-per-function: split the function or component into smaller ones,
  for example one subcomponent per section of the page.
- max-params: pass one object with named fields.
- max-lines / max-depth: split the file, or return early.

The exemption lists hold legacy files waiting to be split. When you split one,
its pieces pass the rules. If a rule truly cannot apply, stop and ask a human.`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
