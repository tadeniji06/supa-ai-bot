import 'dotenv/config';
import { Bot, InlineKeyboard, GrammyError, HttpError, session, Context, SessionFlavor } from 'grammy';
import { config, leaders } from './config.js';
import { connectDb, User, type Chain } from './db.js';
import { extractAddress, generateSolanaWallet, generateRobinhoodWallet } from './addresses.js';

interface SessionData {
  step: 'idle' | 'waiting_solana' | 'waiting_robinhood';
}
type MyContext = Context & SessionFlavor<SessionData>;

import * as http from 'http';
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(port, () => {
  console.log(`Dummy server listening on port ${port} to satisfy PaaS health checks`);
});

console.log('Connecting to database...');
await connectDb();
console.log('Database connected.');
const bot = new Bot<MyContext>(config.BOT_TOKEN);

bot.use(session({ initial: (): SessionData => ({ step: 'idle' }) }));

const startKeyboard = new InlineKeyboard()
  .text('🟣 Connect Solana', 'connect_solana').row()
  .text('🟢 Connect Robinhood', 'connect_robinhood').row()
  .text('👤 My Profile', 'profile').text('⚙️ Settings', 'settings');

bot.command('start', async ctx => {
  ctx.session.step = 'idle';
  const text = `<b>🌟 Welcome to ${config.APP_NAME} 🌟</b>\n\nThe ultimate cross-chain copy trading bot for <b>Solana</b> and <b>Robinhood Chain</b>.\n\nConnect your wallet to activate your profile, track elite traders, and qualify for exclusive airdrops! 🪂\n\nSelect a network below to get started:`;
  await ctx.reply(text, { reply_markup: startKeyboard, parse_mode: 'HTML' });
});

bot.callbackQuery('connect_solana', async ctx => {
  await ctx.answerCallbackQuery();
  const kb = new InlineKeyboard()
    .text('📥 Import Wallet', 'import_solana').row()
    .text('✨ Generate New Wallet', 'generate_solana');
  await ctx.reply('🟣 <b>Solana Setup</b>\n\nChoose an option:', { reply_markup: kb, parse_mode: 'HTML' });
});

bot.callbackQuery('connect_robinhood', async ctx => {
  await ctx.answerCallbackQuery();
  const kb = new InlineKeyboard()
    .text('📥 Import Wallet', 'import_robinhood').row()
    .text('✨ Generate New Wallet', 'generate_robinhood');
  await ctx.reply('🟢 <b>Robinhood Chain Setup</b>\n\nChoose an option:', { reply_markup: kb, parse_mode: 'HTML' });
});

bot.callbackQuery('import_solana', async ctx => {
  ctx.session.step = 'waiting_solana';
  await ctx.answerCallbackQuery();
  await ctx.reply('🟣 <b>Solana Import</b>\n\nPlease paste your Solana wallet private key or phrase below to connect your wallet:', { parse_mode: 'HTML' });
});

bot.callbackQuery('import_robinhood', async ctx => {
  ctx.session.step = 'waiting_robinhood';
  await ctx.answerCallbackQuery();
  await ctx.reply('🟢 <b>Robinhood Import</b>\n\nPlease paste your Robinhood EVM wallet private key or phrase below to connect your wallet:', { parse_mode: 'HTML' });
});

bot.callbackQuery('generate_solana', async ctx => {
  await ctx.answerCallbackQuery();
  const wallet = generateSolanaWallet();
  const newWallet = { address: wallet.address, privateKey: wallet.privateKey, chain: 'solana', isImported: false };
  const u = await User.findOneAndUpdate(
    { chatId: String(ctx.chat?.id) },
    { $setOnInsert: { chatId: String(ctx.chat?.id), username: ctx.from?.username }, $push: { wallets: newWallet }, $set: { lastSeenAt: new Date() } },
    { upsert: true, new: true }
  );
  if (u.wallets.length > 0) {
    u.activeWalletId = u.wallets[u.wallets.length - 1]._id;
    await u.save();
  }
  const msg = `✅ <b>Solana Wallet Generated! 🎉</b>\n\n<b>Public Address:</b>\n<code>${wallet.address}</code>\n\n<b>Private Key:</b> (SAVE THIS SOMEWHERE SAFE!)\n<code>${wallet.privateKey}</code>\n\n<i>(Tap to copy)</i>\n\nYour profile is now active. Fund your wallet to start copying!`;
  await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: startKeyboard });
});

