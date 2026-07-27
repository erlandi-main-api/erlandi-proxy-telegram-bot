import type { ApiKeyRecord } from "./types.js";
import { statusOf } from "./utils.js";

export type QuotaFilter="all"|"active"|"low"|"exhausted"|"expired"|"paused"|"unlimited"|"expiring";
export type QuotaSort="balanceAsc"|"balanceDesc"|"usageDesc"|"expiryAsc"|"name";
export const LOW_QUOTA=100_000, EXPIRY_DAYS=3;

const finiteBalance=(key:ApiKeyRecord)=>key.unlimited?null:Math.max(0,Number(key.tokenBalance)||0);
const expiryTime=(key:ApiKeyRecord)=>key.expiresAt?new Date(key.expiresAt).getTime():Number.POSITIVE_INFINITY;
export const isLowQuota=(key:ApiKeyRecord,threshold=LOW_QUOTA)=>statusOf(key)==="active"&&!key.unlimited&&finiteBalance(key)!<=threshold;
export const isExpiring=(key:ApiKeyRecord,days=EXPIRY_DAYS,now=Date.now())=>{const expiry=expiryTime(key);return statusOf(key)==="active"&&expiry>now&&expiry<=now+days*86_400_000};

export function quotaSummary(keys:ApiKeyRecord[]){const statuses=Object.fromEntries(["active","paused","expired","exhausted"].map(status=>[status,keys.filter(key=>statusOf(key)===status).length]));return{total:keys.length,active:statuses.active||0,paused:statuses.paused||0,expired:statuses.expired||0,exhausted:statuses.exhausted||0,unlimited:keys.filter(key=>key.unlimited).length,totalBalance:keys.reduce((sum,key)=>sum+(finiteBalance(key)??0),0),totalUsed:keys.reduce((sum,key)=>sum+(Number(key.tokensUsed)||0),0),low:keys.filter(key=>isLowQuota(key)).length,expiring:keys.filter(key=>isExpiring(key)).length};}
export function filterQuota(keys:ApiKeyRecord[],filter:QuotaFilter){if(filter==="all")return [...keys];if(filter==="low")return keys.filter(key=>isLowQuota(key));if(filter==="unlimited")return keys.filter(key=>key.unlimited);if(filter==="expiring")return keys.filter(key=>isExpiring(key));return keys.filter(key=>statusOf(key)===filter);}
export function sortQuota(keys:ApiKeyRecord[],sort:QuotaSort){return [...keys].sort((a,b)=>{if(sort==="name")return a.name.localeCompare(b.name);if(sort==="usageDesc")return(Number(b.tokensUsed)||0)-(Number(a.tokensUsed)||0);if(sort==="expiryAsc")return expiryTime(a)-expiryTime(b);const av=finiteBalance(a),bv=finiteBalance(b);if(av===null&&bv===null)return a.name.localeCompare(b.name);if(av===null)return 1;if(bv===null)return-1;return sort==="balanceDesc"?bv-av:av-bv;});}
const csvCell=(value:unknown)=>`"${String(value??"").replace(/"/g,'""')}"`;
export function quotaCsv(keys:ApiKeyRecord[],owner:(id:string)=>number|null){const rows=[["id","name","status","balance","unlimited","tokens_used","expires_at","models","telegram_owner"],...keys.map(key=>[key.id,key.name,statusOf(key),key.unlimited?"":finiteBalance(key),key.unlimited?"yes":"no",Number(key.tokensUsed)||0,key.expiresAt||"",(key.models||[]).join(" | "),owner(key.id)??""])];return rows.map(row=>row.map(csvCell).join(",")).join("\r\n")+"\r\n";}
