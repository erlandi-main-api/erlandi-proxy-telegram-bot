import { loadConfig } from "./config.js";
import { Store } from "./store.js";
import { GatewayClient } from "./gateway.js";
import { createLogger } from "./logger.js";
import { createBot } from "./bot.js";
import { startAlertJob } from "./jobs.js";

const config=loadConfig(), logger=createLogger(config.LOG_LEVEL);
const store=await Store.open(config.DATABASE_PATH,config.OWNER_TELEGRAM_ID);
const gateway=new GatewayClient(config.GATEWAY_URL,config.GATEWAY_CLI_TOKEN);
const bot=createBot(config,store,gateway,logger);
const stopAlerts=startAlertJob(bot,store,gateway,logger);
const shutdown=async(signal:string)=>{logger.info({signal},"shutting down");stopAlerts();await store.flush();bot.stop();};
process.once("SIGINT",()=>void shutdown("SIGINT"));process.once("SIGTERM",()=>void shutdown("SIGTERM"));
await bot.api.setMyCommands([{command:"start",description:"Open control panel"},{command:"menu",description:"Open inline menu"},{command:"cancel",description:"Cancel current wizard"}]);
logger.info({ownerId:config.OWNER_TELEGRAM_ID,gateway:config.GATEWAY_URL},"bot starting");
bot.start({onStart:info=>logger.info({username:info.username},"bot online")});
