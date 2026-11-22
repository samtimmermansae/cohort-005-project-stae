import { describeDraft, type NoteDraft } from "./lib/draft";

export type { NoteDraft };

/**
 * What the lesson note form shows for the text in the box: the character
 * count against the limit, whether it has unsaved changes, and whether Save
 * is allowed.
 */
export function describeNoteDraft(
  draft: string,
  savedBody: string | null
): NoteDraft {
  return describeDraft(draft, savedBody);
}
