// Plain functions behind the swap form. They only read the SDK's built-in config (no network calls),
// so `src/lib/swap.test.ts` runs them against the installed @sodax/sdk version: a dependency bump that
// changes chain keys, token lists or the intent shape fails the tests instead of the running app.
import {
  baseChainInfo,
  ChainKeys,
  EVM_SPOKE_ONLY_CHAIN_KEYS,
  type CreateIntentParams,
  type Sodax,
  type XToken,
} from '@sodax/sdk'

export const SOURCE_CHAIN = ChainKeys.SOLANA_MAINNET

// Destinations are the EVM networks SODAX supports: one address format to validate, and no
// destination-side setup (Stellar trustlines, NEAR storage) to handle in a starter.
export type DestinationChain = (typeof EVM_SPOKE_ONLY_CHAIN_KEYS)[number]

export function chainName(chain: DestinationChain | typeof SOURCE_CHAIN): string {
  return baseChainInfo[chain].name
}

export function sourceTokens(sodax: Sodax): readonly XToken[] {
  return sodax.swaps.getSupportedSwapTokensByChainId(SOURCE_CHAIN)
}

// Only networks that currently have swap tokens, so the form never offers an empty list.
export function destinationChains(sodax: Sodax): DestinationChain[] {
  return EVM_SPOKE_ONLY_CHAIN_KEYS.filter((chain) => sodax.swaps.getSupportedSwapTokensByChainId(chain).length > 0)
}

export function destinationTokens(sodax: Sodax, chain: DestinationChain): readonly XToken[] {
  return sodax.swaps.getSupportedSwapTokensByChainId(chain)
}

export function isEvmAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim())
}

// "1.5" with 9 decimals -> 1500000000n. Returns undefined for anything that is not a positive amount
// with at most `decimals` fractional digits, so the form can disable the quote instead of throwing.
export function toAtomic(amount: string, decimals: number): bigint | undefined {
  const match = /^(\d*)(?:\.(\d*))?$/.exec(amount.trim())
  if (!match || (match[1] === '' && !match[2])) return undefined
  const whole = match[1] || '0'
  const fraction = match[2] ?? ''
  if (fraction.length > decimals) return undefined
  const value = BigInt(whole + fraction.padEnd(decimals, '0'))
  return value > 0n ? value : undefined
}

export function fromAtomic(value: bigint, decimals: number, maxFractionDigits = 6): string {
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const fraction = (value % base).toString().padStart(decimals, '0').slice(0, maxFractionDigits).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

// Minimum the user accepts after slippage, in basis points (100 = 1%).
export function minOutput(quotedAmount: bigint, slippageBps: number): bigint {
  return (quotedAmount * BigInt(10_000 - slippageBps)) / 10_000n
}

export function buildIntentParams(input: {
  srcToken: XToken
  dstToken: XToken
  dstChain: DestinationChain
  amount: bigint
  minOutputAmount: bigint
  deadline: bigint
  srcAddress: string
  dstAddress: string
}): CreateIntentParams {
  return {
    inputToken: input.srcToken.address,
    outputToken: input.dstToken.address,
    inputAmount: input.amount,
    minOutputAmount: input.minOutputAmount,
    deadline: input.deadline,
    allowPartialFill: false,
    srcChainKey: SOURCE_CHAIN,
    dstChainKey: input.dstChain,
    srcAddress: input.srcAddress,
    dstAddress: input.dstAddress.trim(),
    // Zero address: any solver may fill the intent.
    solver: '0x0000000000000000000000000000000000000000',
    data: '0x',
  }
}
