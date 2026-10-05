const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
let version = 14;
const server = http.createServer((req,res) => {
  const name = new URL(req.url,'http://localhost').pathname;
  if(name==='/static/tf.min.js') { res.setHeader('Content-Type','application/javascript'); res.end(''); return; }
  if(name==='/static/coco-ssd.min.js') {
    res.setHeader('Content-Type','application/javascript');
    res.end('window.cocoSsd={load:async()=>({detect:async()=>[]})};'); return;
  }
  const filename = path.resolve('.', '.'+(name==='/'?'/index.html':name));
  if(!filename.startsWith(process.cwd()+path.sep)) {res.writeHead(403).end();return;}
  try {
    let data=fs.readFileSync(filename);
    if(name==='/service-worker.js') data=Buffer.from(data.toString().replace('pigeon-guard-v14',`pigeon-guard-v${version}`));
    res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':name.endsWith('.png')?'image/png':name.endsWith('.wav')?'audio/wav':'text/html');
    res.setHeader('Cache-Control','no-store');
    res.end(data);
  } catch {res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || path.join(process.env.ProgramFiles || 'C:/Program Files','Google/Chrome/Application/chrome.exe'),headless:true});
  try {
    const context=await browser.newContext();
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=`http://127.0.0.1:${server.address().port}/index.html`;
    await page.goto(url);
    await page.waitForFunction(()=>navigator.serviceWorker.controller && document.getElementById('ai-status-badge').textContent.includes('Ready'));
    await page.locator('#btn-install-app').click();
    assert((await page.locator('#install-help').textContent()).includes('Add to home screen'));
    await page.evaluate(async()=>{
      const model=await caches.open('pigeon-guard-models-v1');
      await model.put('https://storage.googleapis.com/test/model.json',new Response('{}'));
      await model.put('https://storage.googleapis.com/test/group1-shard1of1',new Response('weights'));
    });
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(()=>document.getElementById('ai-status-badge').textContent.includes('Ready'));
    assert.equal(await page.locator('#btn-install-app').count(),1);
    const offline=await page.evaluate(()=>fetch('./static/sounds/alarm_burst.wav').then(r=>r.ok));
    assert(offline,'Audio asset must work offline');
    await context.setOffline(false);
    version=15;
    await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    await page.waitForFunction(async()=> (await caches.keys()).includes('pigeon-guard-v15'));
    await page.waitForFunction(async()=> !(await caches.keys()).includes('pigeon-guard-v14'));
    assert(await page.evaluate(()=>caches.has('pigeon-guard-models-v1')),'Updates must preserve AI cache');
    assert.deepEqual(errors,[]);
    console.log('PASS: install fallback, offline page/scripts/audio, update activation, preserved model cache, no browser errors (AI stubbed)');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
