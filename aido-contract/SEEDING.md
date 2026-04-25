# Seeding 30 DAO Proposals on Monad Testnet

Dokumen ini menjelaskan cara memakai seed pack 30 proposal governance untuk DAO AIDO di Monad testnet.

File seed yang disediakan:

- [seeds/monad-testnet-30-proposals.json](/Users/danuste/Desktop/hackaton/monad/aido/aido-contract/seeds/monad-testnet-30-proposals.json:1)

## Goal

Seed pack ini dibuat supaya kamu bisa:

1. membuat 30 proposal demo onchain,
2. memicu event `ProposalCreated` yang bisa ditangkap indexer,
3. mengisi backend AIDO dengan proposal yang cukup banyak untuk pengujian AI,
4. dan mendemokan flow governance end-to-end di Monad testnet.

## Assumptions

Seed ini mengasumsikan:

1. DAO sudah dibuat lewat `AidoDaoFactory` atau governor address sudah tersedia.
2. Governor mendukung proposal style berikut:

```solidity
function propose(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description
) external returns (uint256 proposalId);
```

3. Target contract proposal adalah module config generik seperti:

```solidity
function setUint(bytes32 key, uint256 value) external;
function setBool(bytes32 key, bool value) external;
function setString(bytes32 key, string calldata value) external;
function setAddress(bytes32 key, address value) external;
```

Kalau governor final kamu memakai gaya OpenZeppelin `propose(targets, values, calldatas, description)`, file seed ini tetap bisa dipakai.  
Seeder tinggal:

- ignore field `signatures`,
- encode calldata dari `arguments`,
- lalu kirim ke function `propose` versi OpenZeppelin.

## Required Addresses

Sebelum seed dijalankan, sediakan address berikut:

- `DAO_GOVERNOR_ADDRESS`
- `TREASURY_MODULE_ADDRESS`
- `RISK_MODULE_ADDRESS`
- `GOVERNANCE_MODULE_ADDRESS`
- `OPERATIONS_MODULE_ADDRESS`
- `EMISSIONS_MODULE_ADDRESS`
- `GROWTH_MODULE_ADDRESS`
- `PARTNERSHIPS_MODULE_ADDRESS`

Semua placeholder target di file seed memakai format `$ENV_NAME`.

## Seed File Format

Setiap proposal punya field utama berikut:

- `proposalNumber`
- `seedKey`
- `title`
- `category`
- `description`
- `targets`
- `values`
- `signatures`
- `arguments`

Makna field execution:

- `targets[i]`
  Address target proposal ke-i, biasanya placeholder env seperti `$TREASURY_MODULE_ADDRESS`
- `values[i]`
  Nilai native token yang dikirim bersama action ke-i, default `0`
- `signatures[i]`
  Signature function yang dipakai action ke-i
- `arguments[i]`
  Daftar argumen typed untuk di-ABI encode menjadi `calldatas[i]`

Contoh satu action:

```json
{
  "targets": ["$TREASURY_MODULE_ADDRESS"],
  "values": ["0"],
  "signatures": ["setUint(bytes32,uint256)"],
  "arguments": [
    [
      { "type": "bytes32", "value": "MARKETING_BUDGET_Q2" },
      { "type": "uint256", "value": "25000000000000000000000" }
    ]
  ]
}
```

## How to Execute the Seed

Urutan yang direkomendasikan:

1. Deploy DAO stack ke Monad testnet.
2. Deploy module target yang dipakai proposal seed.
3. Isi semua env address target.
4. Load file JSON seed.
5. Untuk setiap proposal:
   - resolve placeholder `targets`
   - ABI encode `arguments[i]` menjadi `calldatas[i]`
   - kirim transaksi `propose(...)` ke governor
6. Tunggu event `ProposalCreated` untuk tiap proposal.
7. Jalankan indexer AIDO agar semua proposal masuk ke backend.

## Important Notes

- File seed tidak menyimpan `proposalId` karena `proposalId` dihitung oleh governor saat transaksi `propose(...)` berhasil.
- `description` sengaja dibuat cukup kaya supaya backend AI punya konteks yang cukup saat menganalisis proposal.
- Semua proposal di seed ini memakai action governance yang aman untuk demo, yaitu setter generik ke module config.
- Jika kamu ingin proposal demo tanpa efek bisnis nyata, module contract bisa dibuat hanya menyimpan config dan emit event.

## Suggested Verification

Sesudah seed selesai, cek tiga hal ini:

1. Governor memiliki 30 event `ProposalCreated`.
2. Indexer mengirim 30 payload proposal ke backend.
3. Backend `GET /api/proposals` menampilkan 30 proposal baru dari governor yang sama.

## Expected Outcome

Kalau seed ini dijalankan dengan benar:

- DAO demo punya 30 proposal onchain,
- indexer AIDO bisa mengindeks proposal tersebut,
- backend AIDO bisa menjalankan analisis AI di atas semuanya,
- dan frontend punya cukup data untuk demo governance yang terlihat hidup.
