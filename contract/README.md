# Paidly Smart Contracts

Foundry-based smart contracts for the Paidly payment escrow system.

## Contracts

### PaymentEscrow.sol

Core escrow contract that holds locked payments until claimed.

**Functions:**

- `lock(intentId, amount)` - Lock tokens with unique intent ID
- `claim(intentId, recipient)` - Claim tokens to any address
- `refund(intentId)` - Sender refunds unclaimed payment

### MockERC20.sol

Test ERC20 token (CNGN) with public mint function for testing.

## Deployed Addresses (Base Sepolia)

| Contract      | Address                                      |
| ------------- | -------------------------------------------- |
| PaymentEscrow | `0x7f66b65b54267f837cf139054552e0ab3ce23e33` |
| MockERC20     | `0xa2ad4ca7752f93d823c6397f6e0a15ac51a63deb` |

## Setup

```bash
# Install dependencies
forge install

# Build
forge build

# Test
forge test

# Format
forge fmt
```

## Deploy

```bash
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --private-key $PRIVATE_KEY
```

## Verify on BaseScan

```bash
forge verify-contract $CONTRACT_ADDRESS src/PaymentEscrow.sol:PaymentEscrow \
  --chain base-sepolia \
  --etherscan-api-key $BASESCAN_API_KEY
```
