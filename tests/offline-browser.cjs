const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
let version = '16-first';
const server = http.createServer((req,res) => {
  const name = new URL(req.url,'http://localhost').pathname;
  if(name==='/static/ai/yolox-detector.js') { res.setHeader('Content-Type','application/javascript'); res.end('window.YoloXDetector={load:async()=>({detect:async()=>[],dispose(){}})};'); return; }
  if(name==='/static/tf.min.js') { res.setHeader('Content-Type','application/javascript'); res.end(''); return; }
  if(name==='/static/coco-ssd.min.js') {
    res.setHeader('Content-Type','application/javascript');
    res.end('window.cocoSsd={load:async()=>({detect:async()=>[]})};'); return;
  }
  const filename = path.resolve('.', '.'+(name==='/'?'/index.html':name));
  if(!filename.startsWith(process.cwd()+path.sep)) {res.writeHead(403).end();return;}
  try {
    let data=fs.readFileSync(filename);
    if(name==='/service-worker.js') data=Buffer.from(data.toString().replace('pigeon-guard-v16',`pigeon-guard-v${version}`));
    if(name==='/index.html') data=Buffer.from(data.toString().replace("const APP_VERSION = 'v16'",`const APP_VERSION = 'v${version}'`));
    res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':name.endsWith('.png')?'image/png':name.endsWith('.wav')?'audio/wav':'text/html');
    res.setHeader('Cache-Control','no-store');
    res.end(data);
  } catch {res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launchPersistentContext('', {executablePath:process.env.BROWSER_EXECUTABLE || path.join(process.env.ProgramFiles || 'C:/Program Files','Google/Chrome/Application/chrome.exe'),headless:true});
  try {
    const context=browser;
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=`http://127.0.0.1:${server.address().port}/index.html`;
    await page.goto(url);
    await page.waitForFunction(()=>navigator.serviceWorker.controller && document.getElementById('ai-status-badge').textContent.includes('Ready'));
    await page.evaluate(()=>{deferredInstallPrompt=null;});
    await page.locator('#btn-install-app').click();
    assert(await page.locator('#install-dialog').isVisible());
    assert((await page.locator('#install-dialog-message').textContent()).includes('Add to home screen'));
    await page.evaluate(()=>document.getElementById('install-dialog').close());
    await page.evaluate(()=>{window.promptCalls=0;deferredInstallPrompt={prompt:async()=>{window.promptCalls++},userChoice:Promise.resolve({outcome:'accepted'})};});
    await page.locator('#btn-install-app').click();
    assert.equal(await page.evaluate(()=>window.promptCalls),1);
    assert((await page.locator('#install-help').textContent()).includes('Installation requested'));
    await page.locator('#btn-install-app').click();
    assert(await page.locator('#install-dialog').isVisible(), 'Consumed prompts must show actionable help');
    await page.evaluate(()=>document.getElementById('install-dialog').close());
    const cdp = await context.newCDPSession(page);
    const manifest = await cdp.send('Page.getAppManifest');
    assert.deepEqual(manifest.errors, [], 'Manifest must parse');
    assert.deepEqual((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors, [], 'Chrome must report no installability errors');
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
    version='16-second';
    await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    await page.waitForFunction(async()=> (await caches.keys()).includes('pigeon-guard-v16-second'));
    await page.waitForFunction(async()=> !(await caches.keys()).includes('pigeon-guard-v16-first'));
    await page.waitForFunction(()=>document.getElementById('btn-check-update').textContent.includes('Restart'));
    await page.locator('#btn-check-update').click();
    await page.waitForFunction(()=>document.getElementById('app-version').textContent.includes('v16-second'));
    assert(await page.evaluate(()=>caches.has('pigeon-guard-models-v1')),'Updates must preserve AI cache');
    assert.deepEqual(errors,[]);
    console.log('PASS: install fallback, offline page/scripts/audio, update activation, preserved model cache, no browser errors (AI stubbed)');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
