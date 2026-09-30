// pump.fun: where a coin's creator fees accrue and how to collect them.
//
// Every trade on a bonding curve sets a creator fee aside in a vault owned by
// the Pump program, keyed by the creator's wallet ("creator-vault", creator).
// Once the coin graduates to PumpSwap, trades there accrue into a second vault
// owned by the AMM program ("creator_vault", creator), as wrapped SOL. Both are
// collected with permissionless instructions; the money lands in the creator's
// wallet. Program ids and layouts come from pump.fun's public IDLs.
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import { conn, pk } from './client.js';

export const PUMP_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const PUMP_AMM_PROGRAM = new PublicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA');
export const PUMP_FEES_PROGRAM = new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ');
const DISC = {
  collectCreatorFeeV2: Buffer.from([207, 17, 138, 242, 4, 34, 19, 56]),
  collectCoinCreatorFee: Buffer.from([160, 57, 89, 42, 181, 139, 43, 66]),
  transferCreatorFeesToPumpV2: Buffer.from([1, 33, 78, 185, 33, 67, 44, 92]),
};
// Rent of an empty creator vault: what the program leaves behind on collect.
const VAULT_RENT = 890_880n;

const pda = (seeds, program) => PublicKey.findProgramAddressSync(seeds, program)[0];
export const bondingCurvePda = (mint) => pda([Buffer.from('bonding-curve'), pk(mint).toBuffer()], PUMP_PROGRAM);
export const creatorVaultPda = (creator) => pda([Buffer.from('creator-vault'), pk(creator).toBuffer()], PUMP_PROGRAM);
export const ammCreatorVaultAuthority = (creator) => pda([Buffer.from('creator_vault'), pk(creator).toBuffer()], PUMP_AMM_PROGRAM);
const eventAuthority = (program) => pda([Buffer.from('__event_authority')], program);
export const isPumpMint = (mint) => typeof mint === 'string' && mint.endsWith('pump');

/**
 * The bonding curve of a coin: reserves, whether it completed (graduated), and
 * the creator who receives the fees. Null when the mint was not launched on
 * pump.fun. Layout: 8-byte discriminator, then 5 u64, a bool, a pubkey.
 */
export async function readBondingCurve(mint) {
  const info = await conn().getAccountInfo(bondingCurvePda(mint), 'confirmed');
  if (!info || info.data.length < 8 + 5 * 8 + 1 + 32) return null;
  const d = info.data;
  const u64 = (o) => d.readBigUInt64LE(o);
  return {
    address: bondingCurvePda(mint).toBase58(),
    virtualTokenReserves: u64(8), virtualSolReserves: u64(16), realTokenReserves: u64(24), realSolReserves: u64(32), tokenTotalSupply: u64(40),
    complete: d[48] === 1,
    creator: new PublicKey(d.subarray(49, 81)).toBase58(),
  };
}

/** Fees waiting for a creator, in lamports: the bonding-curve vault, and the AMM vault (wrapped SOL) for graduated coins. */
export async function pendingCreatorFees(creator) {
  const c = conn();
  const vault = creatorVaultPda(creator);
  const lamports = BigInt(await c.getBalance(vault, 'confirmed'));
  const curve = lamports > VAULT_RENT ? lamports - VAULT_RENT : 0n;
  let amm = 0n;
  try {
    const ata = getAssociatedTokenAddressSync(NATIVE_MINT, ammCreatorVaultAuthority(creator), true);
    const bal = await c.getTokenAccountBalance(ata, 'confirmed');
    amm = BigInt(bal.value.amount);
  } catch { /* no AMM vault yet: the coin has not graduated or never traded there */ }
  return { curve, amm, total: curve + amm };
}

/**
 * The instructions that move every pending creator fee into the creator's
 * wallet. Permissionless: the payer signs, the creator receives. The AMM fees
 * are first moved into the Pump vault (as the docs describe), then the Pump
 * vault is emptied to the creator as SOL.
 */
export function collectCreatorFeeInstructions({ payer, creator, includeAmm = true }) {
  const creatorKey = pk(creator);
  const payerKey = pk(payer);
  const ixs = [];
  if (includeAmm) {
    const authority = ammCreatorVaultAuthority(creatorKey);
    const vaultAta = getAssociatedTokenAddressSync(NATIVE_MINT, authority, true);
    const pumpVault = creatorVaultPda(creatorKey);
    const pumpVaultAta = getAssociatedTokenAddressSync(NATIVE_MINT, pumpVault, true);
    ixs.push(new TransactionInstruction({
      programId: PUMP_AMM_PROGRAM, data: DISC.transferCreatorFeesToPumpV2,
      keys: [
        { pubkey: payerKey, isSigner: true, isWritable: true },
        { pubkey: NATIVE_MINT, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: creatorKey, isSigner: false, isWritable: false },
        { pubkey: authority, isSigner: false, isWritable: true },
        { pubkey: vaultAta, isSigner: false, isWritable: true },
        { pubkey: pumpVault, isSigner: false, isWritable: true },
        { pubkey: pumpVaultAta, isSigner: false, isWritable: true },
        { pubkey: eventAuthority(PUMP_AMM_PROGRAM), isSigner: false, isWritable: false },
        { pubkey: PUMP_AMM_PROGRAM, isSigner: false, isWritable: false },
      ],
    }));
  }
  const vault = creatorVaultPda(creatorKey);
  ixs.push(new TransactionInstruction({
    programId: PUMP_PROGRAM, data: DISC.collectCreatorFeeV2,
    keys: [
      { pubkey: creatorKey, isSigner: false, isWritable: true },
      { pubkey: getAssociatedTokenAddressSync(NATIVE_MINT, creatorKey, true), isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: getAssociatedTokenAddressSync(NATIVE_MINT, vault, true), isSigner: false, isWritable: true },
      { pubkey: NATIVE_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: eventAuthority(PUMP_PROGRAM), isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM, isSigner: false, isWritable: false },
    ],
  }));
  return ixs;
}

/** The token program that owns a mint: classic SPL, or Token-2022 (every xStock is one). */
export async function tokenProgramOf(mint) {
  const info = await conn().getAccountInfo(pk(mint), 'confirmed');
  if (!info) throw new Error(`No mint at ${mint}`);
  return info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}
/** The associated token account of an owner for a mint, and the instruction that creates it if missing. */
export const ata = (mint, owner, programId = TOKEN_PROGRAM_ID) => getAssociatedTokenAddressSync(pk(mint), pk(owner), true, programId);
export const createAtaIx = (payer, mint, owner, programId = TOKEN_PROGRAM_ID) => createAssociatedTokenAccountIdempotentInstruction(pk(payer), ata(mint, owner, programId), pk(owner), pk(mint), programId);
export { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID };
