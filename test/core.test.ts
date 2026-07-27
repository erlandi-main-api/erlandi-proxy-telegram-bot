import test from "node:test";
import assert from "node:assert/strict";
import { CallbackSigner,RateLimiter,can } from "../src/security.js";
import { page,statusOf } from "../src/utils.js";

test("RBAC blocks destructive actions for operator",()=>{assert.equal(can("owner","keys.delete"),true);assert.equal(can("operator","keys.delete"),false);assert.equal(can("viewer","keys.write"),false)});
test("signed callbacks verify, reject tampering, and preserve long payloads",()=>{const s=new CallbackSigner("a-secure-test-secret-with-32-bytes",60),value=s.sign("key","abc");assert.deepEqual(s.verify(value),{action:"key",payload:"abc"});assert.equal(s.verify(value.replace("abc","xyz")),null);const long="provider/"+"model-".repeat(20),packed=s.sign("modeltoggle",long);assert.ok(Buffer.byteLength(packed)<=64);assert.deepEqual(s.verify(packed),{action:"modeltoggle",payload:long})});
test("pagination clamps page",()=>{const p=page([1,2,3,4,5],9,2);assert.deepEqual(p.items,[5]);assert.equal(p.page,2);assert.equal(p.pages,3)});
test("key status precedence",()=>{assert.equal(statusOf({isActive:false}),"paused");assert.equal(statusOf({isActive:true,unlimited:false,tokenBalance:0}),"exhausted")});
test("rate limiter rejects overflow",()=>{const r=new RateLimiter(2,10000);assert.equal(r.allow(1),true);assert.equal(r.allow(1),true);assert.equal(r.allow(1),false)});
