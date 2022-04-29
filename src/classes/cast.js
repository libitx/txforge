import nimble from '@runonbitcoin/nimble'
import { forgeTx } from './forge.js'
import { ScriptBuilder, serializeScript } from './script-builder.js'
import { UTXO } from './utxo.js'

const { Transaction } = nimble.classes
const { verifyScript } = nimble.functions

export class Cast {
  constructor(mode, { params, opts, satoshis, utxo }) {
    this.mode     = mode
    this.params   = params
    this.opts     = opts
    this.satoshis = satoshis
    this.utxo     = utxo
    this.script   = new ScriptBuilder(this)
    this.init(params, opts)
  }

  /**
   * TODO
   */
  static lock(satoshis, params, opts = {}) {
    return new this('lock', { satoshis, params, opts })
  }

  /**
   * TODO
   */
  static unlock(utxo, params, opts = {}) {
    return new this('unlock', { utxo, params, opts })
  }

  /**
   * TODO
   */
  static simulate(lockParams = {}, unlockParams = {}) {
    const lockTx = forgeTx({
      outputs: [this.lock(1000, lockParams)],
      options: { debug: true }
    })

    const utxo = UTXO.fromTx(lockTx, 0)

    const tx = forgeTx({
      inputs: [this.unlock(utxo, unlockParams)]
    })

    verifyScript(
      tx.inputs[0].script,
      lockTx.outputs[0].script,
      tx,
      0,
      lockTx.outputs[0].satoshis,
    )

    return true
  }

  /**
   * TODO
   */
  init(params, opts) {}

  /**
   * TODO
   */
  lockingScript(script, params, opts) {}

  /**
   * TODO
   */
  unlockingScript(script, params, opts) {}

  /**
   * TODO
   */
  setCtx(tx, vin) {
    this.ctx = { tx, vin }
  }

  /**
   * TODO
   */
  toScript() {
    this.script = new ScriptBuilder(this)
    if (this.mode === 'lock') {
      this.lockingScript(this.params, this.opts)
    } else {
      this.unlockingScript(this.params, this.opts)
    }

    return serializeScript(this.script)
  }

  /**
   * TODO
   */
  toTxIn() {
    if (this.mode !== 'unlock') {
      throw new Error('Invalid mode. `toTxIn()` only available in `unlock` mode.')
    }

    const { txid, vout, txout } = this.utxo
    const script = this.toScript()
    const sequence = this.opts.sequence || 0xFFFFFFFF

    return new Transaction.Input(txid, vout, script, sequence, txout)
  }

  /**
   * TODO
   */
  toTxOut() {
    if (this.mode !== 'lock') {
      throw new Error('Invalid mode. `toTxOut()` only available in `lock` mode.')
    }

    const script = this.toScript()
    return new Transaction.Output(script, this.satoshis)
  }

}

export function isCast(cast) {
  return cast &&
    Object.getPrototypeOf(cast.constructor).name === 'Cast' &&
    (typeof cast.lockingScript === 'function' || typeof cast.unlockingScript === 'function')
}
