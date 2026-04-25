# AIDO Frontend Integration Docs

Dokumen ini dibuat agar tim frontend bisa langsung membangun UI AIDO yang benar, nyambung ke backend dan indexer yang sekarang aktif, dan tidak salah asumsi soal arsitektur.

## 1. Goal

Frontend AIDO harus menjadi dashboard governance untuk DAO native di Monad Testnet dengan flow berikut:

- user connect wallet ke Monad Testnet
- user melihat daftar DAO yang sudah terdaftar
- user melihat daftar proposal per DAO
- user membuka detail proposal
- user meminta AI untuk menganalisis proposal secara live
- user melihat rekomendasi vote, reasoning, risk score, dan alignment score
- user memicu vote onchain melalui backend agent

Catatan penting:

- sumber proposal sekarang adalah full onchain Monad, bukan Boardroom
- indexer membaca event factory dan governor lalu mengirim data ke backend
- frontend tidak perlu berbicara ke indexer secara langsung
- frontend sebaiknya memakai backend sebagai source of truth untuk daftar DAO, proposal, dan hasil AI

## 2. Current Live Architecture

Arsitektur saat ini:

- `aido-indexer` membaca event onchain di Monad Testnet
- `aido-indexer` mengirim DAO baru ke `POST /api/register-dao`
- `aido-indexer` mengirim proposal baru ke `POST /api/trigger-analysis`
- `aido-backend` menyimpan DAO dan proposal
- `aido-backend` menjalankan AI analysis via Vercel AI Gateway
- `aido-backend` dapat mengeksekusi `castVote` atau `castVoteWithReason` langsung ke governor
- `aido-web` harus membaca data dari backend dan hanya memakai wallet untuk user-side actions

## 3. Current Monad Testnet Deployment

Gunakan address ini sebagai referensi implementasi saat ini:

- Chain: Monad Testnet
- Chain ID: `10143`
- RPC: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadexplorer.com`

Core contracts:

- `AidoToken`: `0x32Dfb6F14949d4CdAf4f225D8ad9E02dEdC08545`
- `AidoDaoRegistry`: `0x134b005958e7505fECe7aC1AC11d0078C6A17246`
- `AidoDaoFactory`: `0xC37Ee98C30Dca390652a358eE435d21580172382`

Demo DAO:

- `Governor`: `0xd0b2617883e9d925bc581F95cF2d806b8155Dd0f`
- `Timelock`: `0x8Acb8aC5A12C2ceaE8Da17Df361E24a7fC3988cD`

Important frontend note:

- file [aido-web/src/lib/contracts.ts](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/lib/contracts.ts:1) masih berisi address lama
- frontend harus diupdate agar memakai address terbaru di atas
- untuk data proposal dan DAO, frontend tetap harus mengutamakan backend, bukan hardcoded contract reads

## 4. Frontend Responsibilities

Frontend sebaiknya mengerjakan hal-hal berikut:

- connect wallet ke Monad Testnet
- tampilkan status koneksi wallet dan jaringan
- tampilkan daftar DAO dari backend
- tampilkan proposal list per DAO dari backend
- tampilkan detail proposal dari backend
- tampilkan AI analysis result
- sediakan tombol `Refresh AI`
- sediakan tombol `Vote Onchain`
- tampilkan riwayat vote agent dan `txHash`
- tampilkan status fallback AI bila mode analysis masih `mock`
- tampilkan error yang jelas jika AI live gagal

Frontend tidak perlu:

- membaca event chain langsung untuk proposal feed
- menghitung sendiri hasil AI
- membangun state proposal dari log chain mentah

## 5. Required Frontend Stack

Repo frontend yang sudah ada sudah cocok untuk dipakai:

- Next.js App Router
- Reown AppKit
- Wagmi
- Viem
- React Query
- Tailwind CSS

Wallet/network config sudah ada di:

- [aido-web/src/config/index.tsx](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/config/index.tsx:1)

Yang perlu ditambahkan di frontend:

- API client untuk backend
- typed response models untuk DAO dan proposal
- React Query hooks
- halaman DAO dashboard dan proposal detail yang memakai backend
- action handler untuk `reanalyze` dan `vote`

## 6. Required Frontend Env

Frontend minimal butuh:

```bash
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Catatan:

