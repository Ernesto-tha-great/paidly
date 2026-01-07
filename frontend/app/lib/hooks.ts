"use client";

import {
  useReadContract,
  useWriteContract,
  useSwitchChain,
  usePublicClient,
  useChainId,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { USDC_ADDRESS, ESCROW_ADDRESS, usdcAbi } from "./constants";

export function useTokenBalance() {
  const { primaryWallet } = useDynamicContext();

  const { data: balance, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: primaryWallet?.address ? [primaryWallet.address] : undefined,
    query: { enabled: !!primaryWallet?.address },
  });

  return {
    balance: balance as bigint | undefined,
    refetch,
    formatted: formatBalance(balance as bigint | undefined),
  };
}

export function useTokenAllowance() {
  const { primaryWallet } = useDynamicContext();

  const { data: allowance, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "allowance",
    args: primaryWallet?.address
      ? [primaryWallet.address, ESCROW_ADDRESS]
      : undefined,
    query: { enabled: !!primaryWallet?.address },
  });

  return {
    allowance: allowance as bigint | undefined,
    refetch,
  };
}

export function useTransaction() {
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const ensureChain = async () => {
    if (chainId !== baseSepolia.id) {
      await switchChainAsync({ chainId: baseSepolia.id });
    }
  };

  const executeAndWait = async (
    config: Parameters<typeof writeContractAsync>[0]
  ) => {
    if (!publicClient) throw new Error("No public client");

    const hash = await writeContractAsync(config);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
  };

  return {
    ensureChain,
    executeAndWait,
    writeContractAsync,
    publicClient,
    isCorrectChain: chainId === baseSepolia.id,
  };
}

export function formatBalance(balance: bigint | undefined): string {
  if (!balance) return "0";
  return (Number(balance) / 1e6).toLocaleString();
}

export function formatAddress(address: string | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
