import { z } from "zod";

const idSchema=z.string().regex(/^[a-z0-9_-]{1,40}$/);
const labelSchema=z.string().trim().min(1).max(64);
const builtinButtonSchema=z.object({id:idSchema,label:labelSchema,kind:z.literal("builtin"),target:z.literal("quota")}).strict();
const pageButtonSchema=z.object({id:idSchema,label:labelSchema,kind:z.literal("page"),target:idSchema}).strict();
const urlButtonSchema=z.object({id:idSchema,label:labelSchema,kind:z.literal("url"),target:z.string().url().refine(value=>["http:","https:"].includes(new URL(value).protocol),"Only HTTP(S) URLs are allowed")}).strict();
export const publicButtonSchema=z.discriminatedUnion("kind",[builtinButtonSchema,pageButtonSchema,urlButtonSchema]);
const rowsSchema=z.array(z.array(publicButtonSchema).min(1).max(8)).max(20).refine(rows=>rows.flat().length<=40,"Too many buttons");
const publicPageSchema=z.object({id:idSchema,title:z.string().trim().min(1).max(100),body:z.string().trim().min(1).max(3500)}).strict();
const baseSchema=z.object({version:z.literal(1),welcomeText:z.string().trim().min(1).max(3500),homeRows:rowsSchema,pages:z.array(publicPageSchema).max(20)}).strict();

export type PublicButton=z.infer<typeof publicButtonSchema>;
export type PublicPortalConfig=z.infer<typeof baseSchema>;

export const PUBLIC_PORTAL_SETTING_KEY="public_portal.v1";

export const DEFAULT_PUBLIC_PORTAL_CONFIG:PublicPortalConfig={
 version:1,
 welcomeText:"Erlandi Proxy\n\nCek status dan kuota API key Anda langsung melalui Telegram.\n\nTekan Cek Kuota API Key, lalu kirim API key yang ingin diperiksa.",
 homeRows:[
  [{id:"quota",label:"Cek Kuota API Key",kind:"builtin",target:"quota"}],
  [{id:"config",label:"Panduan Penggunaan",kind:"page",target:"guide"},{id:"support",label:"Hubungi Admin",kind:"page",target:"support"}]
 ],
 pages:[
  {id:"guide",title:"Panduan Penggunaan API",body:"<b>Base URL</b>\n<code>{base_url}</code>\n\n<b>Contoh request</b>\n<pre>curl {base_url}/chat/completions \\\n  -H \"Authorization: Bearer YOUR_API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"model\":\"YOUR_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Halo\"}]}'</pre>\nGanti <code>YOUR_API_KEY</code> dengan API key Anda dan <code>YOUR_MODEL</code> dengan model yang tersedia pada hasil cek kuota."},
  {id:"support",title:"Hubungi Admin",body:"{support}\n\nTelegram User ID Anda: {user_id}"}
 ]
};

export function validatePublicPortalConfig(value:unknown):PublicPortalConfig{
 const config=baseSchema.parse(value),buttons=config.homeRows.flat(),buttonIds=buttons.map(button=>button.id),pageIdsList=config.pages.map(page=>page.id);
 if(new Set(buttonIds).size!==buttonIds.length||new Set(pageIdsList).size!==pageIdsList.length)throw new Error("Button and page IDs must be unique");
 const pageIds=new Set(pageIdsList);
 for(const button of buttons)if(button.kind==="page"&&!pageIds.has(button.target))throw new Error(`Unknown page target: ${button.target}`);
 if(!buttons.some(button=>button.kind==="builtin"&&button.target==="quota"))throw new Error("Cek Kuota API Key wajib tersedia");
 if(Buffer.byteLength(JSON.stringify(config),"utf8")>65536)throw new Error("Portal configuration is too large");
 return config;
}

export function parsePublicPortalConfig(raw:string|null):{config:PublicPortalConfig;custom:boolean;valid:boolean}{
 if(!raw)return{config:structuredClone(DEFAULT_PUBLIC_PORTAL_CONFIG),custom:false,valid:true};
 try{return{config:validatePublicPortalConfig(JSON.parse(raw)),custom:true,valid:true}}catch{return{config:structuredClone(DEFAULT_PUBLIC_PORTAL_CONFIG),custom:false,valid:false}}
}

export function movePublicButton(config:PublicPortalConfig,id:string,direction:"up"|"down"):PublicPortalConfig{
 const next=structuredClone(config),locations=next.homeRows.flatMap((row,rowIndex)=>row.map((button,columnIndex)=>({button,rowIndex,columnIndex}))),index=locations.findIndex(item=>item.button.id===id),swap=direction==="up"?index-1:index+1;
 if(index<0||swap<0||swap>=locations.length)return next;
 const current=locations[index],target=locations[swap];
 [next.homeRows[current.rowIndex][current.columnIndex],next.homeRows[target.rowIndex][target.columnIndex]]=[target.button,current.button];
 return next;
}

export function publicButtonAction(button:PublicButton):{action:string;payload?:string}|{url:string}{
 if(button.kind==="url")return{url:button.target};
 if(button.kind==="page")return{action:"pubpage",payload:button.target};
 return{action:"pubquota"};
}
