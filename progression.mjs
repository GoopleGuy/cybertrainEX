export const epley = (w,r) => r>0?w*(1+Math.min(r,12)/30):0;
export const roundTo = (x,step) => step>0?Math.round(x/step)*step:x;
export function suggestNext(ex, history) {
 const last=history.filter(s=>s.exId===ex.id && s.sets?.length).at(-1);
 const [lo,hi]=ex.range, unit=ex.unit==='sec'?'sec':'reps';
 const result=(weight,reps,note,status)=>({weight,reps,sets:ex.sets,note,status});
 if(!last) return result(null,lo,`FIRST RUN — choose a manageable load for ${lo}–${hi} ${unit}. Leave about 2 reps in reserve.`, 'INIT');
 const sets=last.sets.filter(s=>Number.isFinite(s.w)&&s.w>=0&&Number.isFinite(s.r)&&s.r>0);
 if(!sets.length) return result(null,lo,'No valid working sets yet. Start with a manageable load.','INIT');
 const w=sets[0].w;
 if(sets.length<ex.sets) return result(w,lo,`INCOMPLETE — logged ${sets.length}/${ex.sets} sets. Repeat and complete the planned work before increasing.`, 'HOLD');
 if(sets.some(s=>s.w!==w)) return result(w,lo,'MIXED LOADS — repeat a consistent working load to establish the next target.','HOLD');
 const misses=sets.filter(s=>s.r<lo).length;
 if(misses>=2) {
   const nw=ex.inc>0?Math.max(0,Math.floor(w*0.925/ex.inc)*ex.inc):w;
   return result(nw,lo,ex.bw&&w===0?'RECALIBRATE — use an easier variation or shorter controlled range; do not force missed reps.':`RECALIBRATE — ${misses} sets below range. Consider ${nw} lb and rebuild; use an available equipment increment.`,'DOWN');
 }
 if(sets.every(s=>s.r>=hi)) {
   if(ex.unit!=='sec' && sets.some(s=>s.rir==null || s.rir==='' || s.rir<1)) return result(w,hi,'TOP OF RANGE — repeat with controlled technique and at least 1 RIR on every set before adding load. Log RIR to unlock progression.','HOLD');
   if(ex.inc<=0) return result(w,hi,'TOP OF RANGE — maintain quality or choose a harder variation. No automatic load increase for this movement.','HOLD');
   const nw=+(w+ex.inc).toFixed(2);
   return result(nw,lo,`LEVEL UP — all sets at ${hi} ${unit}. Consider ${nw} lb, reset to ${lo} ${unit}; use your equipment’s available increment.`,'UP');
 }
 const target=Math.max(lo,Math.min(Math.min(...sets.map(s=>s.r))+1,hi));
 return result(w,target,`HOLD ${w} lb — bring the weakest set toward ${target} ${unit}, keeping technique controlled.`,'HOLD');
}
