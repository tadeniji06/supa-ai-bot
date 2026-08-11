import { config } from './config.js';
export type CopyTrade = { chain: 'solana'|'robinhood'; leader: string; tokenIn: string; tokenOut: string; amount: string; txHash?: string };
export async function executeCopyTrade(trade: CopyTrade) {
  if (!config.LIVE_TRADING_ENABLED) throw new Error('Live trading is disabled. Set LIVE_TRADING_ENABLED=true after configuring a signer and routers.');
  if (!config.EXECUTION_PRIVATE_KEY) throw new Error('No execution signer configured.');
  throw new Error(`No live ${trade.chain} router adapter configured; refusing to fabricate a trade.`);
}
