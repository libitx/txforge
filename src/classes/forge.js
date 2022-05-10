import nimble from '@runonbitcoin/nimble'
import { isCast } from './cast.js'
import { P2PKH, Raw } from '../casts/index.js'

const { BufferWriter, Transaction } = nimble.classes
const { writeVarint } = nimble.functions

const defaults = {
  rates: { data: 50, standard: 50 },
  sort: false,
}

/**
 * Forge is an industrial strength transaction builder.
 * 
 * Use Casts to forge transactions of any shape and size, using any script
 * template imaginable.
 * 
 * @see createForge
 * @see forgeTx
 */
export class Forge {
  constructor({ inputs, outputs, change, locktime, options } = {}) {
    this.inputs = []
    this.outputs = []
    this.changeScript = null
    this.locktime = 0
    this.options = {
      ...defaults,
      ...options
    }

    if (inputs) this.addInput(inputs)
    if (outputs) this.addOutput(outputs)

    if (Array.isArray(change)) {
      this.changeTo(...change)
    } else if (typeof change === 'object') {
      this.changeTo(change)
    }

    if (Number.isInteger(locktime)) {
      this.locktime = locktime
    }
  }

  get inputSum() {
    return this.inputs.reduce((sum, i) => sum + i.utxo.satoshis || 0, 0)
  }

  get outputSum() {
    return this.outputs.reduce((sum, o) => sum + o.satoshis, 0)
  }

  /**
   * Adds the given unlocking Cast (or array of Casts) to the forge.
   * 
   * @param {Cast|Cast[]} cast Unlocking cast(s)
   * @returns {Forge}
   */
  addInput(cast) {
    if (Array.isArray(cast)) {
      cast.forEach(c => this.addInput(c))
      return this
    }

    if (isCast(cast) && cast.mode === 'unlock') {
      this.inputs.push(cast)
    } else {
      throw new Error('invalid input not added')
    }
    
    return this
  }

  /**
   * Adds the given locking Cast (or array of Casts) to the forge.
   * 
   * @param {Cast|Cast[]} cast Locking cast(s)
   * @returns {Forge}
   */
  addOutput(cast) {
    if (Array.isArray(cast)) {
      cast.forEach(c => this.addOutput(c))
      return this
    }

    if (isCast(cast) && cast.mode === 'lock') {
      this.outputs.push(cast)
    } else {
      throw new Error('invalid output not added')
    }
    
    return this
  }

  /**
   * Sets the forge changeScript based on the given Cast class and params.
   * The first argument can be omitted if the params contains an `address` or
   * `script` property - in such cases the `P2PKH` or `Raw` Casts are used to
   * create the changeScript.
   * 
   * ## Examples
   * 
   * ```
   * // Sets a P2PK change script
   * forge.changeTo(P2PK, { pubkey })
   * 
   * // Will automatically use P2PKH
   * forge.changeTo({ address })
   * 
   * // Will automatically use Raw
   * forge.changeTo({ script })
   * ```
   * 
   * @param {class|object} classOrParams Cast class or lock parameters
   * @param {object?} params Lock parameters
   * @returns 
   */
  changeTo(classOrParams, params) {
    if (Object.getPrototypeOf(classOrParams).name === 'Cast') {
      this.changeScript = classOrParams.lock(0, params || {}).toScript()
    } else if (!!classOrParams.address) {
      this.changeScript = P2PKH.lock(0, classOrParams).toScript()
    } else if (!!classOrParams.script) {
      this.changeScript = Raw.lock(0, classOrParams).toScript()
    } else {
      throw new Error('invalid change params. must give cast class and lock params')
    }

    return this
  }

  /**
   * Calculates the fee required for miners to accept the transaction (according
   * to the configured rates).
   * 
   * @param {object?} rates Miner rates
   */
  calcRequiredFee(rates = this.options.rates) {
    const inScripts = this.inputs.map(i => i.toScript())
    const outScripts = this.outputs.map(o => o.toScript())

    // Initially consider all bytes standard
    const bytes = {
      standard: [
        8,
        varintSize(inScripts.length),
        varintSize(outScripts.length),
        inScripts.reduce((sum, script) => sum + inputSize(script), 0),
        outScripts.reduce((sum, script) => sum + outputSize(script), 0)
      ].reduce((sum, i) => sum + i, 0),
      data: 0
    }

    // Detect data outputs and adjust bytes
    outScripts
      .filter(s => /^006a/.test(s.toHex()))
      .forEach(s => {
        const len = outputSize(s)
        bytes.standard -= len
        bytes.data += len
      })

    // Calculate the fee for both standard and date bytes
    const fee = ['standard', 'data'].reduce((sum, type) => {
      const rate = Number.isInteger(rates) ? rates : rates[type]
      return sum + (bytes[type] * rate / 1000)
    }, 0)

    return Math.ceil(fee)
  }

