import { createHmac, timingSafeEqual } from "node:crypto";
import type { Permission, Role } from "./types.js";

const rolePermissions: Record<Role, Permission[]> = {
  owner: ["keys.read","keys.write","keys.delete","monitor.read","users.manage","alerts.manage","audit.read","system.read"],
  admin: ["keys.read","keys.write","keys.delete","monitor.read","users.manage","alerts.manage","audit.read","system.read"],
  operator: ["keys.read","keys.write","monitor.read","system.read"],
  viewer: ["keys.read","monitor.read","system.read"]
};
export const can = (role: Role, permission: Permission) => rolePermissions[role].includes(permission);

export class CallbackSigner {
  private payloads = new Map<string,{value:string;expiry:number}>();
  constructor(private readonly secret: string, private readonly ttlSeconds = 900) {}
  sign(action: string, payload = ""): string {
    const now = Math.floor(Date.now()/1000), expiry = now + this.ttlSeconds;
    if(this.payloads.size>500)for(const [key,item] of this.payloads)if(item.expiry<now)this.payloads.delete(key);
    let encoded = payload;
    if (`${action}|${payload}|${expiry}|`.length + 12 > 64) {
      const token = createHmac("sha256", this.secret).update(`${payload}|${expiry}`).digest("base64url").slice(0, 10);
      this.payloads.set(token,{value:payload,expiry}); encoded=`@${token}`;
    }
    const body = `${action}|${encoded}|${expiry}`;
    const sig = createHmac("sha256", this.secret).update(body).digest("base64url").slice(0, 12);
    return `${body}|${sig}`;
  }
  verify(data: string): { action: string; payload: string } | null {
    const parts = data.split("|"); if (parts.length !== 4) return null;
    const [action,encoded,expiryRaw,sig] = parts; const expiry = Number(expiryRaw);
    if (!Number.isFinite(expiry) || expiry < Date.now()/1000) return null;
    const expected = createHmac("sha256", this.secret).update(`${action}|${encoded}|${expiry}`).digest("base64url").slice(0,12);
    const a=Buffer.from(sig), b=Buffer.from(expected); if(a.length!==b.length||!timingSafeEqual(a,b)) return null;
    let payload=encoded;
    if(encoded.startsWith("@")){const stored=this.payloads.get(encoded.slice(1));if(!stored||stored.expiry!==expiry)return null;payload=stored.value;}
    return { action, payload };
  }
}

export class RateLimiter {
  private buckets = new Map<number,{count:number;reset:number}>();
  constructor(private readonly max=30, private readonly windowMs=60_000) {}
  allow(id:number):boolean { const now=Date.now();if(this.buckets.size>500)for(const [key,item] of this.buckets)if(item.reset<=now)this.buckets.delete(key);const old=this.buckets.get(id); if(!old||old.reset<=now){this.buckets.set(id,{count:1,reset:now+this.windowMs});return true;} if(old.count>=this.max)return false; old.count++; return true; }
}
