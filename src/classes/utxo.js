import nimble from '@runonbitcoin/nimble'
import { getOpt } from './shared.js'

const { Script, Transaction } = nimble.classes
const { isHex } = nimble.functions

/**
 * A UTXO is an Unspent Transaction Output.
 * 
 * Unlocking Casts spend UTXOs so it is usually required to prepare UTXO
 * instances using data from your UTXO database or api.
 * 
 * See {@link toUTXO}.
 */
export class UTXO {
  constructor({ txid, vout, satoshis, script } = {}) {
    this.txid = txid
    this.vout = vout
    this.satoshis = satoshis
    this.script = script
  }

  get output() {
    if (this.satoshis && this.script) {
      return new Transaction.Output(this.script, this.satoshis)
    }
  }
}

/**
 * Creates a UTXO from the given parameters.
 * 
 * Will intelligently handle parameters from most UTXO apis.
 * 
 * @param {string|nimble.Script} params.script Previous output script
 * @param {string?} params.txid Transaction ID
 * @param {string?} params.tx_hash Transaction ID
 * @param {number?} params.satoshis Previous output satoshis 
 * @param {number?} params.value Previous output satoshis
 * @param {number?} params.vout Previous output index
 * @param {number?} params.outputIndex Previous output index
 * @param {number?} params.tx_pos Previous output index
 * @returns {UTXO}
 */
export function toUTXO({ script, ...params } = {}) {
  const txid = getOpt(params, ['txid', 'tx_hash'])
  const vout = getOpt(params, ['vout', 'outputIndex', 'tx_pos'])
  const satoshis = getOpt(params, ['satoshis', 'value'])
  
  if (isHex(script)) {
    script = Script.fromHex(script)
  }

  return new UTXO({ txid, vout, satoshis, script })
}

/**
 * Get a UTXO from the given transaction and output index.
 * 
 * @param {nimble.Transaction} tx Transaction
 * @param {number} vout Transaction output index
 */
export function getUTXO(tx, vout) {
  if (!tx || !tx.outputs[vout]) {
    throw new Error(`cannot create utxo from given tx and vout (${ vout })`)
  }

  return new UTXO({
    txid: tx.hash,
    vout,
    satoshis: tx.outputs[vout].satoshis,
    script: tx.outputs[vout].script,
  })
}
