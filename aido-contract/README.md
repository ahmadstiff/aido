# AIDO Contract Spec for Monad Testnet

Dokumen ini menjelaskan **contract yang perlu dibuat** agar AIDO bekerja penuh secara onchain di Monad testnet.

Target arsitekturnya sekarang bukan lagi mengambil proposal dari platform luar, tetapi:

1. user membuat DAO langsung di Monad testnet,
2. DAO tersebut emit event governance onchain,
3. indexer AIDO menangkap DAO dan proposal baru,
4. backend AIDO menganalisis proposal,
5. backend atau user wallet mengeksekusi vote langsung ke governor DAO.

Repo ini sengaja tidak menyimpan source Solidity final dulu. Yang disimpan di sini adalah blueprint agar implementasi contract tetap kompatibel dengan backend dan indexer.

## Contract Stack

Paket contract yang disarankan:

- `AidoDaoFactory`
- `AidoDaoRegistry`
- `AidoGovernorTemplate`
- `AidoTimelockTemplate`

Kalau ingin implementasi yang simpel untuk hackathon, `Factory` boleh langsung mendeploy contract baru.  
Kalau ingin lebih hemat gas dan rapi, `Factory` bisa memakai clone pattern untuk governor dan timelock.

## Goal

Dengan stack ini, AIDO bisa mendukung dua hal sekaligus:

1. user membuat DAO baru tanpa deploy manual,
2. backend AIDO bisa melakukan AI-assisted governance pada DAO yang benar-benar native di Monad testnet.

Jadi yang benar-benar onchain di Monad adalah:

- pembuatan DAO,
- proposal lifecycle,
- dan vote execution.

## Current Monad Testnet Deployment

Alamat deployment yang sudah tersedia saat ini:

Core contracts:

- `AidoToken`: `0x32Dfb6F14949d4CdAf4f225D8ad9E02dEdC08545`
- `AidoDaoRegistry`: `0x134b005958e7505fECe7aC1AC11d0078C6A17246`
- `AidoDaoFactory`: `0xC37Ee98C30Dca390652a358eE435d21580172382`

Demo DAO:

- `Governor`: `0xd0b2617883e9d925bc581F95cF2d806b8155Dd0f`
- `Timelock`: `0x8Acb8aC5A12C2ceaE8Da17Df361E24a7fC3988cD`

Seed target modules:

- `TreasuryModule`: `0x8c89795c67174c3B795B2fc9f68126A0638FBb75`
- `RiskModule`: `0xAc3b77F4592803ADEEB10B6DF94186A467601dc8`
- `GovernanceModule`: `0x2580c857E60966969b5d94c08F26B78aedB969B1`
- `OperationsModule`: `0xc2a0A6262fe19B9419C843a181bfEf39CA3b0148`
- `EmissionsModule`: `0x4797D2559F26d5908d037B5D28223F1934a42297`
- `GrowthModule`: `0xC869D41d096C2bAAf00011273ce3C5722a3c9286`
- `PartnershipsModule`: `0x4033f7aF5Cc67d1Bf7A83340C71B280845ee4339`

Catatan:

- Seed module di atas diasumsikan sudah dimiliki `Timelock`.
- Governor demo di atas adalah kandidat utama untuk pengujian indexer, backend AI, dan auto-vote.

## Recommended `AidoDaoFactory`

Factory bertugas membuat DAO baru dan mengumumkannya lewat event.

Fungsi minimal yang disarankan:

1. `createDao(name, token, votingDelay, votingPeriod, proposalThreshold, quorumNumerator, initialOwner, metadataURI)`
2. `setGovernorImplementation(address implementation)` jika memakai clone pattern
3. `setTimelockImplementation(address implementation)` jika memakai clone pattern
4. `setRegistry(address registry)`
5. `pauseFactory(bool status)`

Event minimal:

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

Struct input yang disarankan:

- `string name`
- `address token`
- `uint48 votingDelay`
- `uint32 votingPeriod`
- `uint256 proposalThreshold`
- `uint256 quorumNumerator`
- `address initialOwner`
- `string metadataURI`

Catatan implementasi penting:

- `token` sebaiknya kompatibel dengan `IVotes` atau pola `ERC20Votes`.
- `votingDelay` dan `votingPeriod` sebaiknya memakai satuan **block**, bukan detik, agar selaras dengan event governor yang mengeluarkan `startBlock` dan `endBlock`.
- factory sebaiknya memastikan ownership atau admin path setelah deployment tidak tertinggal di EOA deployer.

