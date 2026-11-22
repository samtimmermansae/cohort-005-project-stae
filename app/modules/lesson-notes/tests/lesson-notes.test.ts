import { describe, it, expect } from "vitest";
import { describeNoteDraft } from "../index";

const LIMIT = 2000;

describe("describeNoteDraft", () => {
  it("counts characters against the note limit", () => {
    const draft = describeNoteDraft("hello", null);
    expect(draft.length).toBe(5);
    expect(draft.limit).toBe(LIMIT);
  });

  it("allows saving a new note", () => {
    expect(describeNoteDraft("hello", null)).toMatchObject({
      dirty: true,
      empty: false,
      tooLong: false,
      canSave: true,
    });
  });

  it("does not allow saving a blank note", () => {
    expect(describeNoteDraft("   \n", null)).toMatchObject({
      empty: true,
      canSave: false,
    });
  });

  it("treats an empty box with no saved note as unchanged", () => {
    expect(describeNoteDraft("", null)).toMatchObject({
      dirty: false,
      empty: true,
      canSave: false,
    });
  });

  it("does not allow saving a note that matches the saved one", () => {
    expect(describeNoteDraft("same", "same")).toMatchObject({
      dirty: false,
      canSave: false,
    });
  });

  it("allows saving an edit to the saved note", () => {
    expect(describeNoteDraft("same, edited", "same")).toMatchObject({
      dirty: true,
      canSave: true,
    });
  });

  it("allows a note exactly at the limit", () => {
    expect(describeNoteDraft("a".repeat(LIMIT), null)).toMatchObject({
      tooLong: false,
      canSave: true,
    });
  });

  it("does not allow saving a note over the limit", () => {
    expect(describeNoteDraft("a".repeat(LIMIT + 1), null)).toMatchObject({
      length: LIMIT + 1,
      tooLong: true,
      canSave: false,
    });
  });
});
