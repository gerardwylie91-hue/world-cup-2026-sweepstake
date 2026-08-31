import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const PASSWORD='Synthetic verification phrase 8ZQ!';
const NAME='Synthetic verification journal 8ZQ';
const BASE='http://127.0.0.1:4397';
async function waitSaved(page){await expect(page.locator('#savestate')).toHaveText('Encrypted on this device');await expect(page.locator('#saveerror')).toBeEmpty();}
async function createJournal(page){
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Make this space yours.'})).toBeVisible();
 await page.getByLabel('Choose a passphrase',{exact:true}).fill(PASSWORD);
 await page.getByLabel('Repeat passphrase',{exact:true}).fill(PASSWORD);
 await page.getByRole('checkbox',{name:/I understand: data is on this device/}).check();
 await page.getByRole('button',{name:'Create private journal',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your personal recovery settings'})).toBeVisible();
 await page.getByLabel('Preferred name',{exact:true}).fill(NAME);
 const operation=await page.evaluate(()=>{const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Dublin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-5);return d.toISOString().slice(0,10);});
 await page.getByLabel('Operation date',{exact:true}).fill(operation);
 await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your day, at your pace.'})).toBeVisible();
 await waitSaved(page);
}
async function unlock(page){
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
 await page.getByLabel('Your passphrase',{exact:true}).fill(PASSWORD);
 await page.getByRole('button',{name:'Unlock my journal',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your day, at your pace.'})).toBeVisible();
}
async function navigate(page,route){
 let target=page.locator('[data-action="nav"][data-route="'+route+'"]:visible').first();
 if(await target.count()){await target.click();return;}
 await page.locator('[data-action="more"]:visible').click();
 await page.locator('.dialog [data-action="more-nav"][data-route="'+route+'"]').click();
}
async function morningBP(page){
 await page.locator('[data-action="checkin"][data-period="AM"]').click();
 await page.locator('#f-r1sys').fill('120');await page.locator('#f-r1dia').fill('80');await page.locator('#f-r1pulse').fill('72');
 await page.locator('#f-r2sys').fill('118');await page.locator('#f-r2dia').fill('78');await page.locator('#f-r2pulse').fill('68');
 await page.getByLabel('Sleep · hours',{exact:true}).fill('7.5');
 await page.getByLabel('Headache · 0–10',{exact:true}).fill('2');
 await page.getByLabel('Fatigue · 0–10',{exact:true}).fill('3');
 await page.getByRole('button',{name:'Save check-in',exact:true}).click();
 await waitSaved(page);
}
async function savedEnvelope(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('steady-private-v1',1);r.onsuccess=()=>{const db=r.result,read=db.transaction('vault').objectStore('vault').get('primary');read.onsuccess=()=>{resolve(read.result);db.close();};read.onerror=()=>reject(read.error);};r.onerror=()=>reject(r.error);}));}

test.beforeEach(async({page})=>{page.on('dialog',dialog=>dialog.accept());});

test('creation, wrong-passphrase rejection and reload persistence',async({page})=>{
 await createJournal(page);await morningBP(page);
 const e=await savedEnvelope(page);expect(e.format).toBe('steady-encrypted-v1');expect(e.iterations).toBe(600000);expect(JSON.stringify(e)).not.toContain(NAME);expect(JSON.stringify(e)).not.toContain(PASSWORD);
 expect(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}))).toEqual({local:[],session:[]});
 await page.reload();await page.getByLabel('Your passphrase',{exact:true}).fill('This is not the correct phrase');await page.getByRole('button',{name:'Unlock my journal'}).click();await expect(page.locator('.formerror')).toContainText(/Incorrect passphrase/);
 await unlock(page);await expect(page.getByText('119/79',{exact:true}).first()).toBeVisible();
 await navigate(page,'bp');await expect(page.locator('tbody tr')).toHaveCount(2);
});

test('editing a check-in does not duplicate paired BP readings',async({page})=>{
 await createJournal(page);await morningBP(page);
 await page.locator('[data-action="checkin"][data-period="AM"]').click();await expect(page.locator('#f-r1sys')).toHaveValue('120');await expect(page.locator('#f-r2sys')).toHaveValue('118');await page.getByRole('button',{name:'Save check-in',exact:true}).click();await waitSaved(page);
 await navigate(page,'bp');await expect(page.locator('tbody tr')).toHaveCount(2);await expect(page.getByText('119/79',{exact:true}).first()).toBeVisible();await expect(page.getByRole('heading',{name:'Pulse trend'})).toBeVisible();
 await page.locator('[data-action="bp-exclude"]').first().click();await waitSaved(page);await expect(page.locator('tr.excluded')).toHaveCount(1);
 await page.locator('tr.excluded [data-action="bp-exclude"]').click();await waitSaved(page);await expect(page.locator('tr.excluded')).toHaveCount(0);
});

