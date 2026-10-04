/** Offset endpoints return arrays, without a total. A full page needs a probe. */
export async function collectPages<T>(
  read: (page: { limit: number; offset: number }) => Promise<T[]>,
  limit = 200,
): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += limit) {
    const page = await read({ limit, offset });
    result.push(...page);
    if (page.length < limit) return result;
  }
}
