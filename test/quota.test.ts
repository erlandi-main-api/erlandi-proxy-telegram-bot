import test from "node:test";
import assert from "node:assert/strict";
import { filterQuota,isExpiring,isLowQuota,quotaCsv,quotaProgress,quotaSummary,sortQuota } from "../src/quota.js";
import type { ApiKeyRecord } from "../src/types.js";

const now=Date.now();
const keys:ApiKeyRecord[]=[
 {id:"a",name:"Low, \"Client\"",isActive:true,tokenBalance:50,tokensUsed:100,models:["combo-a"],expiresAt:new Date(now+86_400_000).toISOString()},
 {id:"b",name:"Unlimited",isActive:true,unlimited:true,tokenBalance:null,tokensUsed:500},
 {id:"c",name:"Empty",isActive:true,tokenBalance:0,tokensUsed:300},
 {id:"d",name:"Paused",isActive:false,tokenBalance:10,tokensUsed:20}
];
test("quota progress calculates finite percentages and bar",()=>{const p=quotaProgress({unlimited:false,tokenBalance:750,tokensUsed:250});assert.equal(p.total,1000);assert.equal(p.usedPercent,25);assert.equal(p.remainingPercent,75);assert.equal(p.bar,"███░░░░░░░")});
test("quota progress handles exhausted, zero, and unlimited",()=>{assert.equal(quotaProgress({unlimited:false,tokenBalance:0,tokensUsed:100}).usedPercent,100);assert.equal(quotaProgress({unlimited:false,tokenBalance:0,tokensUsed:0}).usedPercent,0);const unlimited=quotaProgress({unlimited:true,tokenBalance:null,tokensUsed:50});assert.equal(unlimited.total,null);assert.equal(unlimited.usedPercent,null);assert.equal(unlimited.bar,"∞ Unlimited")});

test("quota summary separates finite and unlimited balances",()=>{const s=quotaSummary(keys);assert.equal(s.total,4);assert.equal(s.unlimited,1);assert.equal(s.totalBalance,60);assert.equal(s.totalUsed,920);assert.equal(s.low,1);assert.equal(s.exhausted,1);assert.equal(s.paused,1)});
test("quota filters and expiry",()=>{assert.equal(filterQuota(keys,"low").map(x=>x.id).join(),"a");assert.equal(filterQuota(keys,"unlimited")[0].id,"b");assert.equal(isLowQuota(keys[1]),false);assert.equal(isExpiring(keys[0],3,now),true)});
test("quota sorting keeps unlimited after finite balances",()=>{assert.deepEqual(sortQuota(keys,"balanceAsc").map(x=>x.id),["c","d","a","b"]);assert.equal(sortQuota(keys,"usageDesc")[0].id,"b")});
test("quota CSV escapes values and excludes key secrets",()=>{const csv=quotaCsv([{...keys[0],key:"must-not-leak"}],()=>123);assert.match(csv,/"Low, ""Client"""/);assert.match(csv,/"123"/);assert.equal(csv.includes("must-not-leak"),false)});
