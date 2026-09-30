import test from 'node:test';
import assert from 'node:assert/strict';
import {WEEKLY_PROGRAM,WEEK,SUBSTITUTES,MOBILITY,migratePlan,dateKey,shiftDate,dayIndex} from '../weekly-plan.mjs';
import {LIB_MAP} from '../library.mjs';
test('handoff has 40 ordered entries, valid identities, 16 unique substitutes and two shared Movement A slots',()=>{
 assert.equal(Object.values(WEEKLY_PROGRAM).reduce((n,p)=>n+p.exs.length,0),40);
 assert.equal(new Set(Object.values(SUBSTITUTES).flat()).size,16);
 assert.equal(WEEK[0].am,WEEK[3].am);assert.equal(WEEK.length,7);assert.equal(WEEK[5].pm,'rest');
 for(const p of Object.values(WEEKLY_PROGRAM))for(const id of p.exs){assert.ok(LIB_MAP[id],id);assert.ok(p.rx[id].sets>0);assert.ok(p.rx[id].range[0]>0);}
 for(const [id,subs] of Object.entries(SUBSTITUTES)){assert.ok(LIB_MAP[id]);for(const sub of subs)assert.ok(LIB_MAP[sub],sub);}
 assert.equal(MOBILITY.length,8);
});
test('migration preserves legacy logs and customized plan/overrides and is idempotent',()=>{
 const d={logs:[{exId:'bench',sets:[{w:95,r:5}]}],program:{A:{name:'custom',exs:['bench']}},restOv:{bench:123},exOv:{bench:{sets:5}}};
 const migrated=migratePlan(d);assert.deepEqual(migrated.logs,d.logs);assert.deepEqual(migrated.legacy,{program:d.program,restOv:d.restOv,exOv:d.exOv});
 assert.equal(migrated.program.UA.rx.bench.sets,4);assert.deepEqual(migratePlan(migrated),migrated);assert.equal(d.program.A.name,'custom');
});
test('dates follow local weekdays across month/year and DST boundaries',()=>{
 assert.equal(dayIndex('2026-09-29'),1);assert.equal(shiftDate('2026-12-31',1),'2027-01-01');assert.equal(shiftDate('2026-11-01',1),'2026-11-02');assert.equal(dateKey(new Date(2026,8,29,23)), '2026-09-29');
});
