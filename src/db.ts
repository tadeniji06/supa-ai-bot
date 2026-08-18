import mongoose, { Schema } from 'mongoose';
import { config } from './config.js';

export type Chain = 'solana' | 'robinhood';

const walletSchema = new Schema({
  address: { type: String, required: true },
  privateKey: { type: String, required: true },
  chain: { type: String, enum: ['solana', 'robinhood'], required: true },
  isImported: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new Schema({ 
  chatId: { type: String, unique: true, index: true }, 
  username: String, 
  walletAddress: { type: String, index: true }, 
  privateKey: String, 
  chain: { type: String, enum: ['solana','robinhood'] },
  wallets: [walletSchema],
  activeWalletId: { type: Schema.Types.ObjectId },
  enabled: { type: Boolean, default: true }, 
  copyRatio: { type: Number, default: 1 }, 
  maxTradeUsd: { type: Number, default: 100 }, 
  createdAt: { type: Date, default: Date.now }, 
  lastSeenAt: Date 
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export async function connectDb() { await mongoose.connect(config.MONGO_URL); }