Interface minimal yang direkomendasikan:

```solidity
interface IAidoDaoFactory {
    event DaoCreated(
        address indexed creator,
        address indexed governor,
        address indexed timelock,
        address token,
        string name,
        string metadataURI
    );

    function createDao(
        string calldata name,
        address token,
        uint48 votingDelay,
        uint32 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumNumerator,
        address initialOwner,
        string calldata metadataURI
    ) external returns (address governor, address timelock);
}
```

Checklist implementasi:

- simpan address `registry`
- simpan implementation governor dan timelock jika memakai clone pattern
- validasi `token != address(0)`
- validasi `quorumNumerator > 0`
- validasi `votingPeriod > 0`
- deploy atau clone governor
- deploy atau clone timelock
- wire governor, timelock, dan token voting
- panggil `registerDao(...)` ke registry
- emit `DaoCreated(...)`

## Recommended `AidoDaoRegistry`

Registry menjadi katalog DAO yang sah agar frontend, backend, dan indexer tidak perlu menebak-nebak contract mana yang harus dianggap sebagai DAO AIDO.

Fungsi minimal:

1. `registerDao(governor, timelock, token, creator, name, metadataURI)`
2. `isRegisteredDao(governor) -> bool`
3. `getDao(governor)`
4. `listDaos(offset, limit)` opsional
5. `updateMetadata(governor, metadataURI)`

Struct minimal:

- `bool exists`
- `address governor`
- `address timelock`
- `address token`
- `address creator`
- `string name`
- `string metadataURI`
- `uint64 createdAt`

Event minimal:

```solidity
event DaoRegistered(
    address indexed governor,
    address indexed creator,
    address token,
    string name,
    string metadataURI
);
```

Interface minimal yang direkomendasikan:

```solidity
interface IAidoDaoRegistry {
    struct DaoInfo {
        bool exists;
        address governor;
        address timelock;
        address token;
        address creator;
        string name;
        string metadataURI;
        uint64 createdAt;
    }

    function registerDao(
        address governor,
        address timelock,
        address token,
        address creator,
        string calldata name,
        string calldata metadataURI
    ) external;

    function isRegisteredDao(address governor) external view returns (bool);
    function getDao(address governor) external view returns (DaoInfo memory);
}
```

Checklist implementasi:

- mapping `governor => DaoInfo`
- guard agar DAO yang sama tidak bisa diregister dua kali
- batasi `registerDao(...)` ke factory atau admin yang dipercaya
- expose getter yang murah dibaca backend/frontend
- simpan metadata minimum yang dibutuhkan indexer dan dashboard

## Recommended `AidoGovernorTemplate`

Governor template harus kompatibel dengan kebutuhan indexer dan backend.

Fungsi dan perilaku minimal yang disarankan:

1. emit `ProposalCreated`
2. support `castVote(uint256 proposalId, uint8 support)`
3. support `castVoteWithReason(uint256 proposalId, uint8 support, string reason)`
4. support `hasVoted(uint256 proposalId, address voter) -> bool`
5. expose voting lifecycle yang jelas
6. terhubung ke token voting yang kompatibel dengan snapshot/delegation

Event proposal yang diharapkan indexer:

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

Catatan kompatibilitas penting:

- **Repo AIDO saat ini mengasumsikan event `ProposalCreated` versi Governor Bravo-compatible** yang punya field `signatures`.
- Jika implementasi final memakai OpenZeppelin Governor murni tanpa `signatures`, maka ABI indexer di `aido-indexer/src/abi/governor.ts` dan tooling seed perlu diubah agar tetap cocok.
- Jadi opsi paling aman untuk implementasi contract saat ini adalah memakai governor yang mempertahankan shape event di atas, atau menyiapkan patch indexer bersamaan dengan implementasi contract.

Vote encoding yang disarankan:

- `0 = AGAINST`
- `1 = FOR`
- `2 = ABSTAIN`

ABI minimal yang diasumsikan backend untuk vote langsung ada di:

- [aido-backend/src/abi/aidoGovernorAbi.ts](/Users/danuste/Desktop/hackaton/monad/aido/aido-backend/src/abi/aidoGovernorAbi.ts:1)

Kalau governor final kompatibel dengan ABI itu, backend AIDO bisa langsung mengirim transaksi vote.

Interface minimal yang direkomendasikan:

