import assert from 'node:assert/strict';
import test from 'node:test';
import { findText, replaceText } from '../dist/esm/index.js';

test('source UTF-16 mapping handles emoji and lowercase expansions', () => {
  const blocks = [{ id: 'p', text: '😀 İ CAT' }];
  assert.deepEqual(findText(blocks, 'i\u0307', { caseSensitive: false }), [
    { block: 'p', start: 3, end: 4, text: 'İ' },
  ]);
  assert.deepEqual(findText(blocks, 'i', { caseSensitive: false }), []);
  assert.equal(findText(blocks, 'cat', { caseSensitive: false })[0].start, 5);
  assert.deepEqual(findText(blocks, 'cat'), []);
});
test('replacement is literal, scoped and atomic, not regex expansion', () => {
  const blocks = [
    { id: 'p', text: 'cat cat' },
    { id: 'q', text: 'cat' },
  ];
  const out = replaceText(blocks, 'cat', String.raw`$&\x`, {
    scopes: [{ block: 'p', start: 4, end: 7 }],
  });
  assert.equal(out.blocks[0].text, String.raw`cat $&\x`);
  assert.equal(out.blocks[1].text, 'cat');
  assert.equal(blocks[0].text, 'cat cat');
  assert.deepEqual(out.matches, [{ block: 'p', start: 4, end: 7, text: 'cat' }]);
});
test('scope unions do not duplicate matches and empty scopes match nowhere', () => {
  const blocks = [{ id: 'p', text: 'aaaa' }],
    scopes = [
      { block: 'p', start: 0, end: 4 },
      { block: 'p', start: 0, end: 2 },
    ];
  assert.equal(findText(blocks, 'aa', { scopes }).length, 2);
  assert.deepEqual(findText(blocks, 'a', { scopes: [] }), []);
  assert.equal(replaceText(blocks, 'aa', '').blocks[0].text, '');
});
test('literal metacharacters and per-codepoint Greek lowercase', () => {
  assert.equal(findText([{ id: 'p', text: '[a]+ (x)' }], '[a]+').length, 1);
  assert.equal(findText([{ id: 'p', text: 'ΟΣ' }], 'ΟΣ', { caseSensitive: false }).length, 1);
});
test('invalid scopes, duplicate IDs, empty query and excessive matches reject', () => {
  const blocks = [{ id: 'p', text: '😀aa' }];
  for (const scope of [
    { block: 'p', start: 1, end: 3 },
    { block: 'p', start: 0, end: 9 },
    { block: 'missing', start: 0, end: 1 },
  ])
    assert.throws(() => findText(blocks, 'a', { scopes: [scope] }));
  assert.throws(() => findText(blocks, ''));
  assert.throws(() =>
    findText(
      [
        { id: 'x', text: 'a' },
        { id: 'x', text: 'b' },
      ],
      'a',
    ),
  );
  assert.throws(() => replaceText(blocks, 'a', 'x', { maxMatches: 1 }));
  assert.equal(blocks[0].text, '😀aa');
});
test('output capacity is checked before assembly', () => {
  assert.throws(
    () => replaceText([{ id: 'p', text: 'x'.repeat(20) }], 'x', 'y'.repeat(100000)),
    RangeError,
  );
});
