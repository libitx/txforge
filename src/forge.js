import { Buffer } from 'buffer'
import {
  Address,
  Bn,
  Script,
  TxOut,
  VarInt,
  Tx,
  OpCode
} from 'bsv'
import Cast from './cast'
import { P2PKH, OP_RETURN } from './casts'

// Default Forge options
const defaults = {
  debug: false,
  rates: {
    mine: {
      data: 0.5,
      standard: 0.5
    },
    relay: {
      data: 0.25,
      standard: 0.25
    }
  }
}

/**
 * Forge transaction builder class.
 */
class Forge {
  /**
   * Instantiates a new Forge instance.
   * 
   * The accepted params are:
   * 
   * * `inputs` - list of input objects or cast instances
   * * `outputs` - list of output objects or cast instances
   * * `changeTo` - address to send change to
   * * `changeScript` - bsv Script object to send change to
   * * `options` - set `rates` or `debug` options
   * 
   * @param {Object} params Tx parameters
   * @constructor
   */
  constructor({
    inputs,
    outputs,
    changeTo,
    changeScript,
    nLockTime,
    options
  } = {}) {
    this.tx = new Tx()
    this.inputs = []
    this.outputs = []
    this.nLockTime = nLockTime
    this.options = {
      ...defaults,
      ...options
    }

    this.addInput(inputs)
    this.addOutput(outputs)

    if (changeTo) {
      this.changeTo = changeTo
    } else if (changeScript) {
      this.changeScript = changeScript
    }

    debug.call(this, 'Forge:', {
      inputs: this.inputs,
      outputs: this.outputs
    })
  }

  /**
   * Returns the tx change address.
   * 
   * @type {String}
   */
  get changeTo() {
    if (this.changeScript) {
      const pkh = this.changeScript.chunks[2]
      return Address.fromPubKeyHashBuf(pkh.buf).toString()
    } 
  }

  /**
   * Sets the given address as the change address.
   * 
   * @type {String}
   */
  set changeTo(address) {
    this.changeScript = Address.fromString(address).toTxOutScript()
  }

  /**
   * Returns the tx nLockTime.
   * 
   * @type {Number}
   */
  get nLockTime() {
    return this.tx.nLockTime
  }

  /**
   * Sets the given nLockTime on the tx.
   * 
   * If nLockTime < 500000000 it specifies the block number after which the tx
   * can be included in a block. Otherwise it specifies UNIX timestamp after
   * which it can be included in a block.
   * 
   * @type {Number}
   */
  set nLockTime(lockTime) {
    this.tx.nLockTime = lockTime
  }

  /**
   * The sum of all inputs.
   * 
   * @type {Number}
   */
  get inputSum() {
    return this.inputs.reduce((sum, { txOut }) => {
      return sum + txOut.valueBn.toNumber()
    }, 0)
  }

  /**
   * The sum of all outputs.
   * 
   * @type {Number}
   */
  get outputSum() {
    return this.outputs.reduce((sum, { satoshis }) => {
      return sum + satoshis
    }, 0)
  }

  /**
   * Adds the given input to the tx.
   * 
   * The input should be a Cast instance, otherwise the given params will be
   * used to instantiate a P2PKH Cast.
   * 
   * @param {Cast | Object} input Input Cast or P2PKH UTXO params
   * @returns {Forge}
   */
  addInput(input = []) {
    if (Array.isArray(input)) {
      return input.forEach(i => this.addInput(i))
    }

    if (Object.getPrototypeOf(input.constructor).name === 'Cast') {
      this.inputs.push(input)
    } else {
      const cast = Cast.unlockingScript(P2PKH, input)
      this.inputs.push(cast)
    }

    return this
  }