test('emergency symptoms warn before submission even with a normal BP',async({page})=>{
 await createJournal(page);await page.locator('[data-action="checkin"][data-period="AM"]').click();
 await page.locator('#f-r1sys').fill('118');await page.locator('#f-r1dia').fill('75');
 await page.getByRole('checkbox',{name:'New one-sided weakness or numbness',exact:true}).check();
 await expect(page.locator('#live-alert')).toContainText('seek emergency help now');await expect(page.locator('#live-alert a[href="tel:112"]')).toBeVisible();
 await page.getByRole('button',{name:'Save check-in',exact:true}).click();await waitSaved(page);await expect(page.locator('#main .notice.danger').first()).toContainText('Call');
});

test('either very high BP component prompts advice before saving',async({page})=>{
 await createJournal(page);await navigate(page,'bp');await page.getByRole('button',{name:'Add readings',exact:true}).click();
 await page.locator('#f-r1sys').fill('180');await page.locator('#f-r1dia').fill('85');await expect(page.locator('#live-alert')).toContainText('Prompt clinical advice');
 await page.locator('#f-r1sys').fill('160');await page.locator('#f-r1dia').fill('120');await expect(page.locator('#live-alert')).toContainText('Prompt clinical advice');
 await page.getByRole('button',{name:'Save readings',exact:true}).click();await waitSaved(page);await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('a separate browser context cannot see another journal',async({page,browser})=>{
 await createJournal(page);await morningBP(page);
 const other=await browser.newContext({locale:'en-IE',timezoneId:'Europe/Dublin'});const p=await other.newPage();await p.goto(BASE);await expect(p.getByRole('heading',{name:'Make this space yours.'})).toBeVisible();await expect(p.getByText(NAME,{exact:false})).toHaveCount(0);await other.close();
});

test('weekly meals, favourites, portions and shopping work',async({page})=>{
 await createJournal(page);await navigate(page,'meals');await page.getByRole('button',{name:'Fill empty meal slots',exact:true}).click();await waitSaved(page);await expect(page.locator('.mealcell')).toHaveCount(28);
 await page.locator('[data-action="meal-slot"][data-slot="breakfast"]').first().click();await page.getByLabel('Portions to plan',{exact:true}).fill('2');await page.getByRole('button',{name:'Save meal',exact:true}).click();await waitSaved(page);
 await page.locator('.mealcell [data-action="recipe"]').first().click();await expect(page.getByRole('heading',{name:'Thermomix-friendly preparation'})).toBeVisible();await expect(page.getByRole('heading',{name:'Hob / oven alternative'})).toBeVisible();await page.locator('.dialog [data-action="favourite"]').click();await expect(page.locator('.dialog [data-action="favourite"]')).toContainText('Saved');await page.locator('.dialog [data-action="close"]').last().click();
 await page.getByRole('button',{name:'Shopping list',exact:true}).click();const first=page.locator('input[data-shopping]').first();await expect(first).toBeVisible();await first.check();await waitSaved(page);await page.locator('.dialog [data-action="close"]').last().click();await page.getByRole('button',{name:'Shopping list',exact:true}).click();await expect(page.locator('input[data-shopping]').first()).toBeChecked();
});

test('smoking zeros and alcohol logging do not grant clearance',async({page})=>{
 await createJournal(page);await navigate(page,'habits');await page.getByRole('button',{name:'Log cigarettes & cravings',exact:true}).click();await page.locator('#f-cigarettes').fill('0');await page.locator('#f-craving').fill('4');await page.getByRole('button',{name:'Save smoking log',exact:true}).click();await waitSaved(page);
 await page.getByRole('button',{name:'Confirm zero today',exact:true}).click();await waitSaved(page);await expect(page.getByRole('button',{name:'Zero confirmed ✓',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Record actual intake',exact:true}).click();await page.getByLabel('Drink description',{exact:true}).fill('Synthetic measurement test');await page.getByLabel('Volume · mL',{exact:true}).fill('150');await page.getByLabel('Label strength · % ABV',{exact:true}).fill('12');await page.getByRole('button',{name:'Save actual intake',exact:true}).click();await waitSaved(page);await expect(page.getByText(/1\.42 Irish standard drinks/).first()).toBeVisible();await expect(page.getByText('Alcohol-free pending clinical review',{exact:true})).toBeVisible();
 await page.locator('[data-action="drink-delete"]').click();await waitSaved(page);await expect(page.getByRole('button',{name:'Confirm zero today',exact:true})).toBeVisible();
});

test('each scheduled medicine time has an independent acknowledgement',async({page})=>{
 await createJournal(page);await navigate(page,'meds');await page.getByRole('button',{name:'Add medicine',exact:true}).click();await page.getByLabel('Medicine name',{exact:true}).fill('Synthetic medicine — test only');await page.getByLabel('Exact prescribed dose / label instructions',{exact:true}).fill('Synthetic instructions; not a real prescription');await page.getByLabel('Scheduled times, separated by commas',{exact:true}).fill('08:00, 20:00');await page.getByRole('button',{name:'Save medicine',exact:true}).click();await waitSaved(page);
 await page.locator('[data-action="dose"][data-time="08:00"][data-status="taken"]').click();await waitSaved(page);await expect(page.locator('[data-action="dose"][data-time="08:00"][data-status="taken"]')).toHaveText('Taken ✓');await expect(page.locator('[data-action="dose"][data-time="20:00"][data-status="taken"]')).toHaveText('Mark taken');
 await page.reload();await unlock(page);await navigate(page,'meds');await expect(page.locator('[data-action="dose"][data-time="08:00"][data-status="taken"]')).toHaveText('Taken ✓');
});

test('routine completions persist and calendar export has real recurring events',async({page})=>{
 await createJournal(page);await navigate(page,'routine');const button=page.locator('[data-action="routine-toggle"]').first();await button.click();await waitSaved(page);await expect(button).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Calendar reminders',exact:true}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export calendar file',exact:true}).click();const download=await downloadPromise;const data=await fs.readFile(await download.path(),'utf8');expect(data).toContain('TZID:Europe/Dublin');expect(data.match(/BEGIN:VEVENT/g)).toHaveLength(2);expect(data.match(/RRULE:FREQ=DAILY/g)).toHaveLength(2);expect(data).not.toContain(NAME);
});

test('encrypted backups restore on a separate device context',async({page,browser})=>{
 await createJournal(page);await morningBP(page);await navigate(page,'settings');const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export encrypted backup',exact:true}).click();const download=await downloadPromise,filename=await download.path(),text=await fs.readFile(filename,'utf8');const envelope=JSON.parse(text);expect(envelope.format).toBe('steady-encrypted-v1');expect(text).not.toContain(NAME);
 const other=await browser.newContext({locale:'en-IE',timezoneId:'Europe/Dublin'});const p=await other.newPage();p.on('dialog',d=>d.accept());await p.goto(BASE);await p.getByRole('button',{name:'Restore an encrypted backup',exact:true}).click();await p.getByLabel('Encrypted backup file',{exact:true}).setInputFiles(filename);await p.getByLabel('Backup passphrase',{exact:true}).fill(PASSWORD);await p.getByRole('button',{name:'Decrypt and restore',exact:true}).click();await expect(p.getByRole('heading',{name:'Your day, at your pace.'})).toBeVisible();await expect(p.getByText('119/79',{exact:true}).first()).toBeVisible();await other.close();
});

test('app and encrypted journal reopen offline after the first installation',async({page,context})=>{
 await createJournal(page);await morningBP(page);await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await context.setOffline(true);await page.reload();await unlock(page);await expect(page.getByText('119/79',{exact:true}).first()).toBeVisible();await context.setOffline(false);
});

test('all screens render without runtime errors, external requests or horizontal page overflow',async({page},testInfo)=>{
 const errors=[],external=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(!r.url().startsWith(BASE)&&!r.url().startsWith('blob:'))external.push(r.url());});
 const response=await page.goto('/');expect(response.headers()['content-security-policy']).toContain("script-src 'self'");await createJournal(page);await morningBP(page);
 for(const route of ['today','bp','plan','meals','habits','routine','meds','insights','settings','help']){
  await navigate(page,route);await expect(page.locator('#main h1')).toBeVisible();
  const sizes=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));expect(sizes.document,'horizontal overflow on '+route).toBeLessThanOrEqual(sizes.viewport+1);
  if(['today','bp','meals'].includes(route))await page.screenshot({path:testInfo.outputPath(route+'.png'),fullPage:true});
 }
 expect(errors).toEqual([]);expect(external).toEqual([]);
});
