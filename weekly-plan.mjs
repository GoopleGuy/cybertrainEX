export const SESSION_COLORS = {UA:'#fcee0a',LA:'#00f0ff',UB:'#fcee0a',UC:'#ff2a6d',LB:'#00f0ff',MA:'#a9dbb7',MB:'#a9dbb7'};
const row = (id,sets,lo,hi,rest,tempo='',rir='',note='',group='') => ({id,sets,range:[lo,hi],rest,tempo,rir,note,group,...(['cable-lateral','pallof','sa-pulldown'].includes(id)?{perSide:true}:{})});
const session = (name,minutes,rows,optional=false) => ({name,minutes,optional,exs:rows.map(r=>r.id),rx:Object.fromEntries(rows.map(({id,...r})=>[id,r]))});
export const WEEKLY_PROGRAM = {
 UA:session('Upper A · Horizontal strength',55,[row('bench',4,5,6,180,'2-0-X','2','Shoulder blades pinned. Rest 150–180s.'),row('seated-cable-row',4,8,10,120,'2-1-1','2','1s squeeze at stomach.'),row('db-row',3,10,12,90,'3-0-1','1–2'),row('high-low-fly',3,12,15,90,'2-1-1','1–2','Pulleys high. Rest 60–90s.'),row('face-pull',3,15,15,60,'','2','Rope to eye level.'),row('cable-curl',3,10,12,60,'','1','Rest after the pair.','A'),row('rope-pushdown',3,10,12,60,'','1','Rest after the pair.','A')]),
 LA:session('Lower A · Squat + single-leg',55,[row('broad-jump',3,3,3,90,'Max intent','','Log best distance. Rest 60–90s.'),row('back-squat',4,5,6,180,'3-0-X','2'),row('bss',3,8,10,90,'2-1-1','2','Left leg first.'),row('leg-curl',3,10,12,90,'3-0-1','1–2'),row('leg-ext',2,12,15,60,'2-1-1','1'),row('copenhagen',2,20,30,45,'Hold'),row('cable-crunch',3,10,12,60,'2-1-1','2')]),
 UB:session('Upper B · Vertical + hypertrophy',55,[row('ohp',4,5,7,150,'2-0-X','2','Glutes squeezed.'),row('lat-pulldown',4,8,10,120,'2-1-1','2'),row('db-bench',3,10,12,90,'3-0-1','1–2'),row('sa-pulldown',3,10,12,90,'2-1-1','1–2','Half-kneeling. Rest 60–90s.'),row('cable-lateral',3,12,15,60,'2-0-1','1'),row('hammer-curl',3,10,12,60,'','1','Rest after the pair.','A'),row('oh-tricep',3,10,12,60,'','1','Rope attachment. Rest after the pair.','A')]),
 UC:session('Upper C · Athletic + core',40,[row('db-snatch',4,3,3,90,'Fast','4+','Stay crisp. Rest 60–90s.'),row('db-push-press',3,5,5,90,'Fast','3'),row('pushup',3,8,15,90,'3-1-X','2','Add plate when 15 is easy. Rest 60–90s.'),row('wide-cable-row',3,12,15,60,'2-1-1','1–2'),row('reverse-hyper',3,12,15,60,'Controlled','3+','Light.'),row('pallof',3,10,10,45,'2s hold')]),
 LB:session('Lower B · Hinge + power',55,[row('trap-jump',4,3,3,90,'Max intent','','Plan note: 20–30% of deadlift weight.'),row('trap-dl',4,4,6,180,'1-0-X','2'),row('bb-rdl',3,8,10,120,'3-0-1','2'),row('db-stepup',3,8,8,90,'2-0-1','2','Left leg first.'),row('nordic',3,3,5,120,'3–5s lowering','','First week: 2 × 3; adjust in Build when starting.'),row('trap-carry',3,30,40,90,'','','Heavy.')]),
 MA:session('Movement A',20,[row('pogo',3,15,15,30),row('skater',3,4,4,45,'','','Stick each landing 1s.'),row('balance-reach',2,30,30,15),row('deadbug',2,8,8,30)],true),
 MB:session('Movement B',20,[row('tgu',3,1,1,45,'','','Plan starting load: 15–25 lb.'),row('bear-crawl',3,20,20,30),row('db-suitcase',3,30,30,45)],true),
};
export const WEEK = [
 {name:'Monday',am:'MA',pm:'UA'},
 {name:'Tuesday',am:'mobility',pm:'LA'},
 {name:'Wednesday',am:'MB',pm:'UB',note:'Commute uphill: 4–6 × 1–2 min at RPE 8.'},
 {name:'Thursday',am:'MA',pm:'UC'},
 {name:'Friday',am:'mobility',pm:'LB',note:'Heaviest leg day.'},
 {name:'Saturday',pm:'rest',note:'Rest or an easy walk.'},
 {name:'Sunday',am:'mobility',pm:'ride',note:'Optional long ride at a conversational pace.'},
];
export const SUBSTITUTES = {'back-squat':['box-squat','goblet'],'trap-dl':['hex-high-dl','back-ext','cable-pullthrough'],'bb-rdl':['back-ext','cable-pullthrough','db-sl-rdl'],bss:['db-split-squat','db-reverse-lunge'],nordic:['ghr'],bench:['db-floor'],ohp:['db-ohp','kneeling-db-press'],'seated-cable-row':['db-supported-row'],'db-row':['db-supported-row'],'lat-pulldown':['straight-arm-pulldown','pullup'],'broad-jump':['db-swing'],'trap-jump':['db-swing']};
export const MOBILITY = [
 ['cat-cow','Cat-cow','8 slow reps','Move one vertebra at a time.'],
 ['hips','90/90 hip switches','8 / side','Knees at 90°, rotate side to side.'],
 ['hips-left','90/90 · extra left set','8 left','Temporary extra set.',true],
 ['flexor','Half-kneeling hip flexor stretch','45s / side','Squeeze back glute; reach arm overhead.'],
 ['flexor-left','Hip flexor · extra left set','45s left','Temporary extra set.',true],
 ['world','World’s greatest stretch','4 / side','Lunge, elbow to instep, rotate arm up.'],
 ['book','Open-book rotation','6 / side','Knees stacked; open top arm.'],
 ['squat-hold','Deep squat hold','45–60s','Hold rack; shift side to side.'],
];
export function dateKey(date=new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function dayIndex(key) { return (new Date(key+'T12:00:00').getDay()+6)%7; }
export function shiftDate(key,days) { const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+days);return dateKey(d); }
export function migratePlan(d={}) {
 if(d.schema===2) return {...d,logs:d.logs||[],mobility:d.mobility||{},activity:d.activity||{},completed:d.completed||[]};
 return {schema:2,logs:d.logs||[],program:structuredClone(WEEKLY_PROGRAM),restOv:{},exOv:{},mobility:{},activity:{},completed:[],mobilityStarted:dateKey(),legacy:{program:d.program||null,restOv:d.restOv||{},exOv:d.exOv||{}},migrationAt:Date.now()};
}
