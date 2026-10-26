import test from 'node:test';
import assert from 'node:assert/strict';
import './register-typescript.mjs';
const { tutorialRoom, tutorialAction, advanceTutorial } = await import('../lib/tutorial.ts');

test('jump lesson clears the real obstacle using the normal race physics', () => {
  const room = tutorialRoom(0, 'Kitty');
  assert.equal(tutorialAction(room, 0, 'grab'), false);
  assert.equal(tutorialAction(room, 0, 'jump'), true);
  assert.equal(advanceTutorial(room, 0, 1000), 'done');
  assert.equal(room.players[0].hits.length, 0);
  assert.equal(room.players[0].y, 0);
});
test('missed jump retries instead of claiming the lesson is complete', () => {
  assert.equal(advanceTutorial(tutorialRoom(0, 'Kitty'), 0, 1000), 'retry');
});
test('grab lesson requires an actual pickup and applies a speed boost', () => {
  const room = tutorialRoom(1, 'Kitty');
  assert.equal(tutorialAction(room, 1, 'jump'), false);
  assert.equal(tutorialAction(room, 1, 'grab'), true);
  assert.equal(advanceTutorial(room, 1, 900), 'done');
  assert.deepEqual(room.players[0].collected, [0]);
  assert.ok(room.players[0].boostUntil > room.tick);
});
test('finish lesson crosses the actual finish and restart resets the lesson', () => {
  const room = tutorialRoom(3, 'Kitty');
  assert.equal(advanceTutorial(room, 3, 2600), 'done');
  assert.ok(room.players[0].finish > 0);
  assert.equal(room.status, 'finished');
  const reset = tutorialRoom(0, 'Kitty');
  assert.equal(reset.players[0].finish, null);
  assert.equal(reset.players[0].collected.length, 0);
});

test('bird lesson requires a jump followed by an airborne grab', () => {
  const ground = tutorialRoom(2, 'Kitty');
  tutorialAction(ground, 2, 'grab');
  advanceTutorial(ground, 2, 200);
  assert.equal(ground.players[0].collected.length, 0);
  const flying = tutorialRoom(2, 'Kitty');
  tutorialAction(flying, 2, 'jump');
  advanceTutorial(flying, 2, 160);
  tutorialAction(flying, 2, 'grab');
  assert.equal(advanceTutorial(flying, 2, 1000), 'done');
  assert.deepEqual(flying.players[0].collected, [0]);
});
