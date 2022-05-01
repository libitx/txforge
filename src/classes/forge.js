import nimble from '@runonbitcoin/nimble'
import { isCast } from './cast.js'
import { P2PKH } from '../casts/index.js'

const { BufferWriter, Transaction } = nimble.classes
const { isBuffer, writeVarint } = nimble.functions

const defaults = {
  rates: { data: 50, standard: 50 },
  sort: false,
}

export class Forge {
  constructor({ inputs, outputs, changeTo, changeScript, locktime, options } = {}) {
    this.inputs = []
    this.outputs = []
    this.locktime = 0
    this.options = {
      ...defaults,
      ...options
    }

    if (inputs) this.addInput(inputs)
    if (outputs) this.addOutput(outputs)

    if (changeTo) {
      this.changeTo = changeTo
    } else if (changeScript && isBuffer(changeScript.buffer)) {
      this.changeScript = changeScript
    }

    if (Number.isInteger(locktime)) {
      this.locktime = locktime
    }
  }

  get changeTo() {
    if (this.changeScript && typeof this.changeScript.toAddress === 'function') {
      return this.changeScript.toAddress().toString()
    }
  }

  set changeTo(address) {
    const cast = P2PKH.lock(0, { address })
    this.changeScript = cast.toScript()
  }

  get inputSum() {
    return this.inputs.reduce((sum, i) => sum + i.utxo.satoshis || 0, 0)
  }

  get outputSum() {
    return this.outputs.reduce((sum, o) => sum + o.satoshis, 0)
  }

  /**
   * TODO
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
   * TODO
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
   * TODO
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
   * TODO
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
   * TODO
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

    // Second pass replaces signed inputs
    this.inputs.forEach((cast, vin) => {
      cast.setCtx(tx, vin)
      tx.inputs[vin].script = cast.toScript()
    })

    return tx
  }
}

/**
 * TODO
 */
export function forge(params = {}) {
  return new Forge(params)
}

/**
 * TODO
 */
export function forgeTx(params = {}) {
  const forge = new Forge(params)
  return forge.toTx()
}

// TODO
function inputSize(script) {
  const buf = new BufferWriter()
  writeVarint(buf, script.length)
  buf.write(script.buffer)
  return 36 + buf.length + 4
}

// TODO
function outputSize(script) {
  const buf = new BufferWriter()
  writeVarint(buf, script.length)
  buf.write(script.buffer)
  return 8 + buf.length
}

// TODO
function varintSize(num) {
  const buf = new BufferWriter()
  writeVarint(buf, num)
  return buf.length
}
