"use client";

import { useState } from "react";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import Link from "next/link";
import { USDC_ADDRESS, usdcAbi } from "./lib/constants";
import { useTokenBalance, useTransaction } from "./lib/hooks";

export default function Home() {
  const { user, primaryWallet } = useDynamicContext();
  const { refetch: refetchBalance, formatted: formattedBalance } =
    useTokenBalance();
  const { ensureChain, executeAndWait } = useTransaction();
  const [minting, setMinting] = useState(false);
  const [status, setStatus] = useState("");

  const handleMint = async () => {
    if (!primaryWallet) return;
    setMinting(true);

    try {
      setStatus("Switching to Base Sepolia...");
      await ensureChain();

      setStatus("Minting CNGN...");
      await executeAndWait({
        address: USDC_ADDRESS,
        abi: usdcAbi,
        functionName: "mint",
        args: [primaryWallet.address, BigInt(1000 * 1e6)],
      });

      refetchBalance();
      setStatus("");
    } catch (e: any) {
      console.error(e);
      setStatus("");
      alert(
        `Mint failed: ${
          e.message || "Make sure you have Base Sepolia ETH for gas"
        }`
      );
    }
    setMinting(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 right-0 p-6">
        <DynamicWidget />
      </header>

      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Paidly</h1>
            <p className="text-zinc-400">Send money with a link</p>
          </div>

          {user ? (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <p className="text-sm text-zinc-500 mb-1">Your CNGN Balance</p>
                <p className="text-3xl font-semibold">{formattedBalance}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleMint}
                  disabled={minting}
                  className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 rounded-xl font-medium transition-colors"
                >
                  {minting
                    ? status || "Processing..."
                    : "Mint 1,000 CNGN (Testnet)"}
                </button>

                <Link
                  href="/send"
                  className="block w-full py-3 px-4 bg-white text-black hover:bg-zinc-200 rounded-xl font-medium transition-colors"
                >
                  Send Money →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-500">
                Connect your wallet to get started
              </p>
              <div className="inline-block">
                <DynamicWidget />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
