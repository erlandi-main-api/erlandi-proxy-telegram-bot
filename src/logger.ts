import pino from "pino";
export const createLogger=(level:string)=>pino({level,redact:{paths:["token","botToken","gatewayToken","key","customKey","req.headers.authorization","req.headers.x-9r-cli-token"],censor:"[REDACTED]"}});