  /**
   * Sorts the inputs and outputs according to 
   * {@link https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki BIP-69}.
   * 
   * BIP-69 defines deterministic lexographical indexing of transaction inputs
   * and outputs.
   * 
   * @returns {Forge}
   */
  sort() {
    this.inputs.sort((a, b) => {
      return a.utxo.txid.localeCompare(b.utxo.txid) || (a.utxo.vout - b.utxo.vout)
    })

    this.outputs.sort((a, b) => {
      return (a.satoshis - b.satoshis) || a.toScript().toHex().localeCompare(b.toScript().toHex())
    })

    return this
  }

  /**
   * Builds and returns a signed transaction.
   * 
   * @returns {nimble.Transaction}
   */
  toTx() {
    if (this.options.sort) {
      this.sort()
    }

    const tx = new Transaction()
    
    // First pass populate inputs with zero'd sigs
    this.inputs.forEach(cast => tx.input(cast.toInput()))
    this.outputs.forEach(cast => tx.output(cast.toOutput()))

    // If changeScript exists, calculate the change and add to tx
    if (this.changeScript) {
      const rates = this.options.rates
      const rate = Number.isInteger(rates) ? rates : rates.standard
      const fee = this.calcRequiredFee()
      const extraFee = Math.ceil(outputSize(this.changeScript) * rate / 1000)
      const change = (this.inputSum - this.outputSum) - (fee + extraFee)
      if (change > 0) {
        tx.output(new Transaction.Output(this.changeScript, change, tx))
      }
    }

    if (this.locktime > 0) {
      tx.locktime = this.locktime
    }

    // Second pass replaces signed inputs
    this.inputs.forEach((cast, vin) => {
      cast.setCtx(tx, vin)
      tx.inputs[vin].script = cast.toScript()
    })

    return tx
  }
}

/**
 * Creates and returns a forge instance from the given params.
 * 
 * ## Examples
 * 
 * ```
 * createForge({
 *   inputs: [
 *     P2PKH.unlock(utxo, { privkey })
 *   ],
 *   outputs: [
 *     P2PKH.lock(10000, { address })
 *   ],
 *   change: { address: changeAddress }
 * })
 * ```
 * 
 * @param {cast[]} params.inputs Array of unlocking casts
 * @param {cast[]} params.outputs Array of locking casts
 * @param {[class, object]|object?} params.change Change Cast class and lock parameters
 * @param {number?} params.locktime Transaction locktime integer
 * @param {object?} params.options.rates Miner fee quote
 * @param {boolean?} params.options.sort Automatically sort using BIP-69
 * @returns {Cast}
 */
export function createForge(params = {}) {
  return new Forge(params)
}

/**
 * As {@link createForge} but returns built and signed transaction.
 * 
 * ```
 * forgeTx({
 *   inputs: [
 *     P2PKH.unlock(utxo, { privkey })
 *   ],
 *   outputs: [
 *     P2PKH.lock(10000, { address })
 *   ],
 *   change: { address: changeAddress }
 * })
 * ```
 * 
 * @param {cast[]} params.inputs Array of unlocking casts
 * @param {cast[]} params.outputs Array of locking casts
 * @param {[class, object]|object?} params.change Change Cast class and lock parameters
 * @param {number?} params.locktime Transaction locktime integer
 * @param {object?} params.options.rates Miner fee quote
 * @param {boolean?} params.options.sort Automatically sort using BIP-69
 * @returns {nimble.Transaction}
 */
export function forgeTx(params = {}) {
  const forge = new Forge(params)
  return forge.toTx()
}

// Returns the byte size of a TxIn with the given script.
function inputSize(script) {
  const buf = new BufferWriter()
  writeVarint(buf, script.length)
  buf.write(script.buffer)
  return 36 + buf.length + 4
}

// Returns the byte size of a TxOut with the given script.
function outputSize(script) {
  const buf = new BufferWriter()
  writeVarint(buf, script.length)
  buf.write(script.buffer)
  return 8 + buf.length
}

// Returns the byte size of a VarInt of the given integer.
function varintSize(num) {
  const buf = new BufferWriter()
  writeVarint(buf, num)
  return buf.length
}
