import { EthereumProvider, JsonRpcRequest, JsonRpcResponse, RequestArguments } from "hardhat/types";
import { utils, Contract } from "ethers";
import { buildSafeTransaction, EIP712_SAFE_TX_TYPE, SafeSignature, SafeTransaction, signHash } from "./execution"
import { Wallet } from "@ethersproject/wallet";
import axios from "axios"

export class SafeProviderAdapter implements EthereumProvider {

    submittedTxs = new Map<string, any>();

    createLibAddress = "0x8538FcBccba7f5303d2C679Fa5d7A629A8c9bf4A"
    createLibInterface = new utils.Interface(["function performCreate(uint256,bytes)"])
    safeInterface = new utils.Interface(["function nonce() view returns(uint256)"])
    safeContract: Contract
    safe: string
    serviceUrl: string
    signer: Wallet
    wrapped: any
    constructor(wrapped: any, signer: Wallet, safe: string, serviceUrl?: string) {
        this.wrapped = wrapped
        this.signer = signer
        this.safe = utils.getAddress(safe)
        this.serviceUrl = serviceUrl ?? "https://safe-transaction.rinkeby.gnosis.io"
        this.safeContract = new Contract(safe, this.safeInterface, this.signer)
    }

    async estimateSafeTx(safe: string, safeTx: SafeTransaction): Promise<any> {
        const url = `${this.serviceUrl}/api/v1/safes/${safe}/multisig-transactions/estimations/`
        const resp = await axios.post(url, safeTx)
        return resp.data
    }

    async getSafeTxDetails(safeTxHash: string): Promise<any> {
        const url = `${this.serviceUrl}/api/v1/multisig-transactions/${safeTxHash}`
        const resp = await axios.get(url)
        return resp.data
    }

    async proposeTx(safeTxHash: string, safeTx: SafeTransaction, signature: SafeSignature): Promise<String> {
        const url = `${this.serviceUrl}/api/v1/safes/${this.safe}/multisig-transactions/`
        const data = {
            ...safeTx,
            contractTransactionHash: safeTxHash,
            sender: signature.signer,
            signature: signature.data
        }
        const resp = await axios.post(url, data)
        return resp.data
    }

    sendAsync(payload: JsonRpcRequest, callback: (error: any, response: JsonRpcResponse) => void): void {
        return this.wrapped.sendAsync(payload, callback)
    }

    async request(args: RequestArguments): Promise<unknown> {
        if (args.method === 'eth_sendTransaction' && args.params && (args.params as any)[0].from?.toLowerCase() === this.safe.toLowerCase()) {
            const tx = (args.params as any)[0]
            let operation = 0
            if (!tx.to) {
                tx.to = this.createLibAddress
                tx.data = this.createLibInterface.encodeFunctionData("performCreate", [tx.value || 0, tx.data])
                tx.value = 0
                operation = 1
            }
            const nonce = (await this.safeContract.nonce()).toNumber()
            const safeTx = buildSafeTransaction({
                to: utils.getAddress(tx.to),
                data: tx.data,
                value: tx.value,
                safeTxGas: 0,
                operation,
                nonce
            })
            const estimation = await this.estimateSafeTx(this.safe, safeTx)
            safeTx.safeTxGas = estimation.safeTxGas
            const safeTxHash = utils._TypedDataEncoder.hash({ verifyingContract: this.safe }, EIP712_SAFE_TX_TYPE, safeTx)
            const signature = await signHash(this.signer, safeTxHash)
            await this.proposeTx(safeTxHash, safeTx, signature)
            this.submittedTxs.set(safeTxHash, {
                from: this.safe,
                hash: safeTxHash,
                gas: 0,
                gasPrice: '0x00',
                nonce: 0,
                input: tx.data,
                value: tx.value || 0,
                to: tx.to,
                blockHash: null,
                blockNumber: null,
                transactionIndex: null,
            })
            return safeTxHash
        }
        if (args.method === 'eth_getTransactionByHash') {
            let txHash = (args.params as any)[0]
            if (this.submittedTxs.has(txHash)) {
                return this.submittedTxs.get(txHash);
            }
        }
        if (args.method === 'eth_getTransactionReceipt') {
            let txHash = (args.params as any)[0]
            let safeTx
            try { safeTx = await this.getSafeTxDetails(txHash) } catch (e) { }
            if (safeTx?.transactionHash) {
                const resp = await this.wrapped.request({ method: 'eth_getTransactionReceipt', params: [safeTx.transactionHash] })
                if (!resp) return resp
                const success = resp.logs.find((log: any) => log.topics[0] === "0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e")
                resp.status = !!success ? "0x1" : "0x0"
                if (safeTx.to.toLowerCase() === this.createLibAddress.toLowerCase()) {
                    const creationLog = resp.logs.find((log: any) => log.topics[0] === "0x4db17dd5e4732fb6da34a148104a592783ca119a1e7bb8829eba6cbadef0b511")
                    resp.contractAddress = utils.getAddress("0x" + creationLog.data.slice(creationLog.data.length - 40))
                }
                return resp
            }
        }
        const result = await this.wrapped.request(args)
        if (args.method === 'eth_accounts') {
            result.push(this.safe)
        }
        return result
    }
    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this.wrapped.addListener(event, listener)
    }
    on(event: string | symbol, listener: (...args: any[]) => void): this {
        return this.wrapped.on(event, listener)
    }
    once(event: string | symbol, listener: (...args: any[]) => void): this {
        return this.wrapped.once(event, listener)
    }
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this.wrapped.removeListener(event, listener)
    }
    off(event: string | symbol, listener: (...args: any[]) => void): this {
        return this.wrapped.off(event, listener)
    }
    removeAllListeners(event?: string | symbol): this {
        return this.wrapped.removeAllListeners(event)
    }
    setMaxListeners(n: number): this {
        return this.wrapped.setMaxListeners(n)
    }
    getMaxListeners(): number {
        return this.wrapped.getMaxListeners()
    }
    listeners(event: string | symbol): Function[] {
        return this.wrapped.listeners(event)
    }
    rawListeners(event: string | symbol): Function[] {
        return this.wrapped.rawListeners(event)
    }
    emit(event: string | symbol, ...args: any[]): boolean {
        return this.wrapped.emit(event, ...args)
    }
    listenerCount(event: string | symbol): number {
        return this.wrapped.listenerCount(event)
    }
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this.wrapped.prependListener(event, listener)
    }
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this.wrapped.prependOnceListener(event, listener)
    }
    eventNames(): (string | symbol)[] {
        return this.wrapped.eventNames()
    }
    async send(method: string, params: any): Promise<any> {
        return await this.request({ method, params })
    }
}