  /**
   * Adds the given output params to the tx.
   * 
   * The params object should contain one of the following properties:
   * 
   * * `to` - Bitcoin address to create P2PKH output
   * * `script` - hex encoded output script
   * * `data` - array of chunks which will be automatically parsed into an OP_RETURN script
   * 
   * Unless the output is an OP_RETURN data output, the params must contain a
   * `satoshis` property reflecting the number of satoshis to send.
   * 
   * For advanced use, Cast instances can be given as outputs. This allows
   * sending to non-standard and custom scripts.
   * 
   * @param {Object} output Output params
   * @returns {Forge}
   */
  addOutput(output = []) {
    if (Array.isArray(output)) {
      return output.forEach(o => this.addOutput(o))
    }

    if (Object.getPrototypeOf(output.constructor).name === 'Cast') {
      this.outputs.push(output)
    } else {
      const satoshis = output.satoshis || output.amount || 0
      let cast
      if (output.script) {
        // If its already script we can create a fake cast
        const scriptBuf = Buffer.from(output.script, 'hex')
        const lockingScript = {
          script: [Script.fromBuffer(scriptBuf)],
          size: scriptBuf.length
        }
        cast = Cast.lockingScript({ lockingScript }, { satoshis })
      } else if (output.data) {
        cast = Cast.lockingScript(OP_RETURN, { satoshis, data: output.data })
      } else if (output.to) {
        const address = Address.fromString(output.to)
        cast = Cast.lockingScript(P2PKH, { satoshis, address })
      } else {
        throw new Error('Invalid TxOut params')
      }
      this.outputs.push(cast)
    }

    return this
  }

  /**
   * Builds the transaction on the forge instance.
   * 
   * `build()` must be called first before attempting to sign. The
   * `unlockingScripts` are generated with signatures and other dynamic push
   * data zeroed out.
   * 
   * @returns {Forge}
   */
  build() {
    // Create a new tx
    this.tx = Tx.fromObject({ nLockTime: this.tx.nLockTime })

    // Iterate over inputs and add placeholder unlockingScripts
    this.inputs.forEach(cast => {
      const size = cast.getSize() - 40,
            buf = Buffer.alloc(size),
            script = new Script().fromBuffer(buf)
            
      this.tx.addTxIn(cast.txHashBuf, cast.txOutNum, script, cast.nSequence)
    })

    // Iterate over outputs and add to tx
    this.outputs.forEach(cast => {
      const script = cast.getScript()
      const isOpReturn = (script.chunks[0].opCodeNum === OpCode.OP_RETURN ||
        (script.chunks[0].opCodeNum === OpCode.OP_FALSE && script.chunks[1].opCodeNum === OpCode.OP_RETURN)
      )
      
      // Unless op_return, ensure dust threshold
      if (!isOpReturn) {
        const dust = dustThreshold(cast.getSize(), this.options.rates)
        if (cast.satoshis < dust) {
          throw new Error(`Cannot create output lesser than dust (${ dust })`)
        }
      }
      this.tx.addTxOut(Bn(cast.satoshis), script)
    })
    
    // If necessary, add the changeScript
    if (this.changeScript) {
      let change = this.inputSum - this.outputSum - this.estimateFee()

      // Calculate change script size for working out dust threshold
      const changeScriptLen = this.changeScript.toBuffer().length
      const changeSize = changeScriptLen + VarInt.fromNumber(changeScriptLen).buf.length;
      
      // If no outputs we dont need to make adjustment for change
      // as it is already factored in to fee estimation
      if (this.outputs.length > 0) {
        // Adjust change by size of change script * miner fee
        const rate = this.options.rates.standard || this.options.rates.mine.standard
        const extraFee = Math.ceil(changeSize * rate)
        change -= extraFee
      }

      if (change > dustThreshold(changeSize, this.options.rates)) {
        this.tx.addTxOut(TxOut.fromProperties(Bn(change), this.changeScript))
      }
    }
    
    return this
  }