bot.callbackQuery('generate_robinhood', async ctx => {
  await ctx.answerCallbackQuery();
  const wallet = generateRobinhoodWallet();
  const newWallet = { address: wallet.address, privateKey: wallet.privateKey, chain: 'robinhood', isImported: false };
  const u = await User.findOneAndUpdate(
    { chatId: String(ctx.chat?.id) },
    { $setOnInsert: { chatId: String(ctx.chat?.id), username: ctx.from?.username }, $push: { wallets: newWallet }, $set: { lastSeenAt: new Date() } },
    { upsert: true, new: true }
  );
  if (u.wallets.length > 0) {
    u.activeWalletId = u.wallets[u.wallets.length - 1]._id;
    await u.save();
  }
  const msg = `✅ <b>Robinhood Wallet Generated! 🎉</b>\n\n<b>Public Address:</b>\n<code>${wallet.address}</code>\n\n<b>Private Key:</b> (SAVE THIS SOMEWHERE SAFE!)\n<code>${wallet.privateKey}</code>\n\n<i>(Tap to copy)</i>\n\nYour profile is now active. Fund your wallet to start copying!`;
  await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: startKeyboard });
});

bot.callbackQuery('profile', async ctx => {
  await ctx.answerCallbackQuery();
  const u = await User.findOne({ chatId: String(ctx.chat?.id) });
  
  const activeWallet = u?.wallets?.find(w => String(w._id) === String(u.activeWalletId)) || u?.wallets?.[0];
  const fallbackAddress = u?.walletAddress;
  const fallbackChain = u?.chain;

  if (!activeWallet && !fallbackAddress) {
    return ctx.reply('❌ <b>No wallet connected yet.</b>\n\nPlease connect a wallet to view your profile.', { parse_mode: 'HTML', reply_markup: startKeyboard });
  }

  const address = activeWallet ? activeWallet.address : fallbackAddress;
  const chain = activeWallet ? activeWallet.chain : fallbackChain;

  const status = u?.enabled ? '✅ Active' : '⏸ Paused';
  const text = `👤 <b>Your Profile</b>\n\n<b>Chain:</b> ${chain === 'robinhood' ? 'Robinhood' : 'Solana'}\n<b>Active Wallet:</b> <code>${address}</code> (tap to copy)\n<b>Status:</b> ${status}\n<b>Copy Ratio:</b> ${u?.copyRatio}x\n<b>Max Trade:</b> $${u?.maxTradeUsd}\n\n<i>Stay active for upcoming airdrops! 🪂</i>`;
  
  const kb = new InlineKeyboard();
  if (u && u.wallets && u.wallets.length > 0) {
    kb.text('💳 Manage Wallets', 'manage_wallets').row();
  }
  kb.text('🟣 Connect Solana', 'connect_solana').text('🟢 Connect Robinhood', 'connect_robinhood').row()
    .text('⚙️ Settings', 'settings');

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
});

bot.callbackQuery('manage_wallets', async ctx => {
  await ctx.answerCallbackQuery();
  const u = await User.findOne({ chatId: String(ctx.chat?.id) });
  if (!u || !u.wallets || u.wallets.length === 0) {
    return ctx.reply('❌ <b>No wallets found.</b>', { parse_mode: 'HTML', reply_markup: startKeyboard });
  }

  const kb = new InlineKeyboard();
  u.wallets.forEach((w, i) => {
    const isActive = String(w._id) === String(u.activeWalletId);
    const label = `${isActive ? '✅' : '⚪️'} ${w.chain === 'solana' ? 'Solana' : 'Robinhood'} - ${w.address.slice(0, 4)}...${w.address.slice(-4)}`;
    kb.text(label, `select_wallet_${w._id}`).row();
  });
  kb.text('🔙 Back to Profile', 'profile');

  await ctx.reply('💳 <b>Manage Wallets</b>\n\nSelect a wallet to make it active:', { parse_mode: 'HTML', reply_markup: kb });
});

