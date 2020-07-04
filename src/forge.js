import {
  Address,
  Bn,
  OpCode,
  Script,
  TxOut,
  VarInt,
  Tx
} from 'bsv'
import Cast from './cast'
import p2pkh from './casts/p2pkh'

// Constants
const DUST_LIMIT = 546

// Default miner rates
const minerRates = {
  data: 0.5,
  standard: 0.5
}

/**
 * TODO
 */
class Forge {
  /**
   * TODO
   * @param {Object} options
   * @constructor
   */
  constructor({inputs, outputs, changeAddress, options} = {}) {
    this.tx = new Tx()
    this.inputs = []
    this.outputs = []
    this.options = {
      debug: false,
      ...options
    }

    this.addInput(inputs)
    this.addOutput(outputs)

    if (changeAddress) {
      this.changeScript = Address.fromString(changeAddress).toTxOutScript()
    }

    debug.call(this, 'TxForge', {
      inputs: this.inputs,
      outputs: this.outputs
    })
  }

  /**
   * TODO
   * @param {*} castSchema 
   * @param {*} txid 
   * @param {*} vout 
   * @param {*} txOut 
   * @param {*} nSequence 
   */
  static cast(castSchema, input) {
    const txid = input.txid,
          vout = input.vout || input.outputIndex || input.txOutNum,
          script = Script.fromHex(input.script),
          satoshis = input.satoshis || input.amount,
          satoshisBn = Bn(satoshis),
          txOut = TxOut.fromProperties(satoshisBn, script)

    return new Cast(castSchema, txid, vout, txOut, input.nSequence)
  }

  /**
   * TODO
   */
  get changeAddress() {
    if (this.changeScript) {
      const pkh = this.changeScript.chunks[2]
      return Address.fromPubKeyHashBuf(pkh.buf).toString()
    } 
  }

  /**
   * TODO
   */
  set changeAddress(address) {
    this.changeScript = Address.fromString(address).toTxOutScript()
  }

  /**
   * TODO
   * @param {Object} input
   */
  addInput(input = []) {
    if (Array.isArray(input)) {
      return input.forEach(i => this.addInput(i))
    }

    if (input instanceof Cast) {
      this.inputs.push(input)
    } else {
      try {
        this.inputs.push(Forge.cast(p2pkh, input))
      } catch(e) {
        throw new Error('Input must be an instance of Cast')
      }
    }

    return this
  }

  /**
   * TODO
   * @param {Object} input
   * @returns {TxForge}
   */
  addOutput(output = []) {
    if (Array.isArray(output)) {
      return output.forEach(o => this.addOutput(o))
    }

    const satoshis = output.satoshis || output.amount || 0,
          satoshisBn = Bn(satoshis);
    
    let script
    if (output.script) {
      script = Script.fromHex(output.script)
    } else if (output.data) {
      script = dataToScript(output.data)
    } else if (output.to) {
      const addr = Address.fromString(output.to)
      script = new Script().fromPubKeyHash(addr.hashBuf)
    } else {
      throw new Error('Invalid TxOut params')
    }

    const txOut = TxOut.fromProperties(satoshisBn, script)
    this.outputs.push(txOut)
    return this
  }

  /**
   * TODO
   */
  inputSum() {
    return this.inputs.reduce((sum, cast) => {
      return sum + cast.txOut.valueBn.toNumber()
    }, 0)
  }

  /**
   * TODO
   */
  outputSum() {
    return this.outputs.reduce((sum, txOut) => {
      return sum + txOut.valueBn.toNumber()
    }, 0)
  }

  /**
   * TODO
   */
  build(buildParams) {
    // Create a new tx
    this.tx = new Tx()

    // Iterate over inputs and add template unlocking scripts
    this.inputs.forEach(cast => {
      const script = cast.toTemplate()
      this.tx.addTxIn(cast.txHashBuf, cast.txOutNum, script, this.nSequence)
    })

    // Iterate over outputs and add to tx
    this.outputs.forEach(txOut => {
      if (txOut.valueBn.lte(DUST_LIMIT) && !txOut.script.isOpReturn() && !txOut.script.isSafeDataOut()) {
        throw new Error('Cannot create output lesser than dust')
      }
      this.tx.addTxOut(txOut)
    })

    // Iterate over inputs again and attempt to build the unlocking script
    this.inputs.forEach((cast, vin) => {
      this.buildInput(vin, buildParams)
    })
    
    // If necessary, add the changeScript
    if (this.changeScript) {
      let change = this.inputSum() - this.outputSum() - this.estimateFee()
      
      // If no outputs we dont need to make adjustment for change
      // as it is already factored in to fee estimation
      if (this.outputs.length > 0) {
        // Size of change script * 0.5
        change -= 16
      }

      if (change > DUST_LIMIT) {
        this.tx.addTxOut(TxOut.fromProperties(Bn(change), this.changeScript))
      }
    }
    
    return this
  }

  /**
   * TODO
   * @param {Number} vin 
   * @param {Object} buildParams 
   */
  buildInput(vin, buildParams) {
    if (typeof buildParams === 'object' && Object.keys(buildParams).length > 0) {
      const script = this.inputs[vin].toScript(this, buildParams)
      this.tx.txIns[vin].setScript(script)
    }
  }

  /**
   * TODO
   */
  estimateFee(rates = minerRates) {
    const parts = [
      { standard: 4 }, // version
      { standard: 4 }, // locktime
      { standard: VarInt.fromNumber(this.inputs.length).buf.length },
      { standard: VarInt.fromNumber(this.outputs.length).buf.length },
    ]

    if (this.inputs.length > 0) {
      this.inputs.forEach(cast => {
        parts.push({ standard: cast.size() })
      })
    } else {
      // Assume single p2pkh script
      parts.push({ standard: 148 })
    }

    if (this.outputs.length > 0) {
      this.outputs.forEach(({ script, scriptVi }) => {
        const p = {}
        const type = script.chunks[0].opCodeNum === 0 && script.chunks[1].opCodeNum === 106 ? 'data' : 'standard';
        p[type] = 8 + scriptVi.buf.length + scriptVi.toNumber()
        parts.push(p)
      })
    } else if (this.changeScript) {
      // Assume single p2pkh output
      const change = TxOut.fromProperties(Bn(0), this.changeScript),
            changeSize = 8 + change.scriptVi.buf.length + change.scriptVi.toNumber()
      parts.push({ standard: changeSize })
    }

    const fee = parts.reduce((fee, p) => {
      return Object
        .keys(p)
        .reduce((acc, k) => {
          const bytes = p[k],
                rate = rates[k];
          return acc + (bytes * rate)
        }, fee)
    }, 0)
    return Math.ceil(fee)
  }
}


// Converts the given array of data chunks into a OP_RETURN output script
function dataToScript(data) {
  const script = new Script()
  script.writeOpCode(OpCode.OP_FALSE)
  script.writeOpCode(OpCode.OP_RETURN)
  data.forEach(item => {
    // Hex string
    if (typeof item === 'string' && /^0x/i.test(item)) {
      script.writeBuffer(Buffer.from(item.slice(2), 'hex'))
    // Opcode number
    } else if (typeof item === 'number' || item === null) {
      script.writeOpCode(Number.isInteger(item) ? item : 0)
    // Opcode
    } else if (typeof item === 'object' && item.hasOwnProperty('op')) {
      script.writeOpCode(item.op)
    // All else
    } else {
      script.writeBuffer(Buffer.from(item))
    }
  })
  return script
}

// Log the given arguments if debug mode enabled
function debug(...args) {
  if (this.options.debug) {
    console.log(...args)
  }
}

export default Forge