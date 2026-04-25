import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  http,
  parseAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config();

const projectRoot = path.resolve(process.cwd(), "..");
const seedFile = path.join(
  projectRoot,
  "aido-contract",
  "seeds",
  "monad-testnet-30-proposals.json",
);
const addressProfileFile = path.join(
  projectRoot,
  "aido-contract",
  "seeds",
  "monad-testnet-demo-addresses.json",
);
const resultsFile = path.join(
  projectRoot,
  "aido-contract",
  "seeds",
  "monad-testnet-30-proposals-results.json",
);

const monadChain = defineChain({
  id: Number(process.env.MONAD_CHAIN_ID || 10143),
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

const governorAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "propose",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "signatures", type: "string[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "proposalId", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "propose",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "proposalId", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "proposalThreshold",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getVotes",
    inputs: [
      { name: "account", type: "address" },
      { name: "timepoint", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] ;

function getPrivateKey() {
  const raw =
    process.env.AGENT_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    process.env.SEEDER_PRIVATE_KEY;

  if (!raw) {
    throw new Error(
      "No private key found. Set AGENT_PRIVATE_KEY, PRIVATE_KEY, or SEEDER_PRIVATE_KEY before running the seeder.",
    );
  }

  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

function stringToBytes32(value) {
  const asBuffer = Buffer.alloc(32);
  const input = Buffer.from(value, "utf8");
  if (input.length > 32) {
    throw new Error(`bytes32 value is too long: ${value}`);
  }

  input.copy(asBuffer);
  return `0x${asBuffer.toString("hex")}`;
}

function resolveTarget(target, addressProfile) {
  if (!target.startsWith("$")) {
    return getAddress(target);
  }

  const envName = target.slice(1);
  const envValue = process.env[envName];
  if (envValue) {
    return getAddress(envValue);
  }

  const profileMap = {
    DAO_GOVERNOR_ADDRESS: addressProfile.demoDao.Governor,
    DAO_TIMELOCK_ADDRESS: addressProfile.demoDao.Timelock,
    AIDO_TOKEN_ADDRESS: addressProfile.core.AidoToken,
    AIDO_DAO_REGISTRY_ADDRESS: addressProfile.core.AidoDaoRegistry,
    AIDO_DAO_FACTORY_ADDRESS: addressProfile.core.AidoDaoFactory,
    TREASURY_MODULE_ADDRESS: addressProfile.seedTargetModules.TreasuryModule,
    RISK_MODULE_ADDRESS: addressProfile.seedTargetModules.RiskModule,
    GOVERNANCE_MODULE_ADDRESS: addressProfile.seedTargetModules.GovernanceModule,
    OPERATIONS_MODULE_ADDRESS: addressProfile.seedTargetModules.OperationsModule,
    EMISSIONS_MODULE_ADDRESS: addressProfile.seedTargetModules.EmissionsModule,
    GROWTH_MODULE_ADDRESS: addressProfile.seedTargetModules.GrowthModule,
    PARTNERSHIPS_MODULE_ADDRESS:
      addressProfile.seedTargetModules.PartnershipsModule,
  };

  const resolved = profileMap[envName];
  if (!resolved) {
    throw new Error(`Unable to resolve target placeholder ${target}`);
  }

  return getAddress(resolved);
}

function splitSignature(signature) {
  const openParen = signature.indexOf("(");
  const closeParen = signature.lastIndexOf(")");

  if (openParen === -1 || closeParen === -1 || closeParen < openParen) {
    throw new Error(`Invalid function signature: ${signature}`);
  }

  return {
    name: signature.slice(0, openParen),
    params: signature.slice(openParen + 1, closeParen),
  };
}

function encodeArgument(argument) {
  if (argument.type === "bytes32") {
    if (argument.encoding === "stringToBytes32") {
      return stringToBytes32(argument.value);
    }

    return argument.value;
  }

  if (argument.type.startsWith("uint") || argument.type.startsWith("int")) {
    return BigInt(argument.value);
  }

  if (argument.type === "address") {
    return getAddress(argument.value);
  }

  return argument.value;
}

function buildCallData(signature, argumentsList) {
  const { name, params } = splitSignature(signature);
  const encodedArguments = argumentsList.map(encodeArgument);

  const bravoCalldata = params
    ? encodeAbiParameters(parseAbiParameters(params), encodedArguments)
    : "0x";

  const fullCalldata = encodeFunctionData({
    abi: [
      {
        type: "function",
        stateMutability: "nonpayable",
        name,
        inputs: params
          ? params.split(",").map((type, index) => ({
              name: `arg${index}`,
              type: type.trim(),
            }))
          : [],
        outputs: [],
      },
    ],
    functionName: name,
    args: encodedArguments,
  });

  return {
    bravoCalldata,
    fullCalldata,
  };
}

function normalizeProposal(proposal, addressProfile) {
  const targets = proposal.targets.map((target) =>
    resolveTarget(target, addressProfile),
  );
  const values = proposal.values.map((value) => BigInt(value));
  const bravoCalldatas = [];
  const fullCalldatas = [];

  for (let index = 0; index < proposal.signatures.length; index += 1) {
    const encoded = buildCallData(
      proposal.signatures[index],
      proposal.arguments[index] ?? [],
    );
    bravoCalldatas.push(encoded.bravoCalldata);
    fullCalldatas.push(encoded.fullCalldata);
  }

  return {
    ...proposal,
    description: proposal.description.trim(),
    targets,
    values,
    bravoCalldatas,
    fullCalldatas,
  };
}

async function detectProposalMode(publicClient, governorAddress, accountAddress, sampleProposal) {
  try {
    await publicClient.simulateContract({
      address: governorAddress,
      abi: governorAbi,
      functionName: "propose",
      args: [
        sampleProposal.targets,
        sampleProposal.values,
        sampleProposal.signatures,
        sampleProposal.bravoCalldatas,
        sampleProposal.description,
      ],
      account: accountAddress,
    });

    return "bravo";
  } catch (error) {
    console.warn(
      "[seed] Governor Bravo-style propose simulation failed. Falling back to OZ-style propose.",
      error instanceof Error ? error.message : error,
    );
  }

  await publicClient.simulateContract({
    address: governorAddress,
    abi: governorAbi,
    functionName: "propose",
    args: [
      sampleProposal.targets,
      sampleProposal.values,
      sampleProposal.fullCalldatas,
      sampleProposal.description,
    ],
    account: accountAddress,
  });

  return "oz";
}

async function maybeLogVotingPower(publicClient, governorAddress, accountAddress) {
  try {
    const threshold = await publicClient.readContract({
      address: governorAddress,
      abi: governorAbi,
      functionName: "proposalThreshold",
    });
    const latestBlock = await publicClient.getBlockNumber();
    const votes = await publicClient.readContract({
      address: governorAddress,
      abi: governorAbi,
      functionName: "getVotes",
      args: [accountAddress, latestBlock > 0n ? latestBlock - 1n : 0n],
    });

    console.log(
      `[seed] proposer votes=${votes.toString()} proposalThreshold=${threshold.toString()}`,
    );
  } catch (error) {
    console.warn(
      "[seed] Unable to read proposal threshold or current votes.",
      error instanceof Error ? error.message : error,
    );
  }
}

async function main() {
  const privateKey = getPrivateKey();
  const seed = JSON.parse(await fs.readFile(seedFile, "utf8"));
  const addressProfile = JSON.parse(await fs.readFile(addressProfileFile, "utf8"));
  const governorAddress = getAddress(
    process.env.DAO_GOVERNOR_ADDRESS || addressProfile.demoDao.Governor,
  );

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: monadChain,
    transport: http(monadChain.rpcUrls.default.http[0]),
  });
  const walletClient = createWalletClient({
    account,
    chain: monadChain,
    transport: http(monadChain.rpcUrls.default.http[0]),
  });

  console.log(`[seed] governor=${governorAddress}`);
  console.log(`[seed] proposer=${account.address}`);
  console.log(`[seed] proposals=${seed.proposals.length}`);

  await maybeLogVotingPower(publicClient, governorAddress, account.address);

  const normalizedProposals = seed.proposals.map((proposal) =>
    normalizeProposal(proposal, addressProfile),
  );

  const proposalMode = await detectProposalMode(
    publicClient,
    governorAddress,
    account.address,
    normalizedProposals[0],
  );

  console.log(`[seed] detected proposal mode=${proposalMode}`);

  let existingResults = {
    governorAddress,
    proposer: account.address,
    proposalMode,
    results: [],
  };

  try {
    existingResults = JSON.parse(await fs.readFile(resultsFile, "utf8"));
  } catch {}

  const completed = new Set(
    (existingResults.results ?? []).map((result) => result.seedKey),
  );
  const results = [...(existingResults.results ?? [])];

  for (const proposal of normalizedProposals) {
    if (completed.has(proposal.seedKey)) {
      console.log(`[seed] skipping already recorded proposal ${proposal.seedKey}`);
      continue;
    }

    console.log(
      `[seed] submitting ${proposal.proposalNumber}/30 ${proposal.seedKey}`,
    );

    const hash =
      proposalMode === "bravo"
        ? await walletClient.writeContract({
            address: governorAddress,
            abi: governorAbi,
            functionName: "propose",
            args: [
              proposal.targets,
              proposal.values,
              proposal.signatures,
              proposal.bravoCalldatas,
              proposal.description,
            ],
          })
        : await walletClient.writeContract({
            address: governorAddress,
            abi: governorAbi,
            functionName: "propose",
            args: [
              proposal.targets,
              proposal.values,
              proposal.fullCalldatas,
              proposal.description,
            ],
          });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    results.push({
      proposalNumber: proposal.proposalNumber,
      seedKey: proposal.seedKey,
      title: proposal.title,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      status: receipt.status,
    });
    completed.add(proposal.seedKey);

    await fs.writeFile(
      resultsFile,
      JSON.stringify(
        {
          governorAddress,
          proposer: account.address,
          proposalMode,
          results,
        },
        null,
        2,
      ),
    );

    console.log(
      `[seed] mined ${proposal.seedKey} tx=${hash} block=${receipt.blockNumber.toString()}`,
    );
  }

  console.log(`[seed] wrote results to ${resultsFile}`);
}

main().catch((error) => {
  console.error("[seed] failed", error);
  process.exit(1);
});
