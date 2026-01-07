### Paidly: Building a frictionless payment app with Dynamic

![](https://cdn-images-1.medium.com/max/800/1*TXwqp0tVYrlRTrDzB01HAA.png)

Build for non crypto-native users. A simple idea that might even seem overflogged to those in the crypto industry but somehow we are still struggling to figure it out.

Take for example a basic crypto payment. Instant settlement, programmable money, global reach but despite how powerful this may seem, its still awkward for new entrants in the space. Theres some lifting that needs to be done in order to receive a simple payment.

In a world of signIn with google or pay with apple pay, we still need users to

- Download a wallet
- “write down these 12 words”
- “Don’t lose them or your money is gone forever”
- “switch to the right network”
- “whats your wallet address?”

**What if receiving crypto was like receiving a Venmo Link?**

That's what this project is all about. Paidly allows you to send stablecoins via a simple link.

just:

> send money => share a link => recipient claims

No prior wallet required to receive. The recipient creates one in seconds with just an email. No seed phrases, no 12 multi-step onboarding.

### Dynamic

Dynamic does a lot of the heavy lifting here. When someone opens a payment link, they don’t need to already have a wallet. We use Dynamic’s embedded wallet to create one on the fly. The wallet is tied to their mail(giving them the same auth and recovery experience they are already accustomed to). Click “Claim”, authenticate with email, money arrives. Thats it.

#### What we are building

A complete payment link flow:

_sender locks $50, gets link => escrow holds $50 => recipient claims $50 via link_

**The flow:**

1. Sender connects wallet, enters amount, locks funds in escrow

2. App generates a unique payment link

3. Sender shares link (text, email, carrier pigeon)

4. Recipient opens link, connects/creates wallet, claims funds

5. Done. Funds transferred. No coordination needed.

```
paidly/
├── contract/                   # Solidity smart contracts
│   ├── src/
│   │   ├── PaymentEscrow.sol     # Core escrow logic
│   │   └── MockERC20.sol         # Test stablecoin
│   └── script/
│       └── Deploy.s.sol          # Deployment script
│
└── frontend/                   # Next.js application
    └── app/
        ├── page.tsx              # Home - balance, mint tokens
        ├── send/page.tsx         # Create payment links
        ├── claim/[intentId]/     # Claim payments
        └── lib/
            ├── hooks.ts          # Reusable blockchain hooks
            ├── constants.ts      # ABIs and addresses
            └── store.ts          # URL encoding utilities
```

#### Prerequisites

- Familiarity with foundry and solidity
- familiarity with Nextjs and react
- Dynamic developer dashboard (we will cover this too)

#### Part one: Smart contracts

We are going to create two smart contracts. A payment escrow and a mock token.

**1.1. setup**

```bash
mkdir paidly
cd paidly
```

Create our directories for both contracts and frontend

```bash
mkdir contract
mkdir frontend
```

Initialize a basic project with forge

```bash
cd contract
forge init .
```

This creates a basic forge project. Next, we delete the default contract, script and test files, install open-zeppelin and then create two files in the src folder. `PaymentEscrow.sol` and `MockERC20.sol` respectively.

Installing open-zeppelin

```bash
forge install OpenZeppelin/openzeppelin-contracts --no-git
```

after running the command above, add this line to the `foundry.toml` file

```js
remappings = ["@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"];
```

**1.2 contracts**

**MockERC20.sol**

```javascript
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("CNGN", "CNGN") {
        _mint(msg.sender, 10_000_000 * 1e6);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
```

This is a basic token contract called CNGN . This will be our stablecoin of choice.

**PaymentEscrow.sol**

```js
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PaymentEscrow {
    IERC20 public immutable token;

    struct Intent {
        address sender;
        uint256 amount;
        bool claimed;
    }

    mapping(bytes32 => Intent) public intents;

    event IntentLocked(bytes32 indexed intentId, address indexed sender, uint256 amount);
    event IntentClaimed(bytes32 indexed intentId, address indexed recipient);
    event IntentRefunded(bytes32 indexed intentId);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function lock(bytes32 intentId, uint256 amount) external {
        require(intents[intentId].sender == address(0), "Intent exists");
        require(amount > 0, "Invalid amount");

        intents[intentId] = Intent({
            sender: msg.sender,
            amount: amount,
            claimed: false
        });

        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        emit IntentLocked(intentId, msg.sender, amount);
    }

    function claim(bytes32 intentId, address recipient) external {
        Intent storage intent = intents[intentId];
        require(intent.sender != address(0), "Invalid intent");
        require(!intent.claimed, "Already claimed");

        intent.claimed = true;

        require(
            token.transfer(recipient, intent.amount),
            "Transfer failed"
        );

        emit IntentClaimed(intentId, recipient);
    }

    function refund(bytes32 intentId) external {
        Intent memory intent = intents[intentId];
        require(intent.sender == msg.sender, "Not sender");
        require(!intent.claimed, "Already claimed");

        delete intents[intentId];

        require(
            token.transfer(msg.sender, intent.amount),
            "Transfer failed"
        );

        emit IntentRefunded(intentId);
    }
}
```

The escrow is also light, it has three functions that dictates how the funds sent to it will behave

**1.3 Script**

To deploy our contract, we will create a script in the Script folder called Deployer.s.sol

**Deployer.s.sol**

```js
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/PaymentEscrow.sol";


contract PaymentEscrowDeployment is Script {

    function run() external {

         uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MockERC20 token = new MockERC20();

        PaymentEscrow escrow = new PaymentEscrow(address(token));

        vm.stopBroadcast();

        console.log("MockERC20 deployed at:", address(token));
        console.log("PaymentEscrow deployed at:", address(escrow));
    }
}
```

**1.4 Environment variables.**

In your `.env` file (ensure this is also added to your `.gitignore` to prevent pushing your keys to github), create two variables

```js
RPC_URL = your - rpc - url;
PRIVATE_KEY = your - private - key;
```

**1.5 Deployment**

In your terminal, run the following commands to deploy the smart contracts

```bash
source .env
forge script script/deployer.s.sol --broadcast --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

#### Part two: Frontend

**2.1 setup**

In a fresh terminal, navigate to the frontend directory and run the command below

```bash
npx create-next-app@latest .
```

This creates the nextjs boilerplate. Next, we install the dependencies we will be using.

```bash
npm i viem @dynamic-labs/wagmi-connector wagmi @tanstack/react-query @dynamic-labs/sdk-react-core @dynamic-labs/ethereum
```

_if you encounter issues with peer dependency, use v4.52.2_

**2.2 Dynamic dashboard setup**

Go to [dynamic’s dashboard](https://app.dynamic.xyz/), and create a project. ensure the following are enabled

- email login
- embedded wallets
- under chains and network, select evm then base sepolia (you can use any chain of your choice)

**2.3 Environment Variable**

Create a `.env.local` file in the root of the frontend directory and add the environment id from the dashboard

```js
NEXT_PUBLIC_DYNAMIC_ENV_ID = env_xxxxxxxxx;
```

**2.4 App directory**

Now, in the `app` directory, create four folders: `providers`, `lib`, `send`, `claim` respectively

**2.4.1 Lib**

create four files: `config.ts`, `constants.ts`, `hooks.ts` and `store.ts` respectively.

**config.ts**

```javascript
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});
```

This creates our wagmi config and configures Base sepolia as our chain of choice.

**constants.ts**

```js
export const ESCROW_ADDRESS = your deployed address
export const USDC_ADDRESS = your deployed address

