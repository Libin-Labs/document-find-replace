import {
  findText,
  replaceText,
  type TextBlock,
  type FindOptions,
  type TextMatch,
  type SearchScope,
} from '@lp-labs/document-find-replace';
const blocks: TextBlock[] = [{ id: 'p', text: 'Hello' }];
const scope: SearchScope = { block: 'p', start: 0, end: 5 };
const options: FindOptions = { scopes: [scope], caseSensitive: false };
const hits: TextMatch[] = findText(blocks, 'hello', options);
const result: TextBlock[] = replaceText(blocks, 'hello', 'World', options).blocks;
// @ts-expect-error regex search is deliberately unsupported
findText(blocks, /hello/);
void [hits, result];
