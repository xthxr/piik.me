const assert = require('node:assert/strict');
const test = require('node:test');

const { computeProfileCompletion } = require('../public/js/profile-completion.js');

test('an empty profile scores 0 and lists every suggestion', () => {
  const r = computeProfileCompletion({});
  assert.equal(r.percent, 0);
  assert.equal(r.missing.length, r.items.length);
  assert.equal(computeProfileCompletion(null).percent, 0);
});

test('whitespace-only fields and half-filled links do not count', () => {
  const r = computeProfileCompletion({
    name: '   ',
    description: 'too short',
    social: { github: ' ' },
    links: [{ title: 'Site', url: '' }, { title: '', url: 'https://a.test' }],
  });
  assert.equal(r.percent, 0);
});

test('a full profile scores 100 with nothing missing', () => {
  const r = computeProfileCompletion({
    name: 'Sam',
    description: 'I build small tools for the web.',
    profilePicture: 'https://img.test/a.png',
    social: { github: 'sam' },
    links: [1, 2, 3].map((n) => ({ title: 'L' + n, url: 'https://a.test/' + n })),
  });
  assert.equal(r.percent, 100);
  assert.deepEqual(r.missing, []);
});

test('a partial profile reports the matching percent and missing ids', () => {
  const r = computeProfileCompletion({ name: 'Sam', links: [{ title: 'A', url: 'https://a.test' }] });
  assert.equal(r.percent, 33);
  assert.deepEqual(r.missing.map((m) => m.id), ['description', 'picture', 'social', 'links3']);
});

test('a dismissed id is still remembered when localStorage throws', () => {
    const { dismiss, readDismissed } = require('../public/js/profile-completion.js');
    const original = globalThis.localStorage;
    globalThis.localStorage = {
        getItem() {
            throw new Error('blocked');
        },
        setItem() {
            throw new Error('quota exceeded');
        },
    };
    try {
        dismiss('picture');
        assert.ok(readDismissed().includes('picture'));
    } finally {
        if (original === undefined) delete globalThis.localStorage;
        else globalThis.localStorage = original;
    }
});
