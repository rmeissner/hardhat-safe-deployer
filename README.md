# Hardhat Safe Deployer

## Usage
- Install hardhat plugin with `yarn add github://rmeissner/hardhat-safe-deployer`
- Import `import { setupSafeDeployer } from "hardhat-safe-deployer";` in your `hardhat.config.ts`
- Setup deployer by calling `setupSafeDeployer`. The methods expects the following parameter
  - an Ethers Wallet for an owner/ delegate of the deployer Safe
  - the address of the deployerSafe
  - the url of the Safe service that should be used

## Example config
```ts
import { setupSafeDeployer } from "hardhat-safe-deployer";

import dotenv from "dotenv";
// Load environment variables.
dotenv.config();
const { INFURA_KEY, MNEMONIC, MNEMONIC_PATH, ETHERSCAN_API_KEY, SAFE_SERVICE_URL, DEPLOYER_SAFE } = process.env;

setupSafeDeployer(
  Wallet.fromMnemonic(MNEMONIC!!, MNEMONIC_PATH),
  DEPLOYER_SAFE,
  SAFE_SERVICE_URL
)
```

An example project can be found at: https://github.com/rmeissner/hardhat-safe-deployer-example
