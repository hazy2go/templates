'use client'

import { createSodaxQueryClient, SodaxProvider } from '@sodax/dapp-kit'
import { ChainKeys, type SodaxOptions } from '@sodax/sdk'
import { SodaxWalletProvider, type SodaxWalletConfig } from '@sodax/wallet-sdk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// The public endpoint is rate limited; set NEXT_PUBLIC_SOLANA_RPC_URL for anything beyond a demo.
const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

const sodaxConfig: SodaxOptions = {
  chains: { [ChainKeys.SOLANA_MAINNET]: { rpcUrl } },
}

const walletConfig: SodaxWalletConfig = {
  SOLANA: { chains: { [ChainKeys.SOLANA_MAINNET]: { rpcUrl } } },
}

const queryClient = createSodaxQueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SodaxProvider config={sodaxConfig}>
      <QueryClientProvider client={queryClient}>
        <SodaxWalletProvider config={walletConfig}>{children}</SodaxWalletProvider>
      </QueryClientProvider>
    </SodaxProvider>
  )
}
