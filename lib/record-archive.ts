/** Append to the latest persisted archive, not a tab's potentially stale state.
 * Preserve unknown/older records verbatim. A malformed archive must never be
 * replaced by an empty one merely because validation or parsing failed. */
export function appendRecord<T extends { id: string }>(
  raw: string | null,
  record: T,
): unknown[] {
  const archive: unknown = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(archive)) throw new Error("Unreadable result archive");
  if (
    archive.some(
      (item) =>
        item &&
        typeof item === "object" &&
        "id" in item &&
        item.id === record.id,
    )
  )
    return archive;
  return [...archive, record];
}
