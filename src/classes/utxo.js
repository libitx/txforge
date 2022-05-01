import nimble from '@runonbitcoin/nimble'

const { Script, Transaction } = nimble.classes
const { isHex } = nimble.functions

/**
 * TODO
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
 * TODO
 */
export function toUTXO({ txid, script, ...params } = {}) {
  const vout = getOpt(params, ['vout', 'outputIndex'])
  const satoshis = getOpt(params, ['satoshis', 'amount'])
  
  if (isHex(script)) {
    script = Script.fromHex(script)
  }

  return new UTXO({ txid, vout, satoshis, script })
}

/**
 * TODO
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

function getOpt(obj = {}, keys = []) {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i], val = obj[key]
    if (typeof obj[keys[i]] !== 'undefined') {
      return val
    }
  }
}