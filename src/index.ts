export interface TextBlock {
  id: string;
  text: string;
}
export interface SearchScope {
  block: string;
  start: number;
  end: number;
}
export interface FindOptions {
  caseSensitive?: boolean;
  scopes?: readonly SearchScope[];
  maxMatches?: number;
}
export interface TextMatch {
  block: string;
  start: number;
  end: number;
  text: string;
}
function boundary(text: string, index: number): boolean {
  return !(
    index > 0 &&
    index < text.length &&
    /[\uD800-\uDBFF]/u.test(text[index - 1]!) &&
    /[\uDC00-\uDFFF]/u.test(text[index]!)
  );
}
function folded(
  text: string,
  sensitive: boolean,
): { text: string; positions: Map<number, number> } {
  let result = '',
    offset = 0;
  const positions = new Map<number, number>([[0, 0]]);
  for (const char of text) {
    result += sensitive ? char : char.toLowerCase();
    offset += char.length;
    positions.set(result.length, offset);
  }
  return { text: result, positions };
}
export function findText(
  blocks: readonly TextBlock[],
  query: string,
  options: FindOptions = {},
): TextMatch[] {
  const limit = options.maxMatches ?? 10_000;
  if (
    typeof query !== 'string' ||
    !query.length ||
    query.length > 4096 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 10_000 ||
    !Array.isArray(blocks) ||
    blocks.length > 1000
  )
    throw new RangeError('Invalid search limits');
  let total = 0;
  const ids = new Map<string, string>();
  for (const b of blocks) {
    if (
      typeof b.id !== 'string' ||
      !b.id ||
      b.id.length > 128 ||
      ids.has(b.id) ||
      typeof b.text !== 'string'
    )
      throw new TypeError('Invalid text block');
    ids.set(b.id, b.text);
    total += b.text.length;
    if (total > 1_000_000) throw new RangeError('Document text limit');
  }
  if (
    options.scopes !== undefined &&
    (!Array.isArray(options.scopes) || options.scopes.length > 1000)
  )
    throw new RangeError('Scope limit');
  for (const scope of options.scopes ?? []) {
    const text = ids.get(scope.block);
    if (
      text === undefined ||
      !Number.isInteger(scope.start) ||
      !Number.isInteger(scope.end) ||
      scope.start < 0 ||
      scope.end < scope.start ||
      scope.end > text.length ||
      !boundary(text, scope.start) ||
      !boundary(text, scope.end)
    )
      throw new RangeError('Invalid scope');
  }
  const needle = folded(query, options.caseSensitive !== false).text;
  const hits: TextMatch[] = [];
  for (const b of blocks) {
    const view = folded(b.text, options.caseSensitive !== false);
    for (let at = view.text.indexOf(needle); at >= 0;) {
      const start = view.positions.get(at),
        end = view.positions.get(at + needle.length);
      if (
        start !== undefined &&
        end !== undefined &&
        (options.scopes === undefined ||
          options.scopes.some((s) => s.block === b.id && start >= s.start && end <= s.end))
      ) {
        if (hits.length >= limit) throw new RangeError('Match limit exceeded; no partial result');
        hits.push({ block: b.id, start, end, text: b.text.slice(start, end) });
        at = view.text.indexOf(needle, at + needle.length);
      } else at = view.text.indexOf(needle, at + 1);
    }
  }
  return hits;
}
/** Replacement is literal: dollar signs and backslashes have no expansion semantics. */
export function replaceText(
  blocks: readonly TextBlock[],
  query: string,
  replacement: string,
  options: FindOptions = {},
): { blocks: TextBlock[]; matches: TextMatch[] } {
  if (typeof replacement !== 'string' || replacement.length > 100_000)
    throw new RangeError('Replacement limit');
  const matches = findText(blocks, query, options);
  const outputSize =
    blocks.reduce((sum, b) => sum + b.text.length, 0) +
    matches.reduce((sum, m) => sum + replacement.length - (m.end - m.start), 0);
  if (outputSize > 1_000_000) throw new RangeError('Output text limit');
  const result = blocks.map((b) => {
    let text = '',
      offset = 0;
    for (const match of matches.filter((m) => m.block === b.id)) {
      text += b.text.slice(offset, match.start) + replacement;
      offset = match.end;
    }
    return { id: b.id, text: text + b.text.slice(offset) };
  });
  return { blocks: result, matches };
}
