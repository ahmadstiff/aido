import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID ||
  "b56e18d47c72ab683b10814fe9495694"; // localhost testing only

export const monadTestnet = defineChain({
  id: 10143,
  caipNetworkId: "eip155:10143",
  chainNamespace: "eip155",
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MON",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
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

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [monadTestnet];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

export const metadata = {
  name: "AIDO",
  description: "AIDO - Monad dApp",
  url: "https://aido.app",
  icons: ["/icon.png"],
};
