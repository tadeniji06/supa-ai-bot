import { config } from './config.js';
export async function executeCopyTrade(trade) {
    if (!config.LIVE_TRADING_ENABLED)
        throw new Error('Live trading is disabled. Set LIVE_TRADING_ENABLED=true after configuring a signer and routers.');
    if (!config.EXECUTION_PRIVATE_KEY)
        throw new Error('No execution signer configured.');
    throw new Error(`No live ${trade.chain} router adapter configured; refusing to fabricate a trade.`);
}
