import { Buffer } from 'buffer'
import {
  Bn,
  Script,
  TxOut,
  VarInt
} from 'bsv'

/**
 * Cast class
 * 
 * Casts are an abstraction over transaction input and outputs. A cast provides
 * a simple, unified way for developers to define self contained modules
 * representing `lockingScript` and `unlockingScript` templates.
 * 
 * The templates defined within a Cast are dynamic and allow complex scripts to
 * be build when given specific parameters.
 */
class Cast {
  /**
   * Instantiates a new Cast instance.
   * 
   * @param {Object} cast Cast template object
   * @constructor
   */
  constructor({script, size, setup, validate} = {}) {
    this.script = script || []
    this.size = size
    if (setup && typeof setup === 'function') {
      this.setup = setup
    }
    if (validate && typeof validate === 'function') {
      this.validate = validate
    }
  }

  /**
   * Instantiates a `lockingScript` Cast instance.
   * 
   * The following parameters are required:
   * 
   * * `satoshis` - the amount to send in the output (also accepts `amount`)
   * 
   * Additional parameters may be required, depending on the Cast template.
   * 
   * @param {Object} cast Cast template object
   * @param {Object} params Cast parameters
   * @constructor
   */
  static lockingScript(cast, params = {}) {
    requiresAny(params, 'lockingScript', [
      ['satoshis', 'amount']
    ])

    const satoshis = params.satoshis || params.amount || 0
    delete params.satoshis && delete params.amount
    return new LockingScript(cast.lockingScript, satoshis, params)
  }

  /**
   * Instantiates an `unlockingScript` Cast instance.
   * 
   * The following parameters are required:
   * 
   * * `txid` - txid of the UTXO
   * * `script` - hex encoded script of the UTXO
   * * `satoshis` - the amount in the UTXO (also accepts `amount`)
   * * `vout` - the UTXO output index (also accepts `outputIndex` and `txOutNum`)
   * 
   * Additional parameters may be required, depending on the Cast template.
   * 
   * @param {Object} cast Cast template object
   * @param {Object} params Cast parameters
   * @constructor
   */
  static unlockingScript(cast, params = {}) {
    requires(params, 'unlockingScript', ['txid', 'script'])
    requiresAny(params, 'unlockingScript', [
      ['satoshis', 'amount'],
      ['vout', 'outputIndex', 'txOutNum']
    ])

    const txid = params.txid,
          script = Script.fromHex(params.script),
          satoshis = params.satoshis || params.amount,
          satoshisBn = Bn(satoshis),
          txOut = TxOut.fromProperties(satoshisBn, script),
          nSequence = params.nSequence
    
    let txOutNum
    ['vout', 'outputIndex', 'txOutNum']
      .some(attr => {
        if (typeof params[attr] === 'number') return txOutNum = params[attr]
      })

    delete params.txid && delete params.script
    delete params.satoshis && delete params.amount
    delete params.vout && delete params.outputIndex && delete params.txOutNum

    return new UnlockingScript(cast.unlockingScript, txid, txOutNum, txOut, nSequence, params)
  }

  /**
   * Returns the full generated script.
   * 
   * Iterrates over the template and builds the script chunk by chunk.
   * 
   * @returns {Script}
   */
  getScript(ctx, params) {
    let args
    if (typeof params === 'undefined') {
      params = { ...this.params, ...ctx }
      params = { ...params, ...this.setup(params) }
      args = [params]
    } else {
      params = { ...this.params, ...params }
      params = { ...params, ...this.setup(params) }
      args = [ctx, params]
    }

    this.validate(...args)

    return this.script.reduce((script, chunk) => {
      let data = typeof chunk === 'function' ? chunk(...args) : chunk
      if (typeof data === 'undefined') return script;

      if (data.buffer instanceof ArrayBuffer) {
        script.writeBuffer(data)
      } else if (typeof data === 'number') {
        script.writeOpCode(data)
      } else if (data.chunks) {
        script.writeScript(data)
      }
      
      return script
    }, new Script())
  }

