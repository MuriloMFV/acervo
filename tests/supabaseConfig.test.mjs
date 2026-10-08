import assert from 'node:assert/strict';
import test from 'node:test';
import { readSupabaseConfiguration } from '../src/services/supabase/config.ts';

const jwt = (role) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
test('configuration trims values and accepts a public publishable key', () => {
  assert.deepEqual(readSupabaseConfiguration(' https://example.supabase.co/ ', ' sb_publishable_example '), { url: 'https://example.supabase.co', publicKey: 'sb_publishable_example' });
});
test('legacy anon JWT and local URLs remain supported', () => {
  assert.equal(readSupabaseConfiguration('http://127.0.0.1:54321', jwt('anon')).url, 'http://127.0.0.1:54321');
});
test('missing configuration and unsafe URLs fail without leaking values', () => {
  for (const url of [undefined, '', 'invalid', 'ftp://example.com', 'https://user:password@example.com', 'https://example.com?secret=value']) {
    assert.throws(() => readSupabaseConfiguration(url, 'sb_publishable_example'), (error) => !error.message.includes('password') && !error.message.includes('secret=value'));
  }
  assert.throws(() => readSupabaseConfiguration('https://example.com', undefined));
});
test('privileged, secret and malformed keys are rejected', () => {
  for (const key of [jwt('service_role'), jwt('authenticated'), 'sb_secret_example', 'invalid.jwt.token', 'sb_publishable_', 'arbitrary']) {
    assert.throws(() => readSupabaseConfiguration('https://example.supabase.co', key), (error) => !error.message.includes(key));
  }
});
