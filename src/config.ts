import { z } from 'zod';

const schema = z.object({
  BOT_TOKEN: z.string().min(1), MONGO_URL: z.string().min(1), APP_NAME: z.string().default('Pulse Copy'),
  ADMIN_CHAT_ID: z.string().optional(), LEADER_WALLETS: z.string().default(''), SOLANA_RPC_URL: z.string().url().default('https://api.mainnet-beta.solana.com'),
  ROBINHOOD_CHAIN_ID: z.coerce.number().int().positive().optional(), ROBINHOOD_RPC_URL: z.string().url().optional(),
  ROBINHOOD_EXPLORER_URL: z.string().url().optional(), COPY_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  LIVE_TRADING_ENABLED: z.enum(['true','false']).default('false').transform(v => v === 'true'), EXECUTION_PRIVATE_KEY: z.string().optional(),
  JUPITER_API_URL: z.string().url().default('https://quote-api.jup.ag/v6')
});
export const config = schema.parse(process.env);
export const leaders = config.LEADER_WALLETS.split(',').map(v => v.trim()).filter(Boolean);