  /**
   * Returns the estimated size of the script, based on the Cast template.
   * 
   * @returns {Number}
   */
  getSize() {
    let size
    if (typeof this.size === 'function') {
      size = this.size(this.params)
    } else if (typeof this.size === 'number') {
      size = this.size
    } else {
      // If no size prop is given on the cast, we must roughly estimate
      console.warn("No 'size' prop given on the template. Size estimate may be innacurate.")
      size = this.script.reduce((sum, chunk) => {
        if (typeof chunk === 'function') {
          // This is horrible. We have no idea how large the data will be so
          // we just pluck a number out of thin air and say 20 bytes
          sum += 21
        } else if (chunk.buffer instanceof ArrayBuffer) {
          sum += VarInt.fromNumber(chunk.length).buf.length + chunk.length
        } else {
          sum += 1
        }
        return sum
      }, 0)
    }

    return VarInt.fromNumber(size).buf.length + size
  }

  /**
   * Callback function that can be overriden in the Cast template.
   * 
   * Returning an Object from this function will make all properties in that
   * Object available to all chunks of the template.
   * 
   * @returns {Object}
   */
  setup() {
    // noop
  }

  /**
   * Callback function that can be overriden in the Cast template.
   * 
   * This is called after `setup()` and receives all parameters that the template
   * build functions receive. This provides a way to check parameters and throw
   * appropriate errors if the parameters aren't correct to build the script.
   * 
   * @param {Obejct} ctx
   * @param {Obejct} params
   */
  validate(...args) {
    // noop
  }
}


// Helper function to ensure all the specified attributes exist in the given
// params
function requires(params, type, attrs) {
  attrs.forEach(attr => {
    if (typeof params[attr] === 'undefined')
      throw new Error(`Cast type '${type}' requires '${attr}' param`)
  })
}

// Helper function to ensure any of the specified attributes exist in the given
// params
function requiresAny(params, type, attrs) {
  attrs.forEach(aliases => {
    if (aliases.every(attr => typeof params[attr] === 'undefined')) {
      throw new Error(`Cast type '${type}' requires '${aliases[0]}' param`)
    }
  })
}

/**
 * LockingScript Cast sub-class
 */
class LockingScript extends Cast {
  /**
   * Instantiates a new LockingScript instance.
   * 
   * @param {Object} cast Cast template object
   * @param {Number} satoshis Amount to send
   * @param {Object} params Other parameters
   * @constructor
   */
  constructor(cast, satoshis, params = {}) {
    super(cast)

    if (typeof satoshis === 'undefined') {
      throw new Error("Cast type 'lockingScript' requires 'satoshis' param")
    }

    this.satoshis = satoshis
    this.params = params
  }

  /**
   * Returns the estimated size of the entire TxOut object
   * 
   * @returns {Number}
   */
  getSize() {
    return super.getSize() + 8 // satoshis (8)
  }
}

/**
 * UnlockingScript Cast sub-class
 */
class UnlockingScript extends Cast {
  /**
   * Instantiates a new UnlockingScript instance.
   * 
   * @param {Object} cast Cast template object
   * @param {String} txid UTXO transaction id
   * @param {Number} txOutNum UTXO output index
   * @param {TxOut} txOut UTXO TxOut object
   * @param {Number} nSequence nSequence number
   * @constructor
   */
  constructor(cast, txid, txOutNum, txOut, nSequence, params = {}) {
    super(cast)

    const req = ['txid', 'txOutNum', 'txOut']

    req.forEach(attr => {
      if (typeof eval(attr) === 'undefined')
        throw new Error(`Cast type 'unlockingScript' requires '${attr}' param`)
    })

    this.txid = txid
    this.txHashBuf = Buffer.from(txid, 'hex').reverse()
    this.txOutNum = txOutNum
    this.txOut = txOut
    this.nSequence = nSequence
    this.params = params
  }

  /**
   * Returns the estimated size of the entire TxIn object
   * 
   * @returns {Number}
   */
  getSize() {
    return super.getSize() + 40 // txid (32), vout (4), nSquence (4)
  }

  /**
   * Returns the full generated script.
   * 
   * Adds a context object which is passed to each of the `unlockingScript`
   * template build functions.
   * 
   * @returns {Script}
   */
  getScript(forge, params) {
    const tx = forge.tx,
          txOutNum = forge.inputs.indexOf(this),
          txOut = this.txOut
    
    return super.getScript({ tx, txOutNum, txOut}, params)
  }
}

export default Cast