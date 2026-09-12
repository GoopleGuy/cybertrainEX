import test from 'node:test';
import assert from 'node:assert/strict';
import {createRestAudio} from '../rest-audio.mjs';
test('rest chime schedules once on the audio clock; changing or cancelling rest stops prior voices', () => {
  const voices = [];
  const ctx = {state:'running',currentTime:10,destination:{},
    createOscillator() { const voice = {frequency:{},connect(){},disconnect(){},start(at){this.at=at;},stop(at){this.stopped=at ?? true;}}; voices.push(voice); return voice; },
    createGain() { return {connect(){},disconnect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}; }};
  const audio = createRestAudio(() => ctx);
  audio.unlock(); audio.schedule(30);
  assert.deepEqual(voices.map(v=>v.at), [40,40.19,40.38]);
  audio.schedule(15);
  assert.ok(voices.slice(0,3).every(v=>v.stopped===true));
  assert.deepEqual(voices.slice(3).map(v=>v.at), [25,25.19,25.38]);
  audio.cancel(); assert.ok(voices.every(v=>v.stopped===true));
});
test('unavailable audio never breaks a rest timer', () => {
  const audio = createRestAudio(() => {throw Error('unavailable');});
  assert.doesNotThrow(() => {audio.unlock();audio.schedule(1);audio.cancel();});
});
