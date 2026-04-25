# AIDO Indexer

Indexer onchain untuk AIDO. Fokusnya sekarang adalah **DAO native di Monad testnet**, bukan proposal dari platform eksternal.

## Modes

- `single-governor`
  Cocok untuk satu DAO yang address governornya sudah diketahui.
- `factory`
  Cocok untuk arsitektur AIDO penuh. Indexer mendengarkan event `DaoCreated` dari `AidoDaoFactory`, lalu otomatis mulai mengindeks `ProposalCreated` dari setiap governor baru.

## Run

```bash
npm install
npm run build
npm start
```

## Required Input

Jika `INDEXER_MODE=single-governor`:

- `GOVERNOR_ADDRESS` wajib diisi.
- `GOVERNOR_START_BLOCK` opsional tapi disarankan.

Jika `INDEXER_MODE=factory`:

- `DAO_FACTORY_ADDRESS` wajib diisi.
- `FACTORY_START_BLOCK` disarankan supaya sync awal lebih efisien.
- `GOVERNOR_BOOTSTRAP_ADDRESSES` opsional jika kamu ingin mulai dari beberapa governor yang sudah ada sebelum event factory diaktifkan.

## Backend Integration

Indexer akan mengirim dua jenis webhook ke backend:

- proposal ke `POST /api/trigger-analysis`
- DAO baru ke `POST /api/register-dao`

Default-nya:

```bash
BACKEND_URL=http://localhost:3001
BACKEND_WEBHOOK_PATH=/api/trigger-analysis
BACKEND_DAO_WEBHOOK_PATH=/api/register-dao
```

## Contract Event Assumptions

Indexer mengasumsikan dua event utama:

Factory:

```solidity
event DaoCreated(
    address indexed creator,
    address indexed governor,
    address indexed timelock,
    address token,
    string name,
    string metadataURI
);
```

Governor:

```solidity
event ProposalCreated(
    uint256 proposalId,
    address proposer,
    address[] targets,
    uint256[] values,
    string[] signatures,
    bytes[] calldatas,
    uint256 startBlock,
    uint256 endBlock,
    string description
);
```

Kalau implementasi contract final berbeda, ABI di `src/abi/` perlu disesuaikan.

## Notes

- State lokal menyimpan block terakhir factory dan block terakhir per governor.
- Sumber proposal sekarang diasumsikan `monad` native onchain.
- Model ini cocok untuk flow “user membuat DAO sendiri lalu AIDO langsung mengindeks proposal DAO itu”.
