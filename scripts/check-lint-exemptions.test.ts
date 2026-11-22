import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  findNewExemptions,
  listExemptions,
  stripJsonComments,
} from "./check-lint-exemptions";

const config = (body: object) =>
  `// a comment\n${JSON.stringify(body, null, 2)}\n/* trailing */`;

const base = config({
  rules: { "react/refs": "off", "max-params": ["error", 3] },
  overrides: [
    { files: ["legacy.ts"], rules: { "max-lines-per-function": "off" } },
  ],
});

describe("stripJsonComments", () => {
  it("keeps // and /* inside strings", () => {
    const text = '{"a": "http://x/*y*/" // gone\n}';
    expect(JSON.parse(stripJsonComments(text))).toEqual({
      a: "http://x/*y*/",
    });
  });

  it("keeps an escaped quote inside a string", () => {
    expect(JSON.parse(stripJsonComments('{"a": "q\\"//"}'))).toEqual({
      a: 'q"//',
    });
  });
});

describe("listExemptions", () => {
  it("lists global and per-file rules that are off, and only those", () => {
    expect(listExemptions(base)).toEqual([
      { rule: "react/refs", file: "<every file>" },
      { rule: "max-lines-per-function", file: "legacy.ts" },
    ]);
  });

  it("treats allow and 0 as off", () => {
    const text = config({
      overrides: [{ files: ["a.ts"], rules: { x: "allow", y: 0, z: 1 } }],
    });
    expect(listExemptions(text).map((exemption) => exemption.rule)).toEqual([
      "x",
      "y",
    ]);
  });

  it("parses the repo's own config", () => {
    expect(
      listExemptions(readFileSync(".oxlintrc.json", "utf8")).length
    ).toBeGreaterThan(0);
  });
});

describe("findNewExemptions", () => {
  it("passes when nothing changed", () => {
    expect(findNewExemptions(base, base)).toEqual([]);
  });

  it("passes when an entry is removed", () => {
    const current = config({
      rules: { "react/refs": "off" },
      overrides: [],
    });
    expect(findNewExemptions(base, current)).toEqual([]);
  });

  it("reports a new file on an existing list", () => {
    const current = config({
      rules: { "react/refs": "off" },
      overrides: [
        {
          files: ["legacy.ts", "split/new.ts"],
          rules: { "max-lines-per-function": "off" },
        },
      ],
    });
    expect(findNewExemptions(base, current)).toEqual([
      { rule: "max-lines-per-function", file: "split/new.ts" },
    ]);
  });

  it("reports an existing file exempted from another rule", () => {
    const current = config({
      rules: { "react/refs": "off" },
      overrides: [
        {
          files: ["legacy.ts"],
          rules: { "max-lines-per-function": "off", "max-params": "off" },
        },
      ],
    });
    expect(findNewExemptions(base, current)).toEqual([
      { rule: "max-params", file: "legacy.ts" },
    ]);
  });

  it("reports a rule switched off everywhere", () => {
    const current = config({
      rules: { "react/refs": "off", "max-params": "off" },
      overrides: [
        { files: ["legacy.ts"], rules: { "max-lines-per-function": "off" } },
      ],
    });
    expect(findNewExemptions(base, current)).toEqual([
      { rule: "max-params", file: "<every file>" },
    ]);
  });
});
