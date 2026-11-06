# @lp-labs/document-find-replace

Bounded scoped literal document search and safe replacement with Unicode source position mapping.

Original, independent MIT implementation. Zero runtime, peer or sibling dependencies. Requires Node.js 18+; strict TypeScript declarations support both ESM and CommonJS.

## Install

```sh
npm install @lp-labs/document-find-replace
```

## Quickstart

```js
import { findText, replaceText } from '@lp-labs/document-find-replace';
const blocks = [{ id: 'p', text: '😀 CAT cat' }];
const hits = findText(blocks, 'cat', { caseSensitive: false });
const result = replaceText(blocks, 'cat', '$&', {
  caseSensitive: false,
  scopes: [{ block: 'p', start: 3, end: 6 }],
});
if (hits[0].start !== 3 || result.blocks[0].text !== '😀 $& cat')
  throw new Error('Replacement mismatch');
```

## API and types

`findText(blocks: readonly TextBlock[], query, options?: FindOptions): TextMatch[]` returns block id, original UTF-16 start/end and matched source text. `replaceText(blocks, query, replacement, options?): { blocks: TextBlock[]; matches: TextMatch[] }` returns copied updated blocks and pre-replacement offsets. Options: caseSensitive (true default), scopes of {block,start,end}, maxMatches (10,000 default). Scopes are a union, empty scopes search nowhere. Matches are nonoverlapping and must fit wholly inside a scope; a scope cannot bisect a surrogate pair. Replacement is always literal, including dollar signs/backslashes, never a regex or callback.

## Customize

Use scopes for selections, caseSensitive=false for simple Unicode lowercase matching and maxMatches to reject excessive operations atomically. Save returned blocks through your own editor transaction.

## Errors and bounds

1000 unique blocks/scopes, 1,000,000 input/output text units, query 1..4096, replacement at most 100,000, maxMatches 1..10,000. Unicode mapping uses per-code-point lowercase, not locale case folding, normalization, contextual sigma or full ß/ss equivalence; expansion boundaries map back to complete original code points. O(text + engine literal-search work + matches*scopes), output assembly additionally O(blocks*matches). Position map O(text). No arbitrary regex evaluation, Word/PDF parsing or cross-block matching.

Invalid runtime inputs throw TypeError/RangeError or the documented typed error. Adapter errors propagate unchanged unless specifically noted; asynchronous methods reject. Inputs must be ordinary typed data, not hostile proxies or accessors. No I/O happens at import time. All runtime exports are documented above and the example executes without optional packages.

## Development

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
npm run build
npm run typecheck
npm test
npm run format:check
```

Build emits dist/esm and dist/cjs with matching declarations. Tests use Node's test runner; consumer.mts and consumer.cts validate meaningful bare-package imports and expected type errors. Only TypeScript ^5.9.3 and Prettier ^3.6.2 are development dependencies.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