```solidity
interface IAidoGovernorCompatible {
    function castVote(uint256 proposalId, uint8 support) external returns (uint256);
    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) external returns (uint256);
    function hasVoted(uint256 proposalId, address voter) external view returns (bool);
}
```

Checklist implementasi:

- implement event `ProposalCreated(...)` dengan shape yang kompatibel dengan repo ini
- implement `castVote(...)`
- implement `castVoteWithReason(...)`
- implement `hasVoted(...)`
- expose snapshot/delegation melalui token voting yang kompatibel
- pastikan proposal bisa dibuat oleh tokenholder sesuai threshold
- pastikan governor diarahkan ke timelock untuk execution

## Recommended Proposal Submission Compatibility

Agar seed proposal dan tooling demo lebih mudah, governor sebaiknya juga mendukung gaya proposal yang human-readable:

```solidity
function propose(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description
) external returns (uint256 proposalId);
```

Kenapa format ini direkomendasikan:

- mudah direpresentasikan di file JSON seed,
- cocok untuk demo hackathon,
- dan sinkron dengan event `ProposalCreated(...)` yang sekarang diasumsikan indexer.

Kalau kamu memilih governor style OpenZeppelin yang hanya memakai:

```solidity
function propose(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    string memory description
) external returns (uint256 proposalId);
```

itu tetap bisa dipakai, tetapi:

- seeder harus mengabaikan field `signatures`,
- dan ABI event/indexer mungkin perlu sedikit disesuaikan jika event final berbeda.

## Recommended Seed Target Modules

Supaya 30 proposal demo bisa benar-benar disubmit ke testnet tanpa perlu action contract yang terlalu kompleks, saya sarankan menyiapkan beberapa module contract generik:

- `TreasuryModule`
- `RiskModule`
- `GovernanceModule`
- `OperationsModule`
- `EmissionsModule`
- `GrowthModule`
- `PartnershipsModule`

Setiap module cukup punya setter generik seperti:

```solidity
interface IConfigModule {
    function setUint(bytes32 key, uint256 value) external;
    function setBool(bytes32 key, bool value) external;
    function setString(bytes32 key, string calldata value) external;
    function setAddress(bytes32 key, address value) external;
}
```

Dengan pola ini:

- proposal seed tetap realistis,
- calldata mudah di-encode,
- dan seluruh 30 proposal bisa dieksekusi tanpa perlu 30 method custom yang berbeda.

Catatan otorisasi penting:

- module seperti `TreasuryModule`, `RiskModule`, dan lainnya sebaiknya dimiliki oleh `Timelock` atau hanya menerima call dari `Timelock/Governor`.
- Kalau ownership module masih ada di deployer atau admin lain, proposal bisa berhasil dibuat tetapi gagal saat eksekusi.

## Recommended `AidoTimelockTemplate`

Timelock bertugas menjaga execution governance tetap aman dan tertunda sesuai parameter DAO.

Yang penting:

- governor menjadi proposer utama
- executor bisa diatur sesuai model DAO
- admin awal sebaiknya bisa dipindahkan atau dinolkan setelah bootstrap
- module target governance sebaiknya di-ownership-transfer ke timelock

Untuk hackathon, implementasi timelock standar ala OpenZeppelin sudah cukup cocok.

Checklist implementasi:

- governor menjadi proposer yang sah
- executor diset sesuai model DAO
- module target dipindahkan ownership-nya ke timelock
- admin bootstrap dicabut atau dipersempit setelah setup

## Recommended Flow

Flow end-to-end yang disarankan:

1. frontend memanggil `AidoDaoFactory.createDao(...)`
2. factory deploy governor + timelock
3. factory atau registry menyimpan metadata DAO
4. factory emit `DaoCreated`
5. indexer menangkap `DaoCreated`
6. indexer mendaftarkan DAO ke backend
7. indexer mulai mendengarkan `ProposalCreated` dari governor baru
8. backend menganalisis proposal
9. backend atau wallet user memanggil `castVote` atau `castVoteWithReason`

## Access Control

Direkomendasikan:

- `createDao(...)` boleh dipanggil user biasa
- `setGovernorImplementation(...)` hanya owner factory
- `setTimelockImplementation(...)` hanya owner factory
- `registerDao(...)` hanya factory atau admin terpercaya
- `updateMetadata(...)` hanya creator DAO, owner DAO, atau admin registry

## Minimal Safety Rules

Contract stack sebaiknya menolak kondisi berikut:

- token voting `address(0)`
- quorum `0`
- voting period terlalu pendek
- timelock invalid
- implementation address kosong saat clone pattern dipakai
- proposal vote di luar voting window
- vote kedua dari address yang sama

## How Indexer Uses These Contracts

Indexer AIDO sekarang diasumsikan bekerja penuh onchain:

1. mendengarkan `DaoCreated` dari `AidoDaoFactory`
2. menyimpan governor address hasil event itu
3. mendengarkan `ProposalCreated` dari setiap governor
4. mengirim metadata DAO ke backend
5. mengirim proposal baru ke backend untuk dianalisis

Indexer saat ini mengasumsikan event:

- `DaoCreated(...)`
- `ProposalCreated(...)`

Kalau contract final berbeda, ABI di indexer harus disesuaikan.

## How Backend Uses These Contracts

Backend AIDO sekarang memakai model **direct governor voting**, bukan mirror voting.

Artinya:

- proposal yang disimpan backend datang dari governor address asli,
- `contractAddress` proposal menunjuk ke governor DAO,
- route `POST /api/onchain/vote` akan memanggil governor itu langsung.

Endpoint backend yang relevan:

- `POST /api/register-dao`
- `POST /api/trigger-analysis`
- `POST /api/onchain/vote`

## Monad Testnet Deployment Checklist

Sebelum flow ini bisa dipakai penuh:

1. Deploy `AidoDaoRegistry`
2. Deploy governor implementation
3. Deploy timelock implementation
4. Deploy `AidoDaoFactory`
5. Hubungkan factory ke registry
6. Catat `DAO_FACTORY_ADDRESS`
7. Jalankan indexer mode `factory`
8. Jalankan backend
9. Isi `AGENT_PRIVATE_KEY` untuk auto-vote
10. Pastikan agent wallet punya MON untuk gas

Checklist berdasarkan deployment yang sudah ada:

- `AidoDaoRegistry` sudah tersedia di `0x134b005958e7505fECe7aC1AC11d0078C6A17246`
- `AidoDaoFactory` sudah tersedia di `0xC37Ee98C30Dca390652a358eE435d21580172382`
- demo governor aktif di `0xd0b2617883e9d925bc581F95cF2d806b8155Dd0f`
- demo timelock aktif di `0x8Acb8aC5A12C2ceaE8Da17Df361E24a7fC3988cD`
- seed module address sudah tersedia dan bisa dipakai untuk 30 proposal demo

## Backend and Indexer Env

Backend minimal:

```bash
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143
AGENT_PRIVATE_KEY=0xyour_agent_private_key
INDEXER_SHARED_SECRET=change-me
```

Indexer minimal:

```bash
INDEXER_MODE=factory
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143
DAO_FACTORY_ADDRESS=0xYourDaoFactory
FACTORY_START_BLOCK=123456
BACKEND_URL=http://localhost:3001
BACKEND_WEBHOOK_PATH=/api/trigger-analysis
BACKEND_DAO_WEBHOOK_PATH=/api/register-dao
INDEXER_SHARED_SECRET=change-me
```

## Proposal Seed Pack

Untuk mengisi DAO demo dengan proposal onchain yang cukup banyak, dokumen seed ada di:

- [SEEDING.md](/Users/danuste/Desktop/hackaton/monad/aido/aido-contract/SEEDING.md:1)
- [seeds/monad-testnet-30-proposals.json](/Users/danuste/Desktop/hackaton/monad/aido/aido-contract/seeds/monad-testnet-30-proposals.json:1)

Seed pack ini berisi 30 proposal governance demo yang mengikuti format governor-compatible dan cocok untuk:

- menguji indexer,
- menguji backend AI analysis,
- menguji dashboard proposal,
- dan mendemokan voting flow di Monad testnet.

## Recommended Frontend UX

Wizard “Create DAO” paling sederhana:

1. `DAO Name`
2. `Voting Token Address`
3. `Voting Delay`
4. `Voting Period`
5. `Proposal Threshold`
6. `Quorum`
7. `Metadata URI`

Setelah transaksi sukses:

- tampilkan `governor address`
- tampilkan `timelock address`
- tampilkan status “indexed by AIDO”
- arahkan user ke dashboard DAO tersebut

## Honest Demo Wording

Kalimat yang aman dan akurat:

- “Users create DAOs directly on Monad testnet through the AIDO factory.”
- “AIDO indexes DAO creation and proposal events directly from Monad.”
- “Votes are executed directly against the DAO governor on Monad testnet.”
