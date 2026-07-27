export function page<T>(items:T[],index:number,size=8){const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.max(0,Math.min(index,pages-1));return{items:items.slice(current*size,(current+1)*size),page:current,pages,total:items.length};}
export const fmt=(n:unknown)=>Number(n||0).toLocaleString("en-US");
export const escapeHtml=(s:unknown)=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
export const statusOf=(key:any)=>key.status||(!1===key.isActive?"paused":key.expiresAt&&new Date(key.expiresAt)<=new Date()?"expired":!key.unlimited&&Number(key.tokenBalance)<=0?"exhausted":"active");
