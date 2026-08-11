import { PublicKey, Keypair } from "@solana/web3.js";
import { isAddress, isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import bs58 from "bs58";
export function validateAddress(chain, address) {
    return extractAddress(chain, address) !== null;
}
export function extractAddress(chain, address) {
    if (chain === "robinhood") {
        // Public address
        if (isAddress(address))
            return address;
        // Private key: 0x-prefixed 32-byte hex
        if (isHex(address) && address.length === 66) {
            try {
                const account = privateKeyToAccount(address);
                return account.address;
            }
            catch {
                return null;
            }
        }
        return null;
    }
    // Solana public address
    try {
        new PublicKey(address);
        return address;
    }
    catch { }
    // Solana private key: base58-encoded secret key (64 bytes) or seed (32 bytes)
    try {
        const decoded = bs58.decode(address);
        if (decoded.length === 64) {
            return Keypair.fromSecretKey(decoded).publicKey.toBase58();
        }
        if (decoded.length === 32) {
            return Keypair.fromSeed(decoded).publicKey.toBase58();
        }
        return null;
    }
    catch {
        return null;
    }
}
