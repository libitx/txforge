import nimble from '@runonbitcoin/nimble'
import { forgeTx } from './forge.js'
import { Tape, toScript } from './tape.js'
import { getUTXO } from './utxo.js'
import { getOpt } from './shared.js'

const { Transaction } = nimble.classes
const { evalScript } = nimble.functions

/**
 * Casts are Bitcoin script templates.
 * 
 * A Bitcoin transaction consists of two sides: inputs and outputs.
 * 
 * An output contains a locking script which locks a number of satoshis to a
 * puzzle. Inputs contain an unlocking script which provides the solution to a
 * previous output's puzzle.
 * 
 * A class that extends from `Cast` defines both `lockingScript` and
 * `unlockingScript` functions, and so defines the puzzle coins are locked to
 * and the solution for unlocking and spending those coins again. Casts have a
 * simple API and it is trivial to add your own helpers and macros to create
 * more complex script templates.
 * 
 * ## Defining a Cast
 * 
 * The following example implements a simple hash puzzle where coins can be
 * locked to a secret and then unlocked with the same secret, without the secret
 * being revealed onchain.
 * 
 * ```
 * import { Cast } from 'txforge'
 * import nimble from '@runonbitcoin/nimble'
 * 
 * const { sha256, sha256d } = nimble.functions
 * 
 * class HashPuzzle extends Cast {
 *   lockingScript({ secret }) {
 *     this.script
 *       .push(opcodes.OP_SHA256)
 *       .push(sha256d(secret))
 *       .push(opcodes.OP_EQUAL)
 *   }
 * 
 *   unlockingScript({ secret }) {
 *     this.script.push(sha256(secret))
 *   }
 * }
 * ```
 * 
 * ## Using a Cast
 * 
 * The following example shows the locking and subsequent unlocking of a coin
 * in two separate transactions.
 * 
 * ```
 * import { forgeTx, getUtxo } from 'txforge'
 * 
 * const secret = 'my super sEcReT password!!!1'
 * 
 * const tx1 = forgeTx({
 *   inputs: [...],
 *   outputs: [
 *     HashPuzzle.lock(1000, { secret })
 *   ]
 * })
 * 
 * const utxo = getUtxo(tx1, 0)
 * 
 * const tx2 = forgeTx({
 *   inputs: [
 *     HashPuzzle.unlock(utxo, { secret })
 *   ],
 *   outputs: [...]
 * })
 * ```
 * 
 * ## Testing Casts
 * 
 * TxForge provides a built-in way of testing and simulating casts.
 * 
 * ```
 * const secret = 'my super sEcReT password!!!1'
 * 
 * // 1st arg is params given to `lockingScript`
 * // 2nd arg is params given to `unlockingScript`
 * HashPuzzle.simulate({ secret }, { secret })
 * ```
 */
export class Cast {
  constructor(mode, { params, opts, satoshis, utxo }) {
    this.mode     = mode
    this.params   = params
    this.opts     = opts
    this.satoshis = satoshis
    this.utxo     = utxo
    this.script   = new Tape(this)
    this.ctx      = null
    this.init(params, opts)
  }

  /**
   * Locks the specified number of satoshis using the given parameters.
   * 
   * @param {number} satoshis Number of satoshis to lock
   * @param {object} params Lock parameters
   * @param {object} opts Lock options
   * @returns {Cast}
   */
  static lock(satoshis, params, opts = {}) {
    return new this('lock', { satoshis, params, opts })
  }

  /**
   * Locks the specified utxo using the given parameters.
   * 
   * @param {UTXO} utxo Locked UTXO
   * @param {object} params Unlock parameters
   * @param {object} opts Unlock options
   * @returns {Cast}
   */
  static unlock(utxo, params, opts = {}) {
    return new this('unlock', { utxo, params, opts })
  }

  /**
   * Simulates the Cast using the given lock and unlock parameters. Returns a
   * `vm` object from nimble's `evalScript` function.
   * 
   * @param {object} params Lock parameters
   * @param {object} params Unlock parameters
   * @returns {object} evalScript vm object
   */
  static simulate(lockParams = {}, unlockParams = {}) {
    const lockTx = forgeTx({
      outputs: [this.lock(1000, lockParams)]
    })

    const utxo = getUTXO(lockTx, 0)

    const tx = forgeTx({
      inputs: [this.unlock(utxo, unlockParams)]
    })

    return evalScript(
      tx.inputs[0].script,
      lockTx.outputs[0].script,
      tx,
      0,
      lockTx.outputs[0].satoshis,
    )
  }

  /**
   * Casts may implement the `init()` hook. This is useful for setting defaults
   * and coercing and/or validating the received parameters.
   * 
   * @param {object} params Lock or unlock parameters
   * @param {object} opts Lock or unlock options
   * @returns {void}
   */
  init(params, opts) {}

  /**
   * The `lockingScript()` hook should be implemented to define the puzzle which
   * locks the coins.
   * 
   * Refer to the {@link Tape} api.
   * 
   * @param {object} params Lock or unlock parameters
   * @param {object} opts Lock or unlock options
   * @returns {void}
   */
  lockingScript(params, opts) {}

  /**
   * The `unlockingScript()` hook should be implemented to define the solution
   * to the puzzle under which coins are locked. 
   * 
   * Refer to the {@link Tape} api.
   * 
   * @param {object} params Lock or unlock parameters
   * @param {object} opts Lock or unlock options
   * @returns {void}
   */
  unlockingScript(params, opts) {}

  /**
   * Compiles and returns the script.
   * 
   * @returns {nimble.Script}
   */
  toScript() {
    this.script = new Tape(this)
    if (this.mode === 'lock') {
      this.lockingScript(this.params, this.opts)
    } else {
      this.unlockingScript(this.params, this.opts)
    }

    return toScript(this.script)
  }

  /**
   * Compiles the script and returns a transaction Input. Only available to
   * unlocking Casts.
   * 
   * @returns {nimble.Transaction.Input}
   */
  toInput() {
    if (this.mode !== 'unlock') {
      throw new Error('invalid mode. `toInput()` only available in `unlock` mode.')
    }

    const { txid, vout, output } = this.utxo
    const script = this.toScript()
    const sequence = getOpt(this.opts, ['sequence'], 0xFFFFFFFF)

    return new Transaction.Input(txid, vout, script, sequence, output)
  }

  /**
   * Compiles the script and returns a transaction Output. Only available to
   * locking Casts.
   * 
   * @returns {nimble.Transaction.Output}
   */
  toOutput() {
    if (this.mode !== 'lock') {
      throw new Error('invalid mode. `toOutput()` only available in `lock` mode.')
    }

    const script = this.toScript()
    return new Transaction.Output(script, this.satoshis)
  }

  /**
   * Sets the transaction context on the cast.
   * 
   * @param {nimble.Transaction} tx Current transaction
   * @param {number} vin Input index
   * @returns {void}
   */
   setCtx(tx, vin) {
    this.ctx = { tx, vin }
  }
}

/**
 * Checks if the given class extends from Cast.
 * 
 * @param {class} cast Cast class
 * @returns {boolean}
 */
export function isCast(cast) {
  return cast &&
    Object.getPrototypeOf(cast.constructor).name === 'Cast' &&
    (typeof cast.lockingScript === 'function' || typeof cast.unlockingScript === 'function')
}
