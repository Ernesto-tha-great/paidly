"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useReadContract } from "wagmi";
import { escrowAbi, ESCROW_ADDRESS } from "../../lib/constants";
import { useTransaction, formatBalance, formatAddress } from "../../lib/hooks";
import { decodeDescription } from "../../lib/store";
import Link from "next/link";

export default function ClaimPage() {
  const { intentId } = useParams();
  const searchParams = useSearchParams();
  const { primaryWallet } = useDynamicContext();
  const { ensureChain, executeAndWait } = useTransaction();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [claimed, setClaimed] = useState(false);

  const description = decodeDescription(searchParams.get("m") || "");

  const { data: intentData, isLoading: fetchingIntent } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "intents",
    args: intentId ? [intentId as `0x${string}`] : undefined,
    query: { enabled: !!intentId },
  });

  const intent = intentData
    ? {
        sender: (intentData as any)[0] as string,
        amount: (intentData as any)[1] as bigint,
        isClaimed: (intentData as any)[2] as boolean,
      }
    : null;

  const isValid =
    intent && intent.sender !== "0x0000000000000000000000000000000000000000";

  const claim = async () => {
    if (!primaryWallet || !intentId) return;

    setLoading(true);

    try {
      setStatus("Switching to Base Sepolia...");
      await ensureChain();

      setStatus("Claiming payment...");
      await executeAndWait({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "claim",
        args: [intentId as `0x${string}`, primaryWallet.address],
      });

      setClaimed(true);
      setStatus("");
    } catch (e: any) {
      console.error(e);
      setStatus("");
      alert(`Claim failed: ${e.message || "Unknown error"}`);
    }

    setLoading(false);
  };

  if (fetchingIntent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-500">Invalid or expired payment link</p>
          <Link href="/" className="text-white underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 right-0 p-6">
        <DynamicWidget />
      </header>

      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="max-w-md w-full space-y-6">
          {claimed ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-900 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✓</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">Payment Claimed!</h1>
                <p className="text-zinc-400">
                  {formatBalance(intent.amount)} CNGN has been sent to your
                  wallet
                </p>
              </div>
              <Link
                href="/"
                className="inline-block py-3 px-6 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
              >
                Go to Home
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <p className="text-zinc-500 text-sm">Someone sent you</p>
                <h1 className="text-5xl font-bold">
                  {formatBalance(intent.amount)}
                </h1>
                <p className="text-zinc-400">CNGN</p>
              </div>

              {description && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-sm text-zinc-500 mb-1">Message</p>
                  <p className="text-zinc-300">{description}</p>
                </div>
              )}

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Status</span>
                  <span
                    className={
                      intent.isClaimed ? "text-zinc-400" : "text-yellow-500"
                    }
                  >
                    {intent.isClaimed ? "Claimed" : "Available"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Network</span>
                  <span className="text-zinc-300">Base Sepolia</span>
                </div>
              </div>

              {intent.isClaimed ? (
                <div className="text-center py-4 text-zinc-500">
                  This payment has already been claimed
                </div>
              ) : primaryWallet ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-600 text-center">
                    Claiming to: {formatAddress(primaryWallet.address)}
                  </p>
                  <button
                    onClick={claim}
                    disabled={loading}
                    className="w-full py-4 px-4 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
                  >
                    {loading ? status || "Processing..." : "Claim Payment"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-3">
                  <p className="text-zinc-500 text-sm">
                    Connect your wallet to claim
                  </p>
                  <DynamicWidget />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
