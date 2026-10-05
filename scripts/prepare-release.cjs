// Give every deployment its own offline cache, including HTML-only changes.
const fs = require('node:fs');
const path = require('node:path');
const revision = process.env.GITHUB_SHA;
if (!revision || !/^[a-f0-9]{40}$/i.test(revision)) throw new Error('Expected GITHUB_SHA');
const version = `v17-${revision.slice(0, 8)}`;
const out = path.resolve('_site');
fs.mkdirSync(out, { recursive: true });
for (const file of ['index.html', 'service-worker.js', 'manifest.json']) {
  let content = fs.readFileSync(file, 'utf8');
  if (file === 'index.html') {
    if (!content.includes("const APP_VERSION = 'v17'")) throw new Error('Missing page version marker');
    content = content.replace("const APP_VERSION = 'v17'", `const APP_VERSION = '${version}'`);
  }
  if (file === 'service-worker.js') {
    if (!content.includes('pigeon-guard-v17')) throw new Error('Missing worker version marker');
    content = content.replace('pigeon-guard-v17', `pigeon-guard-${version}`);
  }
  fs.writeFileSync(path.join(out, file), content);
}
fs.cpSync('static', path.join(out, 'static'), { recursive: true });
console.log(`Prepared ${version}`);
