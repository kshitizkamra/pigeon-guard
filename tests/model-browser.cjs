const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const server = http.createServer((req,res)=>{
  const name = new URL(req.url,'http://localhost').pathname;
  // The old model is stubbed only for switch-lifecycle verification.
  if(name==='/static/tf.min.js') { res.setHeader('Content-Type','application/javascript');res.end('');return; }
  if(name==='/static/coco-ssd.min.js') { res.setHeader('Content-Type','application/javascript');res.end('window.cocoSsd={load:async()=>({detect:async()=>[],dispose(){}})};');return; }
  const file = path.resolve('.','.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
  try {
    res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'application/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch {res.writeHead(404).end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const context=await browser.newContext(), page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.setDefaultTimeout(120000);
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(()=>state.modelReady && state.modelBase==='yolox_tiny');
    const result=await page.evaluate(async()=>{
      let ticks=0;const timer=setInterval(()=>ticks++,5);
      const frame=document.createElement('canvas');frame.width=frame.height=416;
      const predictions=await state.model.detect(frame,20,.28);
      clearInterval(timer);return {ticks,predictions};
    });
    assert(result.ticks>2,'UI must keep scheduling callbacks during real model inference');
    assert(Array.isArray(result.predictions));
    await page.waitForFunction(()=>document.getElementById('offline-status').textContent.includes('saved for offline'));
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(()=>state.modelReady && state.modelBase==='yolox_tiny');
    await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=c.height=416;await state.model.detect(c);});
    await context.setOffline(false);
    await page.selectOption('#select-ai-model','coco');
    await page.waitForFunction(()=>state.modelReady && state.modelBase==='mobilenet_v2');
    await page.selectOption('#select-ai-model','yolox');
    await page.waitForFunction(()=>state.modelReady && state.modelBase==='yolox_tiny');
    assert.deepEqual(errors,[]);
    console.log('PASS: actual YOLOX worker loads and infers, UI remains schedulable, offline reload and inference, switching models');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