export const usdcAbi = []
export const escrowAbi= []
```

if you’d prefer to use mine, you can find it [here](https://gist.github.com/Ernesto-tha-great/a5a55397af1da8a22b9d1a5a32f4c467) .

**hooks.ts**

This is where onchain interaction happens. you can find the complete [code here](https://gist.github.com/Ernesto-tha-great/99759285bb79c83cdb566cf0a9569a71). we are using custom hooks to

- useTokenBalance: fetch the token balance of the conencted wallet

```js
const { balance, formatted, refetch } = useTokenBalance();
// balance: raw BigInt (e.g., 1000000000n)
// formatted: human-readable string (e.g., "1,000")
// refetch: call after transactions to update UI
```

- useTokenAllowance: check how much the escrow contract is allowed to spend by quering the allowance on the token contract.

```js
const { allowance, refetch } = useTokenAllowance();
// Used to determine if we need an approve() call before lock()
```

- useTransaction: wrap transaction execution with chain switchingand confirmation

```js
const { ensureChain, executeAndWait } = useTransaction();

await ensureChain(); // Switches to Base Sepolia if needed
await executeAndWait({ address, abi, functionName, args }); // Sends tx AND waits for receipt
```

**store.ts**

```js
export function encodeDescription(description: string): string {
  if (!description) return "";
  const base64 = btoa(description);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDescription(encoded: string): string {
  if (!encoded) return "";
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return atob(base64);
  } catch {
    return "";
  }
}

