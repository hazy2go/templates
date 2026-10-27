'use client'

import dynamic from 'next/dynamic'

// Wallet connectors read `window`, so the app renders in the browser only.
const App = dynamic(
  async () => {
    const [{ Providers }, { SwapApp }] = await Promise.all([
      import('@/components/providers'),
      import('@/components/swap-app'),
    ])
    return function AppWithProviders() {
      return (
        <Providers>
          <SwapApp />
        </Providers>
      )
    }
  },
  { ssr: false },
)

export default function Page() {
  return <App />
}
