import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GatewayClient } from "../src/gateway.js";
import { Store } from "../src/store.js";

function response(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})}

test("gateway sends CLI token and maps provider models plus LLM combos",async()=>{
 const old=globalThis.fetch,seen:RequestInit[]=[];
 globalThis.fetch=async(input,init={})=>{seen.push(init);const url=String(input);if(url.endsWith("/api/providers"))return response({connections:[{id:"c1",provider:"openai",name:"OpenAI",isActive:true}]});if(url.endsWith("/api/combos"))return response({combos:[{name:"premium",models:["openai/gpt"],kind:"llm"},{name:"voice",models:[],kind:"tts"}]});if(url.endsWith("/api/providers/c1/models"))return response({models:[{id:"gpt",name:"GPT"}]});throw Error(url)};
 try{const client=new GatewayClient("http://127.0.0.1:20128","service-secret-1234");const groups=await client.modelGroups();assert.equal((seen[0].headers as Record<string,string>)["x-9r-cli-token"],"service-secret-1234");assert.equal(groups[0].id,"combo");assert.equal(groups[0].models[0].id,"premium");assert.equal(groups.some(g=>g.models.some(m=>m.id==="voice")),false);assert.equal(groups.find(g=>g.id==="openai")?.models[0].id,"openai/gpt");}finally{globalThis.fetch=old}
});

test("gateway preserves key create payload",async()=>{const old=globalThis.fetch;let body:any;globalThis.fetch=async(_input,init={})=>{body=JSON.parse(String(init.body));return response({id:"k1",name:"Client",key:"secret"},201)};try{const client=new GatewayClient("http://localhost:20128","service-secret-1234");await client.createKey({name:"Client",models:"premium, openai/gpt",tokenQuota:"1000",expiresInDays:"30"});assert.deepEqual(body,{name:"Client",models:"premium, openai/gpt",tokenQuota:"1000",expiresInDays:"30"})}finally{globalThis.fetch=old}});

test("public quota and health never send the admin CLI token",async()=>{const old=globalThis.fetch;const headers:any[]=[];globalThis.fetch=async(input,init={})=>{headers.push(init.headers||{});if(String(input).endsWith("/api/health"))return response({ok:true});return response({name:"Client",status:"active",models:["premium"],allModels:false,tokenBalance:100,tokensUsed:10,unlimited:false,expiresAt:null})};try{const client=new GatewayClient("http://localhost:20128","admin-service-secret");const quota=await client.publicQuota("customer-secret-key");const health=await client.publicHealth();assert.equal(quota.name,"Client");assert.equal(health.ok,true);assert.equal(headers.some(value=>value["x-9r-cli-token"]),false)}finally{globalThis.fetch=old}});

test("renewal requests persist fingerprints without raw API keys",async()=>{const dir=await mkdtemp(join(tmpdir(),"erlandi-renew-")),path=join(dir,"bot.sqlite");try{const store=await Store.open(path,123),raw="customer-secret-key",fingerprint="0123456789abcdef",id=await store.createRenewalRequest(777,"Client",fingerprint,1000,30),request=store.getRenewalRequest(id) as any;assert.equal(request.key_fingerprint,fingerprint);assert.equal(JSON.stringify(request).includes(raw),false);assert.equal(request.status,"pending")}finally{await rm(dir,{recursive:true,force:true})}});

test("store persists owner, audit, and wizard",async()=>{const dir=await mkdtemp(join(tmpdir(),"erlandi-bot-")),path=join(dir,"bot.sqlite");try{const store=await Store.open(path,123);assert.equal(store.getUser(123)?.role,"owner");await store.audit(123,"test.action","target");assert.equal(store.listAudit(1)[0].action,"test.action");await store.setSession(123,{operation:"create",step:"name",models:[]});assert.equal(store.getSession(123)?.operation,"create");await store.clearSession(123);assert.equal(store.getSession(123),null)}finally{await rm(dir,{recursive:true,force:true})}});
