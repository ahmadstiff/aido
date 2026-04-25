# AIDO Backend

Backend service untuk:

- menerima DAO dan proposal dari indexer onchain,
- menjalankan analisis AI,
- menyimpan katalog DAO + proposal,
- dan mengeksekusi vote langsung ke governor di Monad testnet.

## Endpoints

- `GET /health`
- `GET /api/capabilities`
- `GET /api/preferences/aave-presets`
- `GET /api/daos`
- `GET /api/daos/:governorAddress`
- `GET /api/proposals`
- `GET /api/proposals/:proposalId`
- `POST /api/register-dao`
- `POST /api/analyze`
- `POST /api/trigger-analysis`
- `POST /api/onchain/vote`

## Run

```bash
npm install
npm run build
npm start
```

## AI Modes

- Jika `AI_GATEWAY_API_KEY` diisi, backend akan memakai Vercel AI Gateway melalui `https://ai-gateway.vercel.sh/v1`.
- Jika `OPENAI_API_KEY` diisi tanpa gateway, backend akan memakai provider OpenAI biasa.
- Jika `ANALYSIS_MODE=auto` dan request AI gagal, backend akan fallback ke `mock`.
- Jika `ANALYSIS_MODE=openai`, request AI yang gagal akan mengembalikan error supaya issue integrasi terlihat jelas.

Contoh cek status runtime:

```bash
curl -s http://localhost:3001/api/capabilities
```

## Example Requests

Registrasi DAO dari indexer:

```bash
curl -s -X POST http://localhost:3001/api/register-dao \
  -H 'Content-Type: application/json' \
  -H 'x-indexer-secret: change-me' \
  -d '{
    "governorAddress": "0xYourGovernor",
    "timelockAddress": "0xYourTimelock",
    "tokenAddress": "0xYourVotingToken",
    "creator": "0xYourCreator",
    "name": "My Monad DAO",
    "metadataUri": "ipfs://dao-metadata",
    "chainId": 10143
  }'
```

Analisis manual proposal:

```bash
curl -s -X POST http://localhost:3001/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Growth incentives for GHO",
    "proposalText": "Allocate 5M GHO from treasury to a six-month growth incentives program.",
    "preferencePresetId": "treasury-discipline"
  }'
```

Cast vote langsung ke governor onchain:

```bash
curl -s -X POST http://localhost:3001/api/onchain/vote \
  -H 'Content-Type: application/json' \
  -d '{
    "proposalId": "430",
    "support": "FOR"
  }'
```

## Onchain Contract Spec

Backend ini sengaja tidak menyimpan source contract Solidity final di repo.  
Spec contract yang harus dibuat agar backend kompatibel ada di:

- [aido-contract/README.md](/Users/danuste/Desktop/hackaton/monad/aido/aido-contract/README.md:1)

Fokus arsitektur sekarang:

- `AidoDaoFactory`
- `AidoDaoRegistry`
- `AidoGovernorTemplate`
- `AidoTimelockTemplate`

ABI referensi untuk vote langsung ke governor ada di:

- [src/abi/aidoGovernorAbi.ts](/Users/danuste/Desktop/hackaton/monad/aido/aido-backend/src/abi/aidoGovernorAbi.ts:1)

Selama governor final punya signature yang kompatibel dengan ABI itu, endpoint:

- `POST /api/onchain/vote`

bisa langsung dipakai untuk Monad testnet.

## Notes

- `POST /api/register-dao` dan `POST /api/trigger-analysis` bisa diamankan dengan `INDEXER_SHARED_SECRET`.
- `POST /api/analyze` dan `POST /api/trigger-analysis` mendukung `preferencePresetId`.
- `POST /api/onchain/vote` membutuhkan `AGENT_PRIVATE_KEY`.
- Source proposal sekarang diasumsikan `monad` native onchain.
