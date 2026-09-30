import {WEEK,MOBILITY,SESSION_COLORS,dateKey,dayIndex,shiftDate} from './weekly-plan.mjs';
export default function WeekHome({data,program,selectedDate,setSelectedDate,day,setDay,onStart,onSave}) {
 const index=dayIndex(selectedDate), plan=WEEK[index], today=dateKey();
 const checks=data.mobility[selectedDate]||{};
 const started=data.mobilityStarted||today;
 const review=selectedDate>=shiftDate(started,42)&&!data.mobilityReviewed;
 const slots=[['AM',plan.am],['PM',plan.pm]];
 return <div className="pad week-home">
  <div className="session-heading"><div><div className="sec-label">FIXED WEEKLY PLAN</div><h2>{plan.name}</h2></div><span className="week-date">{selectedDate}</span></div>
  <div className="week-controls"><button onClick={()=>setSelectedDate(shiftDate(selectedDate,-7))} aria-label="Previous week">‹</button><button onClick={()=>setSelectedDate(today)}>TODAY</button><button onClick={()=>setSelectedDate(shiftDate(selectedDate,7))} aria-label="Next week">›</button></div>
  <div className="week-days">{WEEK.map((d,i)=><button key={d.name} aria-label={d.name} style={{'--dc':SESSION_COLORS[d.pm]||'#00f0ff'}} aria-pressed={i===index} onClick={()=>setSelectedDate(shiftDate(selectedDate,i-index))}>{d.name.slice(0,3)}</button>)}</div>
  {plan.note&&<p className="week-note">{plan.note}</p>}
  {slots.map(([slot,key])=>{
   if(!key)return null;
   const p=program[key], completed=data.completed.some(c=>c.date===selectedDate&&c.template===key);
   return <div className={'week-slot'+(day===key?' selected':'')} style={{'--dc':SESSION_COLORS[key]||'#00f0ff'}} key={slot}><div className="sec-label">{slot}{p?.optional?' · OPTIONAL':''}</div>{p?<button className={'day-card'+(day===key?' sel':'')} style={{'--dc':SESSION_COLORS[key]}} aria-pressed={day===key} onClick={()=>setDay(key)}><span className="session-monogram" aria-hidden="true">{key}</span><div><div className="day-name">{p.name}</div><div className="day-meta">{p.exs.length} EXERCISES · {p.optional?'15–20':p.minutes} MIN{completed?' · COMPLETED':''}</div></div><span className="day-chev">{day===key?'◉':'○'}</span></button>:<div className="week-note">{key==='mobility'?'Daily mobility below':key==='rest'?'Recovery day · no workout scheduled':'Long ride · optional'}{key==='ride'&&<label className="mobility-row"><input type="checkbox" checked={!!data.activity[selectedDate]?.ride} onChange={e=>onSave({...data,activity:{...data.activity,[selectedDate]:{...data.activity[selectedDate],ride:e.target.checked}}})}/>Ride complete</label>}</div>}</div>;
  })}
  {slots.some(([,key])=>key===day)&&program[day]&&<button className="cta start-cta" style={{'--dc':SESSION_COLORS[day]}} disabled={!program[day].exs.length} onClick={onStart}>▶ START {program[day].name}</button>}
  <details className="mobility-panel" open={undefined}><summary>DAILY MOBILITY <span>{MOBILITY.filter(([id])=>checks[id]).length}/8</span></summary><p>About 8 minutes · separate from workouts</p>{MOBILITY.map(([id,name,dose,cue])=><label key={id} className="mobility-row"><input type="checkbox" checked={!!checks[id]} onChange={e=>onSave({...data,mobility:{...data.mobility,[selectedDate]:{...checks,[id]:e.target.checked}}})}/><span>{name}<small>{dose} · {cue}</small></span></label>)}{review&&<div className="week-note">Six-week review: decide whether to keep the two extra left-side sets.<button className="chip" onClick={()=>onSave({...data,mobilityReviewed:today})}>MARK REVIEWED</button></div>}</details>
  {program[day]?.optional&&<div className="hint">Start with the daily mobility checklist. Optional sessions never count as missed workouts.</div>}
 </div>;
}
