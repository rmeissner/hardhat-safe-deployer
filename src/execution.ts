import { Wallet, utils, BigNumber } from "ethers"
import { AddressZero } from "@ethersproject/constants";

export const EIP712_SAFE_TX_TYPE = {
    // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
    SafeTx: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "data" },
        { type: "uint8", name: "operation" },
        { type: "uint256", name: "safeTxGas" },
        { type: "uint256", name: "baseGas" },
        { type: "uint256", name: "gasPrice" },
        { type: "address", name: "gasToken" },
        { type: "address", name: "refundReceiver" },
        { type: "uint256", name: "nonce" },
    ]
}

export interface MetaTransaction {
    to: string,
    value: string | number | BigNumber,
    data: string,
    operation: number,
}

export interface SafeTransaction extends MetaTransaction {
    safeTxGas: string | number,
    baseGas: string | number,
    gasPrice: string | number,
    gasToken: string,
    refundReceiver: string,
    nonce: string | number
}

export interface SafeSignature {
    signer: string,
    data: string
}

export const signHash = async (signer: Wallet, hash: string): Promise<SafeSignature> => {
    const typedDataHash = utils.arrayify(hash)
    return {
        signer: signer.address,
        data: (await signer.signMessage(typedDataHash)).replace(/1b$/, "1f").replace(/1c$/, "20")
    }
}

export const buildSafeTransaction = (template: {
    to: string, value?: BigNumber | number | string, data?: string, operation?: number, safeTxGas?: number | string,
    baseGas?: number | string, gasPrice?: number | string, gasToken?: string, refundReceiver?: string, nonce: number
}): SafeTransaction => {
    return {
        to: template.to,
        value: template.value || 0,
        data: template.data || "0x",
        operation: template.operation || 0,
        safeTxGas: template.safeTxGas || 0,
        baseGas: template.baseGas || 0,
        gasPrice: template.gasPrice || 0,
        gasToken: template.gasToken || AddressZero,
        refundReceiver: template.refundReceiver || AddressZero,
        nonce: template.nonce
    }
}