- backend default listen di `http://localhost:3001`
- jika frontend berjalan di `http://localhost:3000`, backend saat ini sudah cocok dengan default `ALLOWED_ORIGINS=http://localhost:3000`
- jika frontend nanti pindah domain, `ALLOWED_ORIGINS` di backend harus ikut diupdate

## 7. Backend Endpoints For Frontend

Frontend cukup memakai endpoint berikut.

### `GET /health`

Tujuan:

- cek apakah backend hidup

Contoh response:

```json
{
  "ok": true,
  "service": "aido-backend",
  "analysisMode": "auto",
  "liveAiConfigured": true,
  "onchainConfigured": true
}
```

### `GET /api/capabilities`

Tujuan:

- cek model AI aktif
- cek apakah vote onchain siap
- ambil preset preference

Poin penting dari response saat ini:

- `ai.model` sekarang `google/gemini-2.0-flash-lite`
- `ai.fallbackMode` adalah `mock`
- `onchain.ready` harus `true` jika backend agent siap vote

### `GET /api/preferences/aave-presets`

Tujuan:

- ambil preset preferensi yang bisa dipakai UI filter/profile

Catatan:

- nama route masih memakai `aave-presets`, tetapi bisa dipakai sebagai preset generik UI saat ini

### `GET /api/daos`

Tujuan:

- ambil daftar DAO yang sudah diregister oleh indexer/backend

Contoh response shape:

```json
{
  "daos": [
    {
      "governorAddress": "0xd0b2617883e9d925bc581F95cF2d806b8155Dd0f",
      "timelockAddress": "0x8Acb8aC5A12C2ceaE8Da17Df361E24a7fC3988cD",
      "tokenAddress": "0x32Dfb6F14949d4CdAF4f225D8ad9E02dEdC08545",
      "creator": "0x42f484f4fad0093543A6EE211da829FF30e777EE",
      "name": "AIDO Demo DAO",
      "metadataUri": "ipfs://aido-demo-dao",
      "chainId": 10143,
      "source": "factory",
      "createdAt": "2026-04-25T09:20:08.904Z",
      "updatedAt": "2026-04-25T09:20:08.904Z"
    }
  ]
}
```

### `GET /api/daos/:governorAddress`

Tujuan:

- ambil detail satu DAO

Gunakan `governorAddress` sebagai route param.

### `GET /api/proposals`

Tujuan:

- ambil daftar proposal

Query yang direkomendasikan:

- `governorAddress`
- `limit`

Contoh:

```bash
GET /api/proposals?governorAddress=0xd0b2617883e9d925bc581F95cF2d806b8155Dd0f&limit=20
```

Aturan frontend:

- selalu filter proposal per DAO dengan `governorAddress`
- jangan fetch semua proposal lalu filter di client

### `GET /api/proposals/:proposalId`

Tujuan:

- ambil detail satu proposal

Penting:

- backend bisa menerima `proposalId` biasa atau `proposalKey`
- frontend sebaiknya memakai `proposalKey`, bukan `proposalId`
- alasan utamanya adalah `proposalId` bisa bentrok antar governor

Format `proposalKey`:

```text
{governorAddressLowercase}:{proposalId}
```

Contoh:

```text
0xd0b2617883e9d925bc581f95cf2d806b8155dd0f:43245944018826288398548221809429345225320582769597971086577082603438335050632
```

Catatan implementasi:

- karena `proposalKey` mengandung `:`, frontend harus memakai `encodeURIComponent(proposalKey)` saat membentuk URL

### `POST /api/proposals/:proposalId/reanalyze`

Tujuan:

- minta AI menganalisis ulang proposal yang sudah tersimpan
- ini adalah endpoint utama untuk tombol `Refresh AI`

Request body:

```json
{
  "requireLive": true
}
```

Optional fields:

- `preferencePresetId`
- `userRiskProfile`
- `ethicalFocus`
- `requireLive`

Aturan frontend:

- pada halaman detail proposal, tombol `Refresh AI` harus memakai `requireLive: true`
- jika backend mengembalikan error, tampilkan bahwa AI live sedang gagal dan jangan diam-diam menyembunyikan masalah

### `POST /api/analyze`

Tujuan:

- analisis manual untuk teks proposal yang belum datang dari indexer

Use case:

- admin/testing page
- draft proposal simulator

