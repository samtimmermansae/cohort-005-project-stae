import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  length: number;
  limit: number;
  tooLong: boolean;
  empty: boolean;
  /** The draft differs from the note last saved for this lesson. */
  dirty: boolean;
  canSave: boolean;
};

export function describeDraft(
  draft: string,
  savedBody: string | null
): NoteDraft {
  // The save-note action trims the note before checking and storing it, so
  // the form judges the trimmed text too. Otherwise a trailing newline would
  // read as "Unsaved changes" straight after a save.
  const saved = draft.trim();
  const length = saved.length;
  const tooLong = length > MAX_NOTE_LENGTH;
  // The save-note action rejects a blank note, so the form does too.
  const empty = length === 0;
  const dirty = saved !== (savedBody ?? "");

  return {
    length,
    limit: MAX_NOTE_LENGTH,
    tooLong,
    empty,
    dirty,
    canSave: dirty && !empty && !tooLong,
  };
}
