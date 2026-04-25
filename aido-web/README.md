# AIDO Web

`aido-web` adalah frontend Next.js untuk AIDO. Ia menangani wallet connection, dashboard governance, profile flow, proposal pages, dan DAO creation flow di Monad Testnet.

## Stack

- Next.js 16
- React 19
- Reown AppKit
- Wagmi
- Viem
- React Query
- Tailwind CSS 4

## Current Pages

Halaman yang sekarang sudah ada:

- `/`
  Dashboard overview
- `/profile`
  Claim token, delegate, dan setup AI agent
- `/proposals`
  Onchain proposal browsing
- `/proposals/[id]`
  Proposal detail dan manual voting
- `/proposals/create`
  Create proposal ke governor
- `/dao/create`
  Create DAO ke factory

## Current Frontend Behavior

Frontend yang sekarang sudah bisa:

- connect wallet ke Monad Testnet
- membaca token balance dan voting power
- membaca delegate dan user config dari registry
- membaca proposal langsung dari governor event logs
- membuat proposal baru ke governor
- membuat DAO baru via factory
- vote langsung dari wallet user pada halaman proposal detail

Catatan penting:

- versi frontend saat ini masih dominan `onchain-read-first`
- integrasi penuh ke backend AI belum dijadikan default di semua halaman
- blueprint migrasi ke backend-driven flow sudah tersedia di [fe-docs.md](/Users/danuste/Desktop/hackaton/monad/aido/fe-docs.md:1)

## Files To Know

- [src/config/index.tsx](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/config/index.tsx:1)
  konfigurasi Monad Testnet dan AppKit
- [src/lib/contracts.ts](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/lib/contracts.ts:1)
  address contract dan ABI frontend
- [src/app/page.tsx](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/app/page.tsx:1)
  dashboard utama
- [src/app/profile/page.tsx](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/app/profile/page.tsx:1)
  onboarding dan profile governance
- [src/app/proposals/page.tsx](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/app/proposals/page.tsx:1)
  proposal list
- [src/app/proposals/[id]/page.tsx](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/app/proposals/[id]/page.tsx:1)
  proposal detail
- [src/app/proposals/create/page.tsx](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/app/proposals/create/page.tsx:1)
  proposal creation
- [src/app/dao/create/page.tsx](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/app/dao/create/page.tsx:1)
  DAO creation

## Getting Started

Install dependency:

```bash
bun install
```

Atau:

```bash
npm install
```

Jalankan development server:

```bash
bun dev
```

Atau:

```bash
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`.

## Environment Variables

Minimal env yang dibutuhkan:

```bash
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Catatan:

- `NEXT_PUBLIC_PROJECT_ID` dipakai untuk Reown AppKit
- `NEXT_PUBLIC_BACKEND_URL` belum dipakai penuh di semua page, tapi harus dianggap env standar untuk arah integrasi selanjutnya

## Network

Frontend sekarang sudah dikonfigurasi untuk:

- Chain name: Monad Testnet
- Chain ID: `10143`
- RPC: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadexplorer.com`

Lihat detailnya di [src/config/index.tsx](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/config/index.tsx:1).

## Contract Addresses

Frontend memakai address yang saat ini tersimpan di [src/lib/contracts.ts](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/lib/contracts.ts:1).

Penting:

- anggap file itu sebagai source of truth untuk deployment yang dipakai frontend hasil push terakhir
- jika ingin menyamakan frontend dengan demo governor/backend/indexer lain, update file tersebut secara sengaja
- jangan mengandalkan README lama untuk address jika `contracts.ts` sudah berubah

## How Frontend Talks To Chain

Saat ini frontend memakai dua pola:

1. `useReadContract`
   untuk token balance, delegates, DAO metadata, voting settings, dan proposal state

2. `createPublicClient().getLogs(...)`
   untuk membaca `ProposalCreated` dari governor

3. `useWriteContract`
   untuk:
   - claim faucet
   - delegate
   - save config
   - create proposal
   - vote proposal
   - create DAO

## How Frontend Should Evolve

Arsitektur target tidak berhenti di direct chain reads. Supaya FE selaras dengan backend dan AI flow, migrasi yang disarankan adalah:

- daftar DAO dari backend
- daftar proposal dari backend
- proposal detail dari backend
- AI reasoning dari backend
- refresh AI dari backend
- vote onchain bisa tetap lewat backend agent atau wallet user, tergantung page/flow

Referensi implementasi lengkapnya ada di:

- [fe-docs.md](/Users/danuste/Desktop/hackaton/monad/aido/fe-docs.md:1)

## Recommended Frontend Work Next

Prioritas berikutnya untuk tim frontend:

1. tambahkan backend API client
2. tambahkan React Query hooks untuk DAO dan proposal
3. migrasikan halaman proposal list ke backend feed
4. migrasikan proposal detail ke backend feed + AI result
5. tambahkan tombol `Refresh AI`
6. tambahkan tombol `Vote Onchain via Agent`

## Known Limitations

- proposal list saat ini masih dibaca langsung dari governor logs
- proposal detail saat ini belum memakai AI analysis backend
- route proposal detail masih memakai `proposalId` onchain, belum `proposalKey`
- frontend dan backend bisa saja belum memakai deployment address yang sama jika ada push terpisah

## Related Docs

- [README.md](/Users/danuste/Desktop/hackaton/monad/aido/README.md:1)
- [fe-docs.md](/Users/danuste/Desktop/hackaton/monad/aido/fe-docs.md:1)
- [aido-backend/README.md](/Users/danuste/Desktop/hackaton/monad/aido/aido-backend/README.md:1)
- [aido-indexer/README.md](/Users/danuste/Desktop/hackaton/monad/aido/aido-indexer/README.md:1)