### `POST /api/onchain/vote`

Tujuan:

- meminta backend agent melakukan vote onchain

Request body minimal:

```json
{
  "proposalId": "0xd0b2617883e9d925bc581f95cf2d806b8155dd0f:43245944018826288398548221809429345225320582769597971086577082603438335050632",
  "support": "FOR"
}
```

Aturan penting:

- walau field bernama `proposalId`, frontend boleh mengirim `proposalKey`
- ini aman karena backend memang lookup berdasarkan key atau id
- lebih baik lagi kirim dua-duanya:

```json
{
  "proposalKey": "0xd0b2617883e9d925bc581f95cf2d806b8155dd0f:43245944018826288398548221809429345225320582769597971086577082603438335050632",
  "proposalId": "43245944018826288398548221809429345225320582769597971086577082603438335050632",
  "support": "FOR"
}
```

Behavior:

- backend agent memakai `AGENT_PRIVATE_KEY`
- backend akan cek `hasVoted`
- backend akan mengirim `castVoteWithReason` bila ada reason
- response proposal akan berisi `onchainVotes[]`

## 8. Data Models The Frontend Should Expect

### `StoredDao`

Field penting:

- `governorAddress`
- `timelockAddress`
- `tokenAddress`
- `creator`
- `name`
- `metadataUri`
- `chainId`

### `StoredProposal`

Field penting:

- `proposalKey`
- `proposalId`
- `title`
- `description`
- `proposer`
- `startBlock`
- `endBlock`
- `blockNumber`
- `txHash`
- `contractAddress`
- `daoName`
- `currentState`
- `analysis`
- `onchainVotes`
- `updatedAt`

### `analysis`

Field penting:

- `summary`
- `recommendedVote`
- `reasoning`
- `riskScore`
- `alignmentScore`
- `mode`

Arti `analysis.mode`:

- `openai` berarti live AI provider berhasil dipakai
- `mock` berarti backend fallback ke heuristic local analysis

Catatan:

- walau sekarang modelnya Gemini Lite, label internal tetap `openai` karena backend hanya membedakan `mock` vs `live`

## 9. Recommended Frontend Pages

### `/`

Fungsi:

- landing dashboard
- wallet connection
- status backend
- daftar DAO

### `/daos/[governorAddress]`

Fungsi:

- detail DAO
- metadata DAO
- proposal list untuk DAO itu

### `/proposals/[proposalKey]`

Fungsi:

- proposal detail
- AI reasoning card
- `Refresh AI` button
- `Vote Onchain` button
- tx history

Catatan:

- route param internal Next.js boleh memakai encoded string
- decode saat membaca param

### `/profile`

Fungsi:

- user preference
- preferred preset
- risk profile
- ethical focus

### `/admin` atau `/playground`

Fungsi:

- testing manual `POST /api/analyze`
- debugging AI
- smoke test integration

## 10. Recommended React Query Hooks

Buat hook seperti ini:

- `useBackendHealth()`
- `useCapabilities()`
- `useDaos()`
- `useDao(governorAddress)`
- `useProposals(governorAddress, limit)`
- `useProposal(proposalKey)`
- `useReanalyzeProposal()`
- `useVoteOnchain()`
- `usePreferencePresets()`

Recommended query keys:

- `["health"]`
- `["capabilities"]`
- `["daos"]`
- `["dao", governorAddress]`
- `["proposals", governorAddress, limit]`
- `["proposal", proposalKey]`
- `["preferences"]`

## 11. Required UX Rules

- tampilkan badge `Live AI` bila `analysis.mode === "openai"`
- tampilkan badge `Fallback AI` atau `Mock` bila `analysis.mode === "mock"`
- tampilkan `recommendedVote` secara visual jelas
- tampilkan `riskScore` dan `alignmentScore`
- tampilkan `txHash` sebagai link explorer bila vote berhasil
- disable tombol vote saat request sedang jalan
- tangani error `Agent wallet has already voted on this proposal.`
- tangani error AI live dengan pesan yang jujur

## 12. Onchain UX Rules

Frontend harus menjelaskan dua mode aksi:

- `Connect Wallet`
  untuk identitas user, membaca state governance, dan aksi user-side di masa depan
- `Vote Onchain via Agent`
  untuk meminta backend agent mengirim transaksi vote

