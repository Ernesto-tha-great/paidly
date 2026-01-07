"use client";

import { useState, useMemo } from "react";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { keccak256, toBytes } from "viem";
import Link from "next/link";
import {
  escrowAbi,
  ESCROW_ADDRESS,
  USDC_ADDRESS,
  usdcAbi,
} from "../lib/constants";
import {
  useTokenBalance,
  useTokenAllowance,
  useTransaction,
} from "../lib/hooks";
import { buildClaimUrl } from "../lib/store";

const MAX_DESCRIPTION_LENGTH = 100;

export default function SendPage() {
  const { primaryWallet } = useDynamicContext();
  const {
    balance,
    formatted: formattedBalance,
    refetch: refetchBalance,
  } = useTokenBalance();
  const { allowance, refetch: refetchAllowance } = useTokenAllowance();
  const { ensureChain, executeAndWait } = useTransaction();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const validation = useMemo(() => {
    if (!amount) return { valid: false, error: null };

    const num = parseFloat(amount);
    const max = balance ? Number(balance) / 1e6 : 0;

    const error = isNaN(num)
      ? "Enter a valid number"
      : num <= 0
      ? "Amount must be greater than 0"
      : num > max
      ? "Insufficient balance"
      : description.length > MAX_DESCRIPTION_LENGTH
      ? `Max ${MAX_DESCRIPTION_LENGTH} characters`
      : null;

    return { valid: !error, error };
  }, [amount, balance, description]);

  const handleSend = async () => {
    if (!primaryWallet || !validation.valid) return;

    setLoading(true);
    setGeneratedLink(null);

    const intentId = keccak256(
      toBytes(`${Date.now()}-${primaryWallet.address}`)
    );
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e6));

    try {
      setStatus("Switching to Base Sepolia...");
      await ensureChain();

      const currentAllowance = allowance || BigInt(0);
      if (currentAllowance < amountWei) {
        setStatus("Approving CNGN spend...");
        await executeAndWait({
          address: USDC_ADDRESS,
          abi: usdcAbi,
          functionName: "approve",
          args: [ESCROW_ADDRESS, amountWei],
        });
        refetchAllowance();
      }

      setStatus("Locking funds in escrow...");
      await executeAndWait({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "lock",
        args: [intentId, amountWei],
      });

      setGeneratedLink(
        buildClaimUrl(window.location.origin, intentId, description)
      );
      setAmount("");
      setDescription("");
      setStatus("");
      refetchBalance();
      refetchAllowance();
    } catch (e: any) {
      console.error(e);
      setStatus("");
      alert(`Transaction failed: ${e.message || "Unknown error"}`);
    }

    setLoading(false);
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-6">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          ← Back
        </Link>
        <DynamicWidget />
      </header>

      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Send Money</h1>
            <p className="text-zinc-400">
              Create a payment link anyone can claim
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-sm">Available Balance</span>
              <span className="font-semibold">{formattedBalance} CNGN</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Amount (CNGN)
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-zinc-400">
                  Description (optional)
                </label>
                <span
                  className={`text-xs ${
                    description.length > MAX_DESCRIPTION_LENGTH
                      ? "text-red-400"
                      : "text-zinc-600"
                  }`}
                >
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <input
                type="text"
                placeholder="What's this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={MAX_DESCRIPTION_LENGTH + 10}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
              />
            </div>

            {validation.error && (
              <p className="text-red-400 text-sm">{validation.error}</p>
            )}

            <button
              onClick={handleSend}
              disabled={loading || !validation.valid || !primaryWallet}
              className="w-full py-4 px-4 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
            >
              {loading ? status || "Processing..." : "Generate Payment Link"}
            </button>
          </div>

          {generatedLink && (
            <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-4 space-y-3">
              <p className="text-emerald-400 text-sm font-medium">
                Payment link created!
              </p>
              <div className="bg-black/50 rounded-lg p-3 text-sm break-all text-zinc-300">
                {generatedLink}
              </div>
              <button
                onClick={copyLink}
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors"
              >
                Copy Link
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
