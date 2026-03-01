/**
 * Removes keys with undefined values from an object before Firestore writes.
 * Firestore rejects documents containing undefined field values.
 */
export function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}
