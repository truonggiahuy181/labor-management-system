import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from '../node_modules/typescript/lib/typescript.js';

const source = await readFile(
  new URL('../src/services/accountStatusEvents.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const {
  subscribeToAccountStatusChanges,
  notifyAccountStatusChanged,
  ACCOUNT_STATUS_STORAGE_KEY,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

function setup() {
  const writes = [];
  globalThis.window = new EventTarget();
  window.localStorage = { setItem: (...args) => writes.push(args) };
  globalThis.document = new EventTarget();
  document.visibilityState = 'visible';
  return writes;
}

test('refreshes after a successful local change and notifies other tabs without account data', () => {
  const writes = setup();
  let refreshes = 0;
  const stop = subscribeToAccountStatusChanges(() => refreshes++);
  notifyAccountStatusChanged();
  assert.equal(refreshes, 1);
  assert.equal(writes[0][0], ACCOUNT_STATUS_STORAGE_KEY);
  const [timestamp, nonce] = writes[0][1].split(':');
  assert.ok(Number(timestamp) > 0);
  assert.ok(Number(nonce) >= 0 && Number(nonce) < 1);
  stop();
  notifyAccountStatusChanged();
  assert.equal(refreshes, 1);
});

test('refreshes other views on a status change in another tab and when returning to the page', () => {
  setup();
  let refreshes = 0;
  const stop = subscribeToAccountStatusChanges(() => refreshes++);
  window.dispatchEvent(
    Object.assign(new Event('storage'), { key: 'unrelated' }),
  );
  assert.equal(refreshes, 0);
  window.dispatchEvent(
    Object.assign(new Event('storage'), { key: ACCOUNT_STATUS_STORAGE_KEY }),
  );
  assert.equal(refreshes, 1);
  document.visibilityState = 'hidden';
  window.dispatchEvent(
    Object.assign(new Event('storage'), { key: ACCOUNT_STATUS_STORAGE_KEY }),
  );
  assert.equal(refreshes, 1);
  document.visibilityState = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(refreshes, 2);
  window.dispatchEvent(new Event('focus'));
  assert.equal(refreshes, 3);
  stop();
});

test('still refreshes the current view when browser storage is unavailable', () => {
  setup();
  window.localStorage.setItem = () => {
    throw new Error('storage blocked');
  };
  let refreshes = 0;
  const stop = subscribeToAccountStatusChanges(() => refreshes++);
  assert.doesNotThrow(notifyAccountStatusChanged);
  assert.equal(refreshes, 1);
  stop();
});
