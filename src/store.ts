import initSqlJs, { type Database } from "sql.js";
import { dirname } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { AppUser, Role, WizardState } from "./types.js";

export class Store {
  private constructor(private db: Database, private path: string) {}
  static async open(path: string, ownerId: number): Promise<Store> {
    const SQL = await initSqlJs(); let bytes: Uint8Array|undefined;
    try { bytes = await readFile(path); } catch {}
    const store = new Store(bytes ? new SQL.Database(bytes) : new SQL.Database(), path);
    store.db.run(`CREATE TABLE IF NOT EXISTS users(telegram_id INTEGER PRIMARY KEY, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, display_name TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, telegram_id INTEGER, action TEXT NOT NULL, target TEXT, details TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(telegram_id INTEGER PRIMARY KEY, state TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, threshold REAL, enabled INTEGER NOT NULL DEFAULT 1, chat_id INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS key_owners(key_id TEXT PRIMARY KEY, telegram_id INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS renewal_requests(id INTEGER PRIMARY KEY AUTOINCREMENT, telegram_id INTEGER NOT NULL, key_name TEXT NOT NULL, key_fingerprint TEXT NOT NULL, tokens INTEGER NOT NULL, days INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by INTEGER);`);
    store.db.run("INSERT OR IGNORE INTO users(telegram_id,role,active,created_at) VALUES(?,?,1,?)",[ownerId,"owner",new Date().toISOString()]); await store.flush(); return store;
  }
  private rows<T>(sql:string, params:unknown[]=[]):T[]{const result=this.db.exec(sql,params as never[])[0];if(!result)return[];return result.values.map(row=>Object.fromEntries(result.columns.map((c,i)=>[c,row[i]])) as T)}
  getUser(id:number):AppUser|null { const r=this.rows<Record<string,unknown>>("SELECT telegram_id,role,active,display_name FROM users WHERE telegram_id=?",[id])[0]; return r?{telegramId:Number(r.telegram_id),role:r.role as Role,active:Boolean(r.active),displayName:r.display_name as string|undefined}:null; }
  listUsers():AppUser[]{return this.rows<Record<string,unknown>>("SELECT telegram_id,role,active,display_name FROM users ORDER BY created_at").map(r=>({telegramId:Number(r.telegram_id),role:r.role as Role,active:Boolean(r.active),displayName:r.display_name as string|undefined}));}
  async upsertUser(id:number,role:Role,name?:string){this.db.run("INSERT INTO users(telegram_id,role,active,display_name,created_at) VALUES(?,?,1,?,?) ON CONFLICT(telegram_id) DO UPDATE SET role=excluded.role,active=1,display_name=excluded.display_name",[id,role,name||null,new Date().toISOString()]);await this.flush();}
  async setUserActive(id:number,active:boolean){this.db.run("UPDATE users SET active=? WHERE telegram_id=?",[active?1:0,id]);await this.flush();}
  async audit(userId:number|null,action:string,target?:string,details?:unknown){this.db.run("INSERT INTO audit(telegram_id,action,target,details,created_at) VALUES(?,?,?,?,?)",[userId,action,target||null,details?JSON.stringify(details):null,new Date().toISOString()]);await this.flush();}
  listAudit(limit=20){return this.rows<Record<string,unknown>>("SELECT telegram_id,action,target,created_at FROM audit ORDER BY id DESC LIMIT ?",[limit]);}
  getSession(id:number):WizardState|null{const r=this.rows<{state:string}>("SELECT state FROM sessions WHERE telegram_id=?",[id])[0];if(!r)return null;try{return JSON.parse(r.state)}catch{return null}}
  async setSession(id:number,state:WizardState){this.db.run("INSERT INTO sessions(telegram_id,state,updated_at) VALUES(?,?,?) ON CONFLICT(telegram_id) DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at",[id,JSON.stringify(state),new Date().toISOString()]);await this.flush();}
  async clearSession(id:number){this.db.run("DELETE FROM sessions WHERE telegram_id=?",[id]);await this.flush();}
  async bindKey(keyId:string,userId:number){this.db.run("INSERT INTO key_owners(key_id,telegram_id,created_at) VALUES(?,?,?) ON CONFLICT(key_id) DO UPDATE SET telegram_id=excluded.telegram_id",[keyId,userId,new Date().toISOString()]);await this.flush();}
  keyOwner(keyId:string):number|null{return Number(this.rows<{telegram_id:number}>("SELECT telegram_id FROM key_owners WHERE key_id=?",[keyId])[0]?.telegram_id)||null;}
  listAlerts(){return this.rows<Record<string,unknown>>("SELECT * FROM alerts ORDER BY id DESC");}
  async addAlert(kind:string,threshold:number|null,chatId:number){this.db.run("INSERT INTO alerts(kind,threshold,enabled,chat_id,created_at) VALUES(?,?,1,?,?)",[kind,threshold,chatId,new Date().toISOString()]);await this.flush();}
  async toggleAlert(id:number,enabled:boolean){this.db.run("UPDATE alerts SET enabled=? WHERE id=?",[enabled?1:0,id]);await this.flush();}
  async createRenewalRequest(userId:number,keyName:string,keyFingerprint:string,tokens:number,days:number){const now=new Date().toISOString();this.db.run("INSERT INTO renewal_requests(telegram_id,key_name,key_fingerprint,tokens,days,status,created_at,updated_at) VALUES(?,?,?,?,?,'pending',?,?)",[userId,keyName,keyFingerprint,tokens,days,now,now]);const id=Number(this.rows<{id:number}>("SELECT last_insert_rowid() AS id")[0]?.id);await this.flush();return id;}
  listRenewalRequests(status="pending",limit=20){return this.rows<Record<string,unknown>>("SELECT * FROM renewal_requests WHERE status=? ORDER BY id DESC LIMIT ?",[status,limit]);}
  getRenewalRequest(id:number){return this.rows<Record<string,unknown>>("SELECT * FROM renewal_requests WHERE id=?",[id])[0]||null;}
  async updateRenewalRequest(id:number,status:"reviewed"|"rejected"){this.db.run("UPDATE renewal_requests SET status=?,updated_at=? WHERE id=?",[status,new Date().toISOString(),id]);await this.flush();}
  getSetting(key:string):string|null{return this.rows<{value:string}>("SELECT value FROM settings WHERE key=?",[key])[0]?.value||null;}
  async setSetting(key:string,value:string,userId:number){this.db.run("INSERT INTO settings(key,value,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by",[key,value,new Date().toISOString(),userId]);await this.flush();}
  async deleteSetting(key:string){this.db.run("DELETE FROM settings WHERE key=?",[key]);await this.flush();}
  async flush(){await mkdir(dirname(this.path),{recursive:true});await writeFile(this.path,this.db.export());}
}
