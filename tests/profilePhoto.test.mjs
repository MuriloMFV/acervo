import test from 'node:test';
import assert from 'node:assert/strict';
import { profileDisplayName, validateProfileName } from '../src/services/profile/identity.ts';
import { profilePhotoPath, isOwnProfilePhoto } from '../src/services/profile/photoValidation.ts';
import { saveProfilePhotoChange } from '../src/services/profile/photoSaving.ts';

const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const old = profilePhotoPath(user, '33333333-3333-4333-8333-333333333333', 'image/jpeg');
const next = profilePhotoPath(user, '44444444-4444-4444-8444-444444444444', 'image/png');
const photo = { uri: 'file:///picked.jpg', mime: 'image/jpeg' };
function fixture(overrides = {}) {
  const calls = [];
  return { calls, operations: {
    currentUserId: async () => user,
    upload: async () => { calls.push('upload'); return next; },
    persist: async (path, expected) => { calls.push(['persist', path, expected]); return { avatar_url: path }; },
    remove: async path => { calls.push(['remove', path]); },
    ...overrides,
  } };
}

test('profile name uses saved name, display metadata or email username for older accounts', () => {
  assert.equal(profileDisplayName('  Murilo  ', { email: 'user@example.com', user_metadata: { display_name: 'Outro' } }), 'Murilo');
  assert.equal(profileDisplayName('', { user_metadata: { display_name: 42, full_name: ' Maria ' } }), 'Maria');
  assert.equal(profileDisplayName('', { email: 'colecionador@example.com' }), 'colecionador');
  assert.equal(profileDisplayName(null, null), 'Minha conta');
  assert.equal(validateProfileName(' Ana '), 'Ana');
  assert.throws(() => validateProfileName(' '));
  assert.throws(() => validateProfileName('a'.repeat(81)));
});

test('profile photos accept only own immutable keys and never external or signed URLs', () => {
  assert.equal(isOwnProfilePhoto(old, user), true);
  for (const path of [old, next]) assert.equal(isOwnProfilePhoto(path, other), false);
  for (const path of [old + '?token=secret', '../' + old, 'https://example.com/avatar.jpg', old.replace('/avatar-', '/folder/avatar-')]) assert.equal(isOwnProfilePhoto(path, user), false);
  assert.throws(() => profilePhotoPath('../evil', user, 'image/jpeg'));
});

test('adding or replacing a photo uploads before persisting, then cleans the detached image', async () => {
  for (const previous of [null, old]) {
    const { calls, operations } = fixture();
    const result = await saveProfilePhotoChange(user, previous, { action: 'replace', photo }, operations);
    assert.deepEqual(result, { saved: { avatar_url: next }, cleanupPending: false });
    assert.deepEqual(calls, ['upload', ['persist', next, previous], ...(previous ? [['remove', old]] : [])]);
  }
});

test('removing a photo detaches first and does not upload', async () => {
  const { calls, operations } = fixture();
  const result = await saveProfilePhotoChange(user, old, { action: 'remove' }, operations);
  assert.equal(result.saved.avatar_url, null);
  assert.deepEqual(calls, [['persist', null, old], ['remove', old]]);
});

test('failed save preserves the previous image and only cleans the new upload', async () => {
  const failure = new Error('save failed');
  const { calls, operations } = fixture({ persist: async () => { throw failure; } });
  await assert.rejects(saveProfilePhotoChange(user, old, { action: 'replace', photo }, operations), error => error === failure);
  assert.deepEqual(calls, ['upload', ['remove', next]]);
});

test('cleanup failure does not roll back a successful profile update', async () => {
  const { operations } = fixture({ remove: async () => { throw new Error('cleanup failed'); } });
  const result = await saveProfilePhotoChange(user, old, { action: 'replace', photo }, operations);
  assert.equal(result.saved.avatar_url, next);
  assert.equal(result.cleanupPending, true);
});

test('upload failure never persists or removes the current avatar', async () => {
  const { calls, operations } = fixture({ upload: async () => { throw new Error('upload failed'); } });
  await assert.rejects(saveProfilePhotoChange(user, old, { action: 'replace', photo }, operations), /upload failed/);
  assert.deepEqual(calls, []);
});

test('changed session cannot link an uploaded image or remove any image', async () => {
  let owner = user;
  const { calls, operations } = fixture({ currentUserId: async () => owner, upload: async () => { owner = other; return next; } });
  await assert.rejects(saveProfilePhotoChange(user, old, { action: 'replace', photo }, operations), /Sessão alterada/);
  assert.deepEqual(calls, []);
});

test('foreign paths are rejected before persistence or cleanup', async () => {
  const { calls, operations } = fixture();
  await assert.rejects(saveProfilePhotoChange(other, old, { action: 'remove' }, operations), /Foto de perfil inválida/);
  assert.deepEqual(calls, []);
});
