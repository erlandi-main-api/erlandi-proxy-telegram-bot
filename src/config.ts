import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(20),
  OWNER_TELEGRAM_ID: z.coerce.number().int().positive(),
  GATEWAY_URL: z.string().url().default("http://127.0.0.1:20128"),
  GATEWAY_CLI_TOKEN: z.string().min(16),
  CALLBACK_SECRET: z.string().min(24),
  DATABASE_PATH: z.string().default("./data/bot.sqlite"),
  LOG_LEVEL: z.string().default("info"),
  KEY_MESSAGE_TTL_SECONDS: z.coerce.number().int().min(30).default(120),
  LIVE_WATCH_SECONDS: z.coerce.number().int().min(30).max(1800).default(300)
});

export type Config = z.infer<typeof schema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config { return schema.parse(env); }