Jangan misleading:

- jangan tampilkan seolah vote dikirim langsung dari wallet user jika sebenarnya dikirim backend agent
- tampilkan bahwa vote ini dieksekusi oleh agent wallet backend

## 13. AI Integration Rules

Saat ini backend live AI memakai:

- provider: Vercel AI Gateway
- model: `google/gemini-2.0-flash-lite`

Aturan FE:

- list proposal boleh menampilkan analysis yang sudah tersimpan dari indexer
- detail proposal harus punya tombol `Refresh AI`
- `Refresh AI` harus memakai `requireLive: true`
- kalau live AI gagal, tampilkan error daripada menyamarkan fallback

## 14. Indexer Docs For Frontend Team

Frontend tidak memanggil indexer, tetapi perlu tahu behavior indexer supaya UI benar.

Indexer sekarang:

- source proposal: native Monad onchain
- mode yang tersedia: `single-governor` dan `factory`
- event yang dipakai:
  - `DaoCreated`
  - `ProposalCreated`
- webhook backend:
  - `POST /api/register-dao`
  - `POST /api/trigger-analysis`

Implikasi ke frontend:

- proposal baru tidak muncul lewat websocket langsung
- frontend harus polling backend atau revalidate berkala
- polling interval yang aman untuk dashboard adalah 15 sampai 30 detik

File referensi:

- [aido-indexer/README.md](/Users/danuste/Desktop/hackaton/monad/aido/aido-indexer/README.md:1)
- [aido-indexer/src/index.ts](/Users/danuste/Desktop/hackaton/monad/aido/aido-indexer/src/index.ts:1)

## 15. Features The Frontend Must Build

Checklist minimum agar FE dianggap siap:

- DAO list page
- DAO detail page
- proposal list page per DAO
- proposal detail page
- AI reasoning panel
- `Refresh AI` action
- `Vote Onchain` action
- tx success state with explorer link
- backend health indicator
- live AI status indicator
- empty state jika belum ada DAO/proposal
- error state jika backend/indexer belum siap

Checklist bagus untuk demo hackathon:

- filter proposal by state
- sort by newest
- show proposal age from `blockNumber` or `updatedAt`
- copy proposal key button
- copy tx hash button
- show whether analysis is `Live AI` or `Mock`

## 16. Known Implementation Gaps To Fix In Current Frontend Scaffold

Yang perlu dibenahi di `aido-web` saat mulai integrasi:

- update address lama di [aido-web/src/lib/contracts.ts](/Users/danuste/Desktop/hackaton/monad/aido/aido-web/src/lib/contracts.ts:1)
- tambahkan backend API client
- ubah halaman proposal agar memakai backend, bukan hanya contract reads
- gunakan `proposalKey` sebagai identifier utama untuk detail page
- encode route param proposal key dengan benar
- tambahkan explorer link untuk tx hash
- tambahkan health/capabilities bootstrap di app startup

## 17. Suggested Implementation Order

Urutan implementasi yang disarankan:

1. Tambahkan `NEXT_PUBLIC_BACKEND_URL`
2. Buat API client dan React Query hooks
3. Buat halaman DAO list dari `GET /api/daos`
4. Buat halaman proposal list dari `GET /api/proposals?governorAddress=...`
5. Buat halaman proposal detail dari `GET /api/proposals/:proposalKey`
6. Tambahkan `Refresh AI` dengan `POST /api/proposals/:proposalKey/reanalyze`
7. Tambahkan `Vote Onchain` dengan `POST /api/onchain/vote`
8. Rapikan loading, empty, dan error states

## 18. Local Run Order

Jalankan service dengan urutan ini:

```bash
cd aido-backend
npm run build
npm start
```

```bash
cd aido-indexer
npm run build
npm start
```

```bash
cd aido-web
bun dev
```

Lalu cek:

- frontend: `http://localhost:3000`
- backend: `http://localhost:3001/health`

## 19. Final Rule Of Thumb

Untuk frontend AIDO:

- backend adalah source of truth untuk DAO, proposal, AI result, dan vote result
- wallet dipakai untuk user identity dan future user-side governance actions
- indexer bekerja di belakang layar
- proposal identity utama adalah `proposalKey`, bukan `proposalId`
- halaman detail proposal harus selalu punya opsi `Refresh AI`

