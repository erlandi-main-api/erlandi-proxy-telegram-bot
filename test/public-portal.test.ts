import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PUBLIC_PORTAL_CONFIG, movePublicButton, parsePublicPortalConfig, publicButtonAction, validatePublicPortalConfig } from "../src/public-portal.js";

test("default portal preserves the existing public start menu",()=>{
 const parsed=parsePublicPortalConfig(null);
 assert.equal(parsed.custom,false);
 assert.equal(parsed.config.welcomeText,DEFAULT_PUBLIC_PORTAL_CONFIG.welcomeText);
 assert.deepEqual(parsed.config.homeRows.flat().map(button=>button.label),["Cek Kuota API Key","Panduan Penggunaan","Hubungi Admin"]);
 assert.deepEqual(parsed.config.homeRows.flat().map(publicButtonAction),[{action:"pubquota"},{action:"pubpage",payload:"guide"},{action:"pubpage",payload:"support"}]);
});

test("portal accepts custom pages and safe URLs",()=>{
 const config=structuredClone(DEFAULT_PUBLIC_PORTAL_CONFIG);
 config.pages.push({id:"about",title:"Tentang",body:"Informasi layanan"});
 config.homeRows.push([{id:"about_button",label:"Tentang",kind:"page",target:"about"},{id:"website",label:"Website",kind:"url",target:"https://example.com"}]);
 assert.deepEqual(validatePublicPortalConfig(config),config);
 assert.deepEqual(publicButtonAction(config.homeRows[2][0]),{action:"pubpage",payload:"about"});
 assert.deepEqual(publicButtonAction(config.homeRows[2][1]),{url:"https://example.com"});
});

test("portal rejects unsafe or broken menu targets",()=>{
 const unsafe=structuredClone(DEFAULT_PUBLIC_PORTAL_CONFIG) as any;
 unsafe.homeRows.push([{id:"bad",label:"Bad",kind:"url",target:"javascript:alert(1)"}]);
 assert.throws(()=>validatePublicPortalConfig(unsafe));
 const missing=structuredClone(DEFAULT_PUBLIC_PORTAL_CONFIG) as any;
 missing.homeRows.push([{id:"missing",label:"Missing",kind:"page",target:"not_found"}]);
 assert.throws(()=>validatePublicPortalConfig(missing));
 const noQuota=structuredClone(DEFAULT_PUBLIC_PORTAL_CONFIG);
 noQuota.homeRows=noQuota.homeRows.map(row=>row.filter(button=>!(button.kind==="builtin"&&button.target==="quota"))).filter(row=>row.length);
 assert.throws(()=>validatePublicPortalConfig(noQuota));
});

test("moving a button preserves existing row grouping",()=>{
 const moved=movePublicButton(DEFAULT_PUBLIC_PORTAL_CONFIG,"support","up");
 assert.deepEqual(moved.homeRows.map(row=>row.map(button=>button.id)),[["quota"],["support","config"]]);
 assert.deepEqual(DEFAULT_PUBLIC_PORTAL_CONFIG.homeRows.map(row=>row.map(button=>button.id)),[["quota"],["config","support"]]);
});

test("invalid stored configuration safely falls back to defaults",()=>{
 const parsed=parsePublicPortalConfig("{broken");
 assert.equal(parsed.valid,false);
 assert.equal(parsed.custom,false);
 assert.deepEqual(parsed.config,DEFAULT_PUBLIC_PORTAL_CONFIG);
});