export function buildClaimUrl(
  origin: string,
  intentId: string,
  description?: string
): string {
  const base = `${origin}/claim/${intentId}`;
  if (description) {
    return `${base}?m=${encodeDescription(description)}`;
  }
  return base;
}
```

Instead of using a database, we take a simpler approach: the payment data lives in the URL itself.

**How it works:**

- The `intentId` goes directly in the URL path (it's already on-chain)
- The optional `description` is base64-encoded as a query parameter (`?m=...`)
- When claiming, we read `sender`, `amount`, and `claimed` status directly from the smart contract

This eliminates the need for any backend storage. The link IS the data.

**2.4.2 Providers**

Create a `providers.tsx` file

```js
"use client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { ZeroDevSmartWalletConnectors } from "@dynamic-labs/ethereum-aa";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { wagmiConfig } from "../lib/config";

const queryClient = new QueryClient();
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
        walletConnectors: [
          EthereumWalletConnectors,
          ZeroDevSmartWalletConnectors,
        ],
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
```

**2.4.3 Layout.tsx**

```js
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paidly",
  description: "Pay with intent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode,
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers> {children} </Providers>
      </body>
    </html>
  );
}
```

**2.4.4 Homepage (app/page.tsx)**

This serves as our main home page. you can find the complete code for this component [here](https://gist.github.com/Ernesto-tha-great/40fe932fe646ebb6bc03083254c7da53).

```js
const { user, primaryWallet } = useDynamicContext();
const { refetch: refetchBalance, formatted: formattedBalance } =
  useTokenBalance();
const { ensureChain, executeAndWait } = useTransaction();
```

Above is an excerpt from the codebase. The user object and primary wallet is destructured from the dynamic context (remember our provider?). the use tokenbalance and use transaction are hooks we created in the hooks.ts file. they basically help us fetch user balance, ensure user is on the correct chain and execute token minting.

**2.4.5 Send**

In the send directory, create a page.tsx file and paste in [this code](https://gist.github.com/Ernesto-tha-great/925c6a8922e496543ce6d4441f1e87f3).

The layout is quite similar to the homepage and the function that does all the magic is the handlesend function

```js
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
```

This function creates an intent id, converts the amount to wei, ensures the network is correct and checks allowance (if we dont have enough allowance, it calls approve on the token contract).

Next it calls the escrow contract to lock the funds. Finally, it builds the claim URL using `buildClaimUrl()` which encodes the intentId in the path and the optional description as a query parameter.

**2.4.6 Claim**

In the claim directory, create a sub-directory called "[intentId]" and a page.tsx file within it. you can find the complete [code here](https://gist.github.com/Ernesto-tha-great/4f6323150e1009ff2185fb9c9aa781a9).

```js
const { intentId } = useParams();
const searchParams = useSearchParams();
const description = decodeDescription(searchParams.get("m") || "");

const { data: intentData, isLoading: fetchingIntent } = useReadContract({
  address: ESCROW_ADDRESS,
  abi: escrowAbi,
  functionName: "intents",
  args: intentId ? [intentId as `0x${string}`] : undefined,
});

const intent = intentData
  ? {
      sender: intentData[0] as string,
      amount: intentData[1] as bigint,
      isClaimed: intentData[2] as boolean,
    }
  : null;
```

Instead of fetching from an API, we read the payment data directly from the blockchain using `useReadContract`. The `intentId` comes from the URL path, and the optional description is decoded from the `?m=` query parameter. This approach eliminates the need for any backend storage.

#### **2.5 Putting it all together.**

Testing it out in the browser, your solution should be similar to mine below. you can also find the [complete project here](https://github.com/Ernesto-tha-great/paidly) to compare or simply clone .

This project is also [deployed on vercel](https://paidly-two.vercel.app/).

**Creating a payment Link**

![](https://cdn-images-1.medium.com/max/600/1*Mw2h2ajqXAhNJCF9YiSJhQ.png)

![](https://cdn-images-1.medium.com/max/600/1*y6vzM2U7PT8CX-1RRxaCrg.png)

**Claiming a payment Link**

copy the generated link and open up a new browser or tab and paste it in.

![](https://cdn-images-1.medium.com/max/400/1*jW9734iuR0oBDa0IykK1WA.png)

![](https://cdn-images-1.medium.com/max/400/1*AoIt6ki55n-yWuw2NkKPNA.png)

![](https://cdn-images-1.medium.com/max/400/1*NnnpcEu4c7T07wssYoLPpA.png)
