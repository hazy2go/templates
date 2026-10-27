# SODAX Cross-Network Swap

A Next.js app that swaps a Solana token into a token on an EVM network (Ethereum, Arbitrum, Base, BNB Chain and
others) with one Solana signature, using the [SODAX SDK](https://docs.sodax.com/solana).

The user signs one transaction on Solana that locks the input token and states what they want on the destination
network. Independent solvers compete to fill that intent, and the output arrives at the recipient address.

## Getting started

```shell
npx create-solana-dapp@latest -t gh:solana-foundation/templates/community/sodax-cross-network-swap
cd sodax-cross-network-swap
npm install
npm run dev
```

Open http://localhost:3000, connect a Solana wallet such as Phantom or Solflare, enter an amount, pick a destination
network and token, and paste the recipient address on that network.

Optionally copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SOLANA_RPC_URL`. The default public endpoint is rate
limited.

## What runs where

| File                           | Purpose                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| `src/lib/swap.ts`              | Token and network lists from the SDK config, amount math, intent parameters |
| `src/lib/swap.test.ts`         | Checks the above against the installed SDK version                          |
| `src/components/providers.tsx` | SDK, query client and Solana wallet providers                               |
| `src/components/swap-app.tsx`  | Wallet connection, quote, swap and status UI                                |

Quotes, swaps and status come from `@sodax/dapp-kit` hooks (`useQuote`, `useSwap`, `useStatus`). For the full API, see
the [SODAX docs](https://docs.sodax.com/solana) and the
[SDK source](https://github.com/gosodax/sodax-sdks/tree/main/packages).

## Safety

- This template runs on **mainnet with real funds**. Try it with a small amount first.
- Nothing is signed or sent until the user clicks **Swap** and approves the transaction in their own wallet. The app
  never holds keys.
- The recipient address is only checked for EVM address format. Funds sent to a wrong address cannot be recovered.
- Slippage is fixed at 1% and the intent expires after 5 minutes if no solver fills it (`SLIPPAGE_BPS` and
  `DEADLINE_SECONDS` in `swap-app.tsx`).

## Scripts

- `npm run dev` starts the development server.
- `npm run test` runs the unit tests.
- `npm run ci` type-checks, tests and builds. Run it after upgrading `@sodax/*` packages.
