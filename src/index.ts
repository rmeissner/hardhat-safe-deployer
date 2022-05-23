import "@nomiclabs/hardhat-ethers";
import { Wallet } from "@ethersproject/wallet"
import { extendEnvironment } from "hardhat/config"
import { SafeProviderAdapter } from "./adapter"

export const setupSafeDeployer = (signer: Wallet, safe: string, serivceUrl?: string) => {
    extendEnvironment((env) => {
        const { chainId } = env.network.config;
        if (!chainId) {
          throw new Error('The chainId was required in hardhat network config');
        }
        env.network.provider = new SafeProviderAdapter(
          env.network.provider,
          signer.connect(env.ethers.provider),
          safe,
          chainId, 
          serivceUrl
        )
    })
}