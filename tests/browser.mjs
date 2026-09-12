import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import assert from 'node:assert/strict';
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;const file=resolve('dist','.'+(p==='/'?'/index.html':p));if(!file.startsWith(resolve('dist')+ '/'.replace('/',process.platform==='win32'?'\\':'/')))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.png':'image/png','.webmanifest':'application/manifest+json'})[extname(file)]||'text/plain');res.end(await readFile(file));}catch{res.statusCode=404;res.end('missing');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1050},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==url)return route.abort();try{const p=u.pathname==='/'?'/index.html':u.pathname;await route.fulfill({body:await readFile(resolve('dist','.'+p)),contentType:({'.html':'text/html','.js':'text/javascript','.png':'image/png'})[extname(p)]||'text/plain'});}catch{await route.fulfill({status:404,body:'missing'});}});
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'BUILD YOUR NEXT VERSION.'}).waitFor();
 const out=resolve(process.env.QA_OUTPUT||'test-results');await mkdir(out,{recursive:true});
 await page.screenshot({path:resolve(out,'cybertrainEX-desktop.png'),fullPage:true});
 const nav=t=>page.locator('nav').getByRole('button',{name:new RegExp(t+'$')});
 await nav('ARSENAL').click();await page.getByRole('searchbox').fill('single leg');await page.getByLabel('MUSCLE GROUP').selectOption('HAMS');assert.ok(await page.getByText('Single-Leg DB RDL',{exact:true}).isVisible());
 await page.locator('.lib-row').filter({hasText:'Single-Leg DB RDL'}).getByRole('button',{name:'ASK ABOUT THIS EXERCISE'}).click();await page.getByLabel('WHAT WOULD YOU LIKE TO KNOW?').fill('How should I progress this movement?');await page.getByRole('button',{name:'COPY TRAINING BRIEF'}).click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/db-sl-rdl/);await page.screenshot({path:resolve(out,'cybertrainEX-coach.png'),fullPage:true});
 await nav('TRAIN').click();await page.getByRole('button',{name:'JACK IN',exact:false}).click();
 const logger=page.locator('.ex-body').first();await logger.locator('input').nth(0).fill('100');await logger.locator('input').nth(1).fill('6');await logger.locator('input').nth(2).fill('2');await logger.getByRole('button',{name:'LOG'}).click();assert.ok(await page.getByText('RESTING',{exact:true}).isVisible());
 await page.getByRole('button',{name:'END SESSION & ARCHIVE',exact:false}).click();
 await page.reload({waitUntil:'domcontentloaded'});await nav('DATA').click();assert.equal(await page.locator('.stat-card').filter({hasText:'SESSIONS'}).locator('.stat-n').textContent(),'1');
 await page.getByRole('button',{name:'EXPORT BACKUP'}).click();const backup=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(JSON.parse(backup).logs.length,1);
 await page.getByRole('button',{name:'IMPORT',exact:false}).click();await page.locator('.vault-ta').fill(backup);await page.getByRole('button',{name:'RESTORE FROM BACKUP'}).click();assert.match(await page.locator('.vault-msg').textContent(),/RESTORED/);
 await nav('BUILD').click();await page.getByRole('searchbox').fill('suitcase hold');await page.getByLabel('MUSCLE GROUP').selectOption('ALL');await page.locator('.lib-row').getByRole('button',{name:'+ ADD',exact:true}).click();await page.locator('.build-row').filter({hasText:'DB Suitcase Hold'}).waitFor();
 await page.reload({waitUntil:'domcontentloaded'});await nav('BUILD').click();await page.locator('.build-row').filter({hasText:'DB Suitcase Hold'}).waitFor();
 await page.setViewportSize({width:390,height:844});await nav('TRAIN').click();await page.screenshot({path:resolve(out,'cybertrainEX-mobile.png'),fullPage:true});
 for(const width of [390,320]) {await page.setViewportSize({width,height:844});for(const t of ['TRAIN','ARSENAL','BUILD','DATA','PROTOCOL','COACH']){await nav(t).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${t} overflows ${width}`);}}
 assert.deepEqual(errors,[]);console.log('Browser smoke passed: search, coach clipboard, log + archive, reload, backup restore, builder persistence, 6 tabs at 320/390px. No page errors.');
}finally{await browser.close();server.close();}



