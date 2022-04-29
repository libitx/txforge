import nimble from '@runonbitcoin/nimble'

const { Script, Transaction } = nimble.classes
const { isHex } = nimble.functions

export class UTXO {
  constructor({ txid, vout, satoshis, script } = {}) {
    this.txid = txid
    this.vout = vout
    this.satoshis = satoshis
    this.script = script
  }

  static fromTx(tx, vout) {
    if (!tx || !tx.outputs[vout]) {
      throw new Error(`cannot create utxo from given tx and vout (${ vout })`)
    }

    return new this({
      txid: tx.hash,
      vout,
      satoshis: tx.outputs[vout].satoshis,
      script: tx.outputs[vout].script,
    })
  }

  get txout() {
    if (this.satoshis && this.script) {
      return new Transaction.Output(this.script, this.satoshis)
    }
  }
}

export function createUTXO({ txid, script, ...params } = {}) {
  // todo better plucking method
  const vout = params.vout //|| params.outputIndex
  const satoshis = params.satoshis //|| params.amount
  
  if (isHex(script)) {
    script = Script.fromHex(script)
  }

  return new UTXO({ txid, vout, satoshis, script })
}
