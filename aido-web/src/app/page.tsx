"use client";

import { useConnection } from "wagmi";

export default function Home() {
  const {address} = useConnection();
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to AIDO
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
         {address ? `Your address: ${address}` : "Please connect your wallet to get started."}
        </p>
      </div>
    </div>
  );
}