  /**
   * Iterates over the inputs and generates the `unlockingScript` for each TxIn.
   * Must be called after `build()`.
   * 
   * The given `params` will be passed to each Cast instance. For most standard
   * transactions this is all that is needed. For non-standard transaction types
   * try calling `signTxIn(vin, params)` on individual inputs.
   * 
   * @param {Object} params unlockingScript params
   * @returns {Forge}
   */
  sign(params) {
    if (this.inputs.length !== this.tx.txIns.length) {
      throw new Error('TX not built. Call `build()` first.')
    }

    for (let i = 0; i < this.inputs.length; i++) {
      try {
        this.signTxIn(i, params)
      } catch(e) {
        debug.call(this, 'Forge:', e.message, { i, params })
      }
    }
  }

  /**
   * Generates the `unlockingScript` for the TxIn specified by the given index.
   * 
   * The given `params` will be passed to each Cast instance. This is useful for
   * non-standard transaction types as tailored `unlockingScript` params can be
   * passed to each Cast instance.
   * 
   * @param {Number} vin Input index
   * @param {Object} params unlockingScript params
   */
  signTxIn(vin, params) {
    if (!(
      this.inputs[vin] &&
      this.tx.txIns[vin] &&
      Buffer.compare(this.inputs[vin].txHashBuf, this.tx.txIns[vin].txHashBuf) === 0
    )) {
      throw new Error('TX not built. Call `build()` first.')
    }

    const cast = this.inputs[vin],
          script = cast.getScript(this, params)

    this.tx.txIns[vin].setScript(script)
    return this
  }

  /**
   * Estimates the fee of the current inputs and outputs.
   * 
   * Will use the given miner rates, assuming they are in the Minercraft rates
   * format. If not given. will use the default rates set on the Forge instance.
   * 
   * @param {Object} rates Miner Merchant API rates
   * @param {Boolean} addInput Estimate including an additional input
   * @returns {Number}
   */
  estimateFee(rates = this.options.rates, addInput = false) {
    const parts = [
      { standard: 4 }, // version
      { standard: 4 }, // locktime
      { standard: VarInt.fromNumber(this.inputs.length).buf.length },
      { standard: VarInt.fromNumber(this.outputs.length).buf.length },
    ]

    if (addInput || this.inputs.length == 0) {
      // Assume single p2pkh script
      parts.push({ standard: 148 })
    } else {
      this.inputs.forEach(cast => {
        parts.push({ standard: cast.getSize() })
      })
    }

    if (this.outputs.length > 0) {
      this.outputs.forEach(cast => {
        const p = {},
              script = cast.getScript(),
              txOut = TxOut.fromProperties(Bn(cast.satoshis), script);

        const type = script.chunks[0].opCodeNum === 0 && script.chunks[1].opCodeNum === 106 ? 'data' : 'standard'
        p[type] = 8 + txOut.scriptVi.buf.length + txOut.scriptVi.toNumber()
        parts.push(p)
      })
    } else if (this.changeScript) {
      // Assume single p2pkh output
      const change = TxOut.fromProperties(Bn(0), this.changeScript),
            changeSize = 8 + change.scriptVi.buf.length + change.scriptVi.toNumber()
      parts.push({ standard: changeSize })
    }

    return parts.reduce((fee, p) => {
      return Object
        .keys(p)
        .reduce((acc, k) => {
          const bytes = p[k],
                rate = rates[k] || rates.mine[k];
          return acc + Math.ceil(bytes * rate)
        }, fee)
    }, 0)
  }
}

// Calculates the dust threshold
// See: https://github.com/bitcoin-sv/bitcoin-sv/blob/master/src/primitives/transaction.h#L188-L208
function dustThreshold(lockScriptSize, rates) {
  const rate = rates.standard || rates.relay.standard
  return 3 * Math.floor((lockScriptSize + 148) * rate)
}

// Log the given arguments if debug mode enabled
function debug(...args) {
  if (this.options.debug) {
    console.log(...args)
  }
}

export default Forge