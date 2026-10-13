const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('landing page references its case-correct stylesheet and interaction bundle', () => {
  const html = read('public/landing.html');

  assert.match(html, /href="css\/landing\.css"/);
  assert.doesNotMatch(html, /href="CSS\/landing\.css"/);
  assert.match(html, /src="js\/landing\.js"/);
});

test('all authentication call-to-actions remain available to the existing auth flow', () => {
  const html = read('public/landing.html');
  const auth = read('public/js/landing-auth.js');

  for (const id of ['loginBtn', 'getStartedBtn', 'heroStartBtn', 'mobileLoginBtn', 'mobileGetStartedBtn', 'pricingGetStartedBtn']) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(auth, new RegExp(`['"]${id}['"]`));
  }
});

test('landing experience includes responsive and motion-safe behavior', () => {
  const css = read('public/css/landing.css');
  const script = read('public/js/landing.js');

  assert.match(css, /@media\(max-width:590px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(script, /aria-expanded/);
  assert.match(script, /localStorage\.setItem\('piik-theme'/);
});

test('production still requires credentials while local preview can start without them', () => {
  const server = read('server.js');

  assert.match(server, /if \(process\.env\.NODE_ENV === 'production'\)/);
  assert.match(server, /Local preview mode: Firebase features are unavailable/);
  assert.doesNotMatch(server, /SESSION_SECRET/);
});

test('dashboard defaults to light theme and exposes working profile and theme controls', () => {
  const html = read('public/index.html');
  const app = read('public/js/app.js');

  assert.match(html, /<html lang="en" data-theme="light">/);
  assert.match(html, /id="themeToggleBtn"/);
  assert.match(html, /id="profilePhotoBtn"/);
  assert.match(html, /id="saveProfileBtn"/);
  assert.match(app, /setTheme\(savedTheme === 'dark' \? 'dark' : 'light'\)/);
  assert.match(app, /themeToggleBtn\.addEventListener\('click'/);
  assert.match(app, /currentUser\.updateProfile\(\{ photoURL \}\)/);
  assert.match(app, /currentUser\.updateProfile\(\{ displayName \}\)/);
  assert.match(app, /querySelectorAll\('#homePage \.filter-tab'\)/);
});
