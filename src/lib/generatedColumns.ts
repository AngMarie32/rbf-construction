/**
 * Some columns are calculated by the database (generated columns). Writing them fails with
 * `column "x" can only be updated to DEFAULT` (or "cannot insert a non-DEFAULT value").
 * Runs a write, and if the database rejects a calculated column, drops it and tries again.
 */
const GENERATED = /column "([^"]+)" can only be updated to DEFAULT|cannot insert a non-DEFAULT value into column "([^"]+)"/i;

export async function writeSkippingGenerated<R extends { error: { message: string } | null }>(
  row: Record<string, any>,
  write: (row: Record<string, any>) => PromiseLike<R>
): Promise<R> {
  let current = { ...row };
  for (let i = 0; i < 8; i++) {
    const res = await write(current);
    const m = res.error ? GENERATED.exec(res.error.message) : null;
    const col = m ? m[1] || m[2] : null;
    if (!col || !(col in current)) return res;
    const { [col]: _dropped, ...rest } = current;
    current = rest;
  }
  return write(current);
}
