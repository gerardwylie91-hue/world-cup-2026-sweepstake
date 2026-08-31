/* The build appends this module-local hardening before any asynchronous unlock finishes. */
const basicSteadyStateValidation = validateState;
validateState = function validateCompleteJournal(sample) {
  const s = basicSteadyStateValidation(sample);
  const reject = detail => { throw new Error('Invalid journal backup: ' + detail); };
  const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const text = (v, label, max = 8000, optional = true) => {
    if (optional && (v === null || v === undefined)) return;
    if (typeof v !== 'string' || v.length > max) reject(label);
  };
  const numeric = (v, label, low, high, integer = false) => {
    if (v === null || v === undefined) return;
    if (!N(v) || v < low || v > high || integer && !Number.isInteger(v)) reject(label);
  };
  const bool = (v, label) => { if (v !== undefined && v !== null && typeof v !== 'boolean') reject(label); };
  const id = v => { if (typeof v !== 'string' || !/^[A-Za-z0-9:_-]{1,160}$/.test(v)) reject('record identifier'); };
  const time = (v, optional = true) => { if (optional && (v === '' || v === undefined || v === null)) return; if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) reject('time'); };
  const day = (v, future = false, optional = true) => { if (optional && !v) return; if (!validDate(v) || !future && v > dateKey()) reject('calendar date'); };
  const iso = v => { if (typeof v !== 'string' || v.length > 40 || !Number.isFinite(Date.parse(v))) reject('timestamp'); };
  const objectDateMap = (v, label, visitor, future = false) => {
    if (!obj(v) || Object.keys(v).length > 15000) reject(label);
    for (const [date, record] of Object.entries(v)) { day(date, future, false); if (!obj(record)) reject(label); visitor(record, date); }
  };
  const p = s.profile;
  for (const name of ['operationDate', 'activityReviewDate', 'alcoholStart', 'alcoholReviewDate']) day(p[name]);
  for (const name of ['quitDate', 'followUpDate']) day(p[name], true);
  time(p.morningTime, false); time(p.eveningTime, false);
  for (const [name, values] of Object.entries({ruptureStatus:['unknown','ruptured','unruptured'],smokingMode:['preparing','reducing','quit'],thermomix:['unknown','none','TM5','TM6','TM7'],dietPreference:['all','vegetarian','plant']})) if (!values.includes(p[name])) reject('profile selection');
  for (const name of ['name','procedure','firstCigarette','nrtPlan','restrictions','fluidPlan','saltPlan','clinicianContact','activityPlan','alcoholHistory','alcoholClinician','alcoholPlan']) text(p[name], 'profile text');
  for (const [name, low, high] of [['heightCm',100,240],['weightKg',20,400],['typicalSteps',0,150000],['sysMin',40,350],['sysMax',40,350],['diaMin',20,250],['diaMax',20,250],['fluidTarget',0,10],['smokingBaseline',0,200],['cigaretteCost',0,10],['alcoholLimit',0,100]]) numeric(p[name], name, low, high);
  if (N(p.sysMin) && N(p.sysMax) && p.sysMin >= p.sysMax || N(p.diaMin) && N(p.diaMax) && p.diaMin >= p.diaMax) reject('clinical range');
  if (p.allergies.length > 20 || p.allergies.some(a=>!['dairy','egg','fish','gluten','nuts','peanuts','sesame'].includes(a))) reject('allergy filters');
  for (const name of ['onboarded','activityReviewed','alcoholReviewed']) bool(p[name], name);
  if (p.alcoholReviewed && (!p.alcoholReviewDate || !p.alcoholClinician || !p.alcoholPlan)) reject('alcohol discussion details');
  const bpIds = new Set();
  for (const r of s.bp) {
    id(r.id); if (bpIds.has(r.id)) reject('duplicate BP identifier'); bpIds.add(r.id);
    time(r.time); if (!['AM','PM','Other'].includes(r.period)) reject('BP session');
    bool(r.excluded,'BP exclusion'); bool(r.checkin,'BP check-in'); text(r.notes,'BP note');
    if (r.recordedAt !== undefined) iso(r.recordedAt);
  }
  objectDateMap(s.daily, 'daily logs', d => {
    for (const [name, low, high, integer] of [['sleepHours',0,24,false],['sleepQuality',1,5,true],['naps',0,1440,true],['headacheAM',0,10,true],['headachePM',0,10,true],['fatigue',0,10,true],['steps',0,150000,true],['water',0,15,false],['weight',20,400,false],['cigarettes',0,200,true],['craving',0,10,true],['fruit',0,30,false],['veg',0,30,false],['wholegrain',0,30,false],['protein',0,10,true],['highSalt',0,30,true]]) numeric(d[name], name, low, high, integer);
    for (const name of ['amDone','pmDone','alcoholNone']) bool(d[name],name);
    if (d.feeling !== undefined && !['','good','okay','rough'].includes(d.feeling)) reject('overall feeling');
    for (const name of ['foodNotes','activityNotes','triggers','notes','woundNotes','morningNotes','eveningNotes']) text(d[name], 'daily note');
    for (const name of ['flagsAM','flagsPM','observationsAM','observationsPM']) {
      if (d[name] === undefined) continue;
      if (!obj(d[name])) reject('symptom flags');
      const allowed = name.startsWith('flags') ? {...EMERGENCY,...URGENT} : OBS;
      for (const [k,v] of Object.entries(d[name])) if (!Object.hasOwn(allowed,k) || typeof v !== 'boolean') reject('symptom flag value');
    }
    if (d.drinks !== undefined) {
      if (!Array.isArray(d.drinks) || d.drinks.length > 100) reject('drink entries');
      const ids = new Set();
      for (const r of d.drinks) {
        if (!obj(r)) reject('drink'); id(r.id); if(ids.has(r.id)) reject('duplicate drink'); ids.add(r.id);
        if (!N(r.ml) || r.ml <= 0 || r.ml > 5000 || !N(r.abv) || r.abv < 0 || r.abv > 100) reject('drink measurement');
        text(r.name,'drink name',100); text(r.notes,'drink notes'); time(r.time);
      }
      if (d.alcoholNone === true && d.drinks.length) reject('contradictory zero alcohol entry');
    }
  });
  if (s.medications.length > 200 || s.routine.length > 200 || s.appointments.length > 2000) reject('record count');
  const medicationIds = new Set();
  for (const m of s.medications) {
    id(m.id); if(medicationIds.has(m.id)) reject('duplicate medicine'); medicationIds.add(m.id);
    text(m.name,'medicine name',150,false); text(m.dose,'medicine instructions',8000,false); text(m.notes,'medicine notes'); bool(m.active,'medicine status');
    if (m.times.length > 24 || new Set(m.times).size !== m.times.length) reject('medicine times');
    for (const t of m.times) time(t,false);
  }
  const routineIds=new Set();
  for(const r of s.routine){id(r.id);if(routineIds.has(r.id))reject('duplicate task');routineIds.add(r.id);text(r.label,'routine task',200,false);time(r.time,false);}
  objectDateMap(s.routineDone,'routine history',r=>{for(const[k,v]of Object.entries(r)){id(k);if(typeof v!=='boolean')reject('routine completion');}});
  objectDateMap(s.doses,'medicine history',r=>{for(const[k,v]of Object.entries(r)){if(typeof k!=='string'||k.length>200||!obj(v)||!['taken','skipped'].includes(v.status))reject('dose record');iso(v.recordedAt);}});
  objectDateMap(s.mealPlan,'meal planner',(slots,date)=>{for(const[k,m]of Object.entries(slots)){if(!SLOTS.includes(k)||!RECIPES.some(r=>r.id===m.recipeId))reject('meal reference');if(m.eaten&&date>dateKey())reject('future meal recorded as eaten');}},true);
  if(s.favourites.length>RECIPES.length||s.favourites.some(id=>!RECIPES.some(r=>r.id===id))||new Set(s.favourites).size!==s.favourites.length)reject('favourite recipes');
  objectDateMap(s.shopping,'shopping state',r=>{for(const[k,v]of Object.entries(r)){if(typeof k!=='string'||k.length>100||!N(v)||v<=0||v>1000000)reject('shopping item');}},true);
  const appointmentIds=new Set();
  for(const a of s.appointments){if(!obj(a))reject('appointment');id(a.id);if(appointmentIds.has(a.id))reject('duplicate appointment');appointmentIds.add(a.id);text(a.title,'appointment title',160,false);text(a.notes,'appointment notes');day(a.date,true,false);time(a.time);}
  iso(s.meta.createdAt); if(s.meta.lastBackup!==null&&s.meta.lastBackup!==undefined)iso(s.meta.lastBackup);
  return s;
};
