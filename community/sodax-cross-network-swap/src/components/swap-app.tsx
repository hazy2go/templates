'use client'

import { useQuote, useSodaxContext, useStatus, useSwap } from '@sodax/dapp-kit'
import { SolverIntentStatusCode, type XToken } from '@sodax/sdk'
import { useWalletProvider, useXAccount, useXConnect, useXConnectors, useXDisconnect } from '@sodax/wallet-sdk-react'
import { useMemo, useState } from 'react'
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
  type DestinationChain,
} from '@/lib/swap'

const SLIPPAGE_BPS = 100 // 1%
const DEADLINE_SECONDS = 300n

function WalletBar() {
  const connectors = useXConnectors({ xChainType: 'SOLANA' })
  const { mutate: connect, isPending } = useXConnect()
  const disconnect = useXDisconnect()
  const { address } = useXAccount({ xChainType: 'SOLANA' })

  if (address) {
    return (
      <div className="row">
        <span className="muted">
          Solana: {address.slice(0, 4)}…{address.slice(-4)}
        </span>
        <button className="secondary" onClick={() => disconnect({ xChainType: 'SOLANA' })}>
          Disconnect
        </button>
      </div>
    )
  }

  const installed = connectors.filter((c) => c.isInstalled)
  if (installed.length === 0) {
    return <p className="muted">Install a Solana wallet (for example Phantom or Solflare) to continue.</p>
  }
  return (
    <div className="row">
      {installed.map((connector) => (
        <button key={connector.id} disabled={isPending} onClick={() => connect(connector)}>
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}

function TokenSelect(props: { tokens: readonly XToken[]; value: XToken | undefined; onChange: (t: XToken) => void }) {
  return (
    <select
      value={props.value?.address ?? ''}
      onChange={(e) => {
        const token = props.tokens.find((t) => t.address === e.target.value)
        if (token) props.onChange(token)
      }}
    >
      {props.tokens.map((t) => (
        <option key={t.address} value={t.address}>
          {t.symbol}
        </option>
      ))}
    </select>
  )
}

export function SwapApp() {
  const { sodax } = useSodaxContext()
  const srcTokens = useMemo(() => sourceTokens(sodax), [sodax])
  const chains = useMemo(() => destinationChains(sodax), [sodax])

  const [srcToken, setSrcToken] = useState<XToken | undefined>(
    srcTokens.find((t) => t.symbol === 'SOL') ?? srcTokens[0],
  )
  const [dstChain, setDstChain] = useState<DestinationChain | undefined>(chains[0])
  const dstTokens = useMemo(() => (dstChain ? destinationTokens(sodax, dstChain) : []), [sodax, dstChain])
  const [dstToken, setDstToken] = useState<XToken | undefined>(dstTokens[0])
  const [amountText, setAmountText] = useState('')
  const [recipient, setRecipient] = useState('')

  const walletProvider = useWalletProvider({ xChainId: SOURCE_CHAIN })
  const { address: srcAddress } = useXAccount({ xChainType: 'SOLANA' })
  const amount = srcToken ? toAtomic(amountText, srcToken.decimals) : undefined

  // Quotes refresh automatically while the inputs stay the same.
  const quote = useQuote({
    params: {
      payload:
        srcToken && dstToken && dstChain && amount
          ? {
              token_src: srcToken.address,
              token_dst: dstToken.address,
              token_src_blockchain_id: SOURCE_CHAIN,
              token_dst_blockchain_id: dstChain,
              amount,
              quote_type: 'exact_input',
            }
          : undefined,
    },
  })
  const quoted = quote.data?.ok ? quote.data.value.quoted_amount : undefined

  const { mutateAsyncSafe: swap, isPending: swapping } = useSwap()
  const [hubTxHash, setHubTxHash] = useState<`0x${string}` | undefined>()
  const [error, setError] = useState<string | undefined>()
  const status = useStatus({ params: { intentTxHash: hubTxHash } })
  const statusCode = status.data?.ok ? status.data.value.status : undefined

  const canSwap =
    !!walletProvider &&
    !!srcAddress &&
    !!srcToken &&
    !!dstToken &&
    !!dstChain &&
    !!amount &&
    !!quoted &&
    isEvmAddress(recipient)

  async function onSwap() {
    if (!canSwap || !walletProvider || !srcAddress || !srcToken || !dstToken || !dstChain || !amount || !quoted) return
    setError(undefined)
    setHubTxHash(undefined)
    const deadline = await sodax.swaps.getSwapDeadline(DEADLINE_SECONDS)
    if (!deadline.ok) {
      setError('Could not compute a swap deadline. Try again.')
      return
    }
    const params = buildIntentParams({
      srcToken,
      dstToken,
      dstChain,
      amount,
      minOutputAmount: minOutput(quoted, SLIPPAGE_BPS),
      deadline: deadline.value,
      srcAddress,
      dstAddress: recipient,
    })
    // Opens the wallet: nothing is signed or sent until the user approves there.
    const result = await swap({ params, walletProvider })
    if (!result.ok) {
      setError(result.error instanceof Error ? result.error.message : 'The swap could not be submitted.')
      return
    }
    setHubTxHash(result.value.intentDeliveryInfo.dstTxHash as `0x${string}`)
  }

  return (
    <main>
      <h1>Cross-network swap from Solana</h1>
      <p className="muted">
        Swap a Solana token into a token on an EVM network in one signature, using the{' '}
        <a href="https://docs.sodax.com/solana">SODAX SDK</a>. This runs on mainnet with real funds.
      </p>

      <WalletBar />

      <section className="card">
        <label>
          You pay (Solana)
          <div className="row">
            <input
              inputMode="decimal"
              placeholder="0.0"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
            />
            <TokenSelect tokens={srcTokens} value={srcToken} onChange={setSrcToken} />
          </div>
        </label>

        <label>
          Destination network
          <select
            value={dstChain ?? ''}
            onChange={(e) => {
              const chain = chains.find((c) => c === e.target.value)
              setDstChain(chain)
              setDstToken(chain ? destinationTokens(sodax, chain)[0] : undefined)
            }}
          >
            {chains.map((chain) => (
              <option key={chain} value={chain}>
                {chainName(chain)}
              </option>
            ))}
          </select>
        </label>

        <label>
          You receive
          <div className="row">
            <output>
              {quoted !== undefined && dstToken ? fromAtomic(quoted, dstToken.decimals) : quote.isFetching ? '…' : '-'}
            </output>
            <TokenSelect tokens={dstTokens} value={dstToken} onChange={setDstToken} />
          </div>
        </label>
        {quote.data && !quote.data.ok && <p className="error">No quote for this pair or amount right now.</p>}

        <label>
          Recipient address on {dstChain ? chainName(dstChain) : 'the destination network'}
          <input placeholder="0x…" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        </label>

        <button disabled={!canSwap || swapping} onClick={onSwap}>
          {swapping ? 'Confirm in your wallet…' : 'Swap'}
        </button>
        <p className="muted">Minimum received after 1% slippage. The swap expires after 5 minutes if not filled.</p>
      </section>

      {error && <p className="error">{error}</p>}
      {hubTxHash && (
        <section className="card">
          <p>
            {statusCode === SolverIntentStatusCode.SOLVED
              ? 'Filled on the destination network.'
              : statusCode === SolverIntentStatusCode.FAILED
                ? 'The swap was not filled. Search the intent tx on sodaxscan.com for details.'
                : 'Waiting for a solver to fill the swap…'}
          </p>
          <p className="muted mono">Intent tx: {hubTxHash}</p>
        </section>
      )}
    </main>
  )
}