bot.callbackQuery(/^select_wallet_(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();
  const walletId = ctx.match[1];
  const u = await User.findOne({ chatId: String(ctx.chat?.id) });
  if (u && u.wallets) {
    const exists = u.wallets.find(w => String(w._id) === walletId);
    if (exists) {
      u.activeWalletId = exists._id;
      await u.save();
      await ctx.reply(`✅ <b>Active wallet switched to ${exists.address}</b>`, { parse_mode: 'HTML', reply_markup: startKeyboard });
      return;
    }
  }
  await ctx.reply('❌ Wallet not found.', { reply_markup: startKeyboard });
});

bot.callbackQuery('settings', async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.reply('⚙️ <b>Copy Settings</b>\n\nTo update your settings, use the following commands:\n\n🔹 <code>/ratio &lt;0.1-5&gt;</code> - Set your multiplier (e.g. /ratio 1.5)\n🔹 <code>/maxtrade &lt;USD&gt;</code> - Set max USD per trade (e.g. /maxtrade 50)', { parse_mode: 'HTML' });
});

bot.command('cancel', async ctx => {
  ctx.session.step = 'idle';
  await ctx.reply('🛑 Operation cancelled.', { reply_markup: startKeyboard });
});

bot.command('ratio', async ctx => {
  const value = Number(ctx.message?.text?.split(/\s+/)[1]);
  if (!Number.isFinite(value) || value < 0.1 || value > 5) return ctx.reply('❌ Ratio must be between 0.1 and 5. Example: <code>/ratio 1.0</code>', { parse_mode: 'HTML' });
  await User.updateOne({ chatId: String(ctx.chat?.id) }, { copyRatio: value });
  await ctx.reply(`✅ <b>Copy ratio set to ${value}x.</b>`, { parse_mode: 'HTML' });
});

bot.command('maxtrade', async ctx => {
  const value = Number(ctx.message?.text?.split(/\s+/)[1]);
  if (!Number.isFinite(value) || value <= 0) return ctx.reply('❌ Enter a positive USD amount. Example: <code>/maxtrade 100</code>', { parse_mode: 'HTML' });
  await User.updateOne({ chatId: String(ctx.chat?.id) }, { maxTradeUsd: value });
  await ctx.reply(`✅ <b>Maximum copied trade set to $${value}.</b>`, { parse_mode: 'HTML' });
});

bot.on('message:text', async (ctx, next) => {
  const step = ctx.session.step;
  if (step === 'waiting_solana' || step === 'waiting_robinhood') {
    const chain = step === 'waiting_solana' ? 'solana' : 'robinhood';
    const input = ctx.message.text.trim();
    
    const address = extractAddress(chain, input);
    
    if (!address) {
      return ctx.reply(`❌ <b>Invalid ${chain === 'robinhood' ? 'Robinhood' : 'Solana'} private key or phrase.</b>\n\nPlease try again or use /cancel to go back.`, { parse_mode: 'HTML' });
    }
    
    const newWallet = { address, privateKey: input, chain, isImported: true };
    const u = await User.findOneAndUpdate(
      { chatId: String(ctx.chat?.id) },
      { $setOnInsert: { chatId: String(ctx.chat?.id), username: ctx.from?.username }, $push: { wallets: newWallet }, $set: { lastSeenAt: new Date() } },
      { upsert: true, new: true }
    );
    if (u.wallets.length > 0) {
      u.activeWalletId = u.wallets[u.wallets.length - 1]._id;
      await u.save();
    }
    
    ctx.session.step = 'idle';
    const msg = `✅ <b>Wallet Connected Successfully! 🎉</b>\n\n<b>Chain:</b> ${chain === 'robinhood' ? 'Robinhood' : 'Solana'}\n<b>Public Address:</b>\n<code>${address}</code>\n\n<i>(Tap the address to copy it)</i>\n\nYour profile is now active. We're tracking your activity for exclusive airdrops! 🪂`;
    return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: startKeyboard });
  }
  return next();
});

bot.catch(err => {
  const e = err.error;
  if (e instanceof GrammyError) console.error('Telegram error', e.description);
  else if (e instanceof HttpError) console.error('Network error', e);
  else console.error('Bot error', e);
});

console.log(`${config.APP_NAME} started. Leaders configured: ${leaders.length}. Live trading: ${config.LIVE_TRADING_ENABLED}`);
await bot.start();
