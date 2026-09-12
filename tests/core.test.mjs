import test from 'node:test';
import assert from 'node:assert/strict';
import { LIB,LIB_MAP,EQUIPMENT,filterExercises,guideFor } from '../library.mjs';
import { suggestNext } from '../progression.mjs';
import { buildBrief } from '../coach.mjs';
test('expanded library has unique IDs, known equipment, valid targets and setup guidance',()=>{
 assert.ok(LIB.length>=135);assert.equal(new Set(LIB.map(e=>e.id)).size,LIB.length);
 for(const e of LIB){assert.ok(EQUIPMENT.includes(e.eq),e.id);assert.ok(e.range[0]>0&&e.range[1]>=e.range[0]);assert.ok(guideFor(e).setup);assert.ok(guideFor(e).cue);}
});
test('compound search intersects equipment, muscle and case-insensitive words',()=>{
 assert.equal(filterExercises(LIB,'DUMBBELL','HAMS','single leg')[0].id,'db-sl-rdl');
 assert.equal(filterExercises(LIB,'HEX','CHEST','').length,0);
 assert.equal(filterExercises(LIB,'ALL','ALL','no-such-exercise').length,0);
});
const ex={id:'test',range:[8,12],sets:3,inc:5};
const history=(sets)=>[{exId:'test',sets}];
const sets=(r,rir=2,w=50,n=3)=>Array.from({length:n},()=>({w,r,rir}));
test('first run and empty logs have finite useful targets',()=>{assert.equal(suggestNext(ex,[]).status,'INIT');assert.equal(suggestNext(ex,history([])).status,'INIT');});
test('complete top-range work progresses in exact equipment increment',()=>{assert.equal(suggestNext(ex,history(sets(12))).weight,55);assert.equal(suggestNext({...ex,inc:2.5},history(sets(12,2,12.5))).weight,15);});
test('failure and missing effort hold load at top range',()=>{for(const rir of [0,null,''])assert.equal(suggestNext(ex,history(sets(12,rir))).status,'HOLD');});
test('partial sessions and mixed weights do not trigger overload',()=>{assert.equal(suggestNext(ex,history(sets(12,2,50,2))).status,'HOLD');const mixed=sets(12);mixed[1].w=45;assert.equal(suggestNext(ex,history(mixed)).status,'HOLD');});
test('two misses recommend reduced load aligned to equipment',()=>{const s=suggestNext(ex,history(sets(6)));assert.equal(s.status,'DOWN');assert.equal(s.weight,45);});
test('bodyweight zero-increment movements do not reset or add nonexistent load',()=>{const s=suggestNext({...ex,bw:true,inc:0},history(sets(12,2,0)));assert.equal(s.status,'HOLD');assert.equal(s.reps,12);assert.equal(s.weight,0);});
test('timed holds progress in seconds without an irrelevant RIR requirement',()=>{const s=suggestNext({...ex,unit:'sec',range:[20,40]},history(sets(40,null)));assert.equal(s.status,'UP');assert.match(s.note,/sec/);});
test('coach export excludes private history when toggled off and scopes selected exercise',()=>{const data={program:{A:{name:'A',exs:['bench','db-row']}},logs:[{exId:'bench',sets:[{w:123,r:8}],ts:1234}]};const options={data,active:{day:'A',entries:{bench:[{w:123,r:8}],'db-row':[{w:321,r:9}]}},selected:'bench',question:'Help',resolveExercise:id=>LIB_MAP[id]};const on=buildBrief(options);assert.ok(on.includes('123'));assert.ok(!on.includes('321'));const off=JSON.parse(buildBrief({...options,includeHistory:false}).split('\n\n')[1]);assert.equal(off.recentLogs,undefined);assert.equal(off.activeSession,undefined);assert.equal(off.exercises[0].localSuggestion,undefined);assert.equal(off.program,undefined);});
