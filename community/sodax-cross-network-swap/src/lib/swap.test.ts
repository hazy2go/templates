import { Sodax } from '@sodax/sdk'
import { describe, expect, it } from 'vitest'
import {
  buildIntentParams,
  chainName,
  destinationChains,
  destinationTokens,
  fromAtomic,
  isEvmAddress,
  minOutput,
  SOURCE_CHAIN,
  sourceTokens,
  toAtomic,
} from './swap'

// The SDK's built-in config: no RPC, wallet or network access needed.
const sodax = new Sodax()

describe('SDK config the form depends on', () => {
  it('has Solana swap tokens, including SOL', () => {
    const tokens = sourceTokens(sodax)
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.some((t) => t.symbol === 'SOL')).toBe(true)
  })

  it('has EVM destinations with tokens and display names', () => {
    const chains = destinationChains(sodax)
    expect(chains.length).toBeGreaterThan(0)
    for (const chain of chains) {
      expect(destinationTokens(sodax, chain).length).toBeGreaterThan(0)
      expect(chainName(chain)).toBeTruthy()
    }
    expect(chainName(SOURCE_CHAIN)).toBeTruthy()
  })

  it('builds intent params that match the SDK types', () => {
    const [srcToken] = sourceTokens(sodax)
    const [dstChain] = destinationChains(sodax)
    const [dstToken] = destinationTokens(sodax, dstChain)
    const params = buildIntentParams({
      srcToken,
      dstToken,
      dstChain,
      amount: 1n,
      minOutputAmount: 1n,
      deadline: 1n,
      srcAddress: 'source-address',
      dstAddress: ' 0x000000000000000000000000000000000000dEaD ',
    })
    expect(params.srcChainKey).toBe(SOURCE_CHAIN)
    expect(params.dstChainKey).toBe(dstChain)
    expect(params.dstAddress).toBe('0x000000000000000000000000000000000000dEaD')
    expect(params.allowPartialFill).toBe(false)
  })
})

describe('amounts', () => {
  it('converts decimal input to atomic units', () => {
    expect(toAtomic('1.5', 9)).toBe(1_500_000_000n)
    expect(toAtomic('.25', 6)).toBe(250_000n)
    expect(toAtomic('3', 0)).toBe(3n)
  })

  it('rejects zero, empty, malformed and over-precise input', () => {
    for (const bad of ['', '.', '0', '0.000', 'abc', '1.2.3', '-1', '1.1234567']) {
      expect(toAtomic(bad, 6), bad).toBeUndefined()
    }
  })

  it('formats atomic units for display', () => {
    expect(fromAtomic(1_500_000_000n, 9)).toBe('1.5')
    expect(fromAtomic(1_000_000n, 6)).toBe('1')
    expect(fromAtomic(1_234_567_891n, 9, 4)).toBe('1.2345')
  })

  it('applies slippage in basis points', () => {
    expect(minOutput(10_000n, 100)).toBe(9_900n)
    expect(minOutput(10_000n, 0)).toBe(10_000n)
  })
})

describe('addresses', () => {
  it('accepts EVM addresses only', () => {
    expect(isEvmAddress('0x000000000000000000000000000000000000dEaD')).toBe(true)
    expect(isEvmAddress('0x123')).toBe(false)
    expect(isEvmAddress('So11111111111111111111111111111111111111112')).toBe(false)
  })
})
