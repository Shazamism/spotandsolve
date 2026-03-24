const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.intel'));

const assets = {};
for (const file of files) {
    const data = fs.readFileSync(path.join(dir, file));
    const base64 = data.toString('base64');
    assets[file] = `data:image/jpeg;base64,${base64}`;
}

const jsContent = `window.INTEL_ASSETS = ${JSON.stringify(assets)};\n`;
fs.writeFileSync(path.join(dir, 'assets.js'), jsContent);
console.log('Successfully generated assets.js with', files.length, 'files.');
