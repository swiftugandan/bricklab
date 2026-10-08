import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync,existsSync} from 'node:fs';import {join,relative} from 'node:path';
const DIST=new URL('../dist/',import.meta.url).pathname,read=f=>readFileSync(join(DIST,f),'utf8');
const sw=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest')),pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[relative(DIST,join(dir,e.name))]);
// A PNG's width and height sit in its IHDR chunk, at bytes 16 to 23.
const pngSize=f=>{const b=readFileSync(join(DIST,f));return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;};

test('the service worker version follows package.json, so each release installs a fresh offline copy',()=>{assert.equal(sw.match(/const VERSION = '([^']+)'/)[1],pkg.version);});
test('the service worker precaches every file in the studio and nothing that is missing',()=>{const shell=JSON.parse(sw.match(/const SHELL = (\[[^\]]*\])/)[1].replace(/'/g,'"'));assert.ok(shell.includes('./'),'the start page');assert.deepEqual(shell.filter(f=>f!=='./').sort(),files(DIST).filter(f=>f!=='sw.js').sort());});
test('the manifest is relative to the studio, so it installs at any path',()=>{for(const k of ['id','start_url','scope'])assert.equal(manifest[k],'./',k);assert.equal(manifest.display,'standalone');});
test('every manifest icon exists at the size it claims, with a maskable one for Android',()=>{for(const icon of manifest.icons){assert.ok(existsSync(join(DIST,icon.src)),icon.src);if(icon.type==='image/png')assert.equal(pngSize(icon.src),icon.sizes,icon.src);}assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));assert.ok(['192x192','512x512'].every(s=>manifest.icons.some(i=>i.sizes===s&&i.purpose==='any')));});
test('the page links the manifest and an apple-touch-icon that exist',()=>{const html=read('index.html');for(const [,href] of html.matchAll(/rel="(?:manifest|apple-touch-icon)" href="\.\/([^"]+)"/g))assert.ok(existsSync(join(DIST,href)),href);assert.match(html,/rel="manifest"/);assert.match(html,/rel="apple-touch-icon"/);});
