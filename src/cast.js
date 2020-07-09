import {
  Bn,
  Script,
  TxOut,
  VarInt
} from 'bsv'

/**
 * Cast class
 * 
 * Casts are an abstraction over transaction inputs. It provides a simple way
 * for developers to define simple, self-contained modules responsible for
 * specifiying a scriptSig template, and a function for generating the scriptSig. 
 */
class Cast {
  /**
   * Instantiates a new Cast instance.
   * 
   * @param {Object} cast Cast template object
   * @constructor
   */
  constructor({template, setup, validate} = {}) {
    // Set template and script
    this.template = template || []
    if (setup && typeof setup === 'function') {
      this.setup = setup
    }
    if (validate && typeof validate === 'function') {
      this.validate = validate
    }
  }

  /**
   * TODO
   * @param {Object} cast
   * @param {Number} satoshis
   * @param {Object} params
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
   * TODO
   * @param {Object} cast
   * @param {Object} params
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
   * Returns a placeholder script, with signatures and dynamic push datas zeroed
   * out.
   * 
   * @returns {Script}
   */
  getPlaceholderScript() {
    return this.template.reduce((script, p) => {
      if (p.size) {
        const size = typeof p.size === 'function' ? p.size(this.params) : p.size
        const buf = Buffer.alloc(size)
        script.writeBuffer(buf)
      } else if (Buffer.isBuffer(p)) {
        script.writeBuffer(p)
      } else {
        script.writeOpCode(p)
      }
      
      return script
    }, new Script())
  }

  /**
   * Returns the generated scriptSig. Must be defined in the Cast template.
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

    return this.template.reduce((script, p) => {
      let data = typeof p.data === 'function' ? p.data(...args) : p
      if (typeof data === 'undefined') return script;

      if (Buffer.isBuffer(data)) {
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
    const size = this.template.reduce((sum, p) => {
      if (typeof p === 'undefined') return sum;
      
      let s
      if (p.size) {
        const _s = typeof p.size === 'function' ? p.size(this.params) : p.size
        s = VarInt.fromNumber(_s).buf.length + _s
      } else if (Buffer.isBuffer(p)) {
        s = VarInt.fromNumber(p.length).buf.length + p.length
      } else {
        s = 1
      }

      return sum + s
    }, 0)

    return size + VarInt.fromNumber(size).buf.length
  }

  /**
   * TODO
   */
  setup() {
    // noop
  }

  /**
   * TODO
   */
  validate() {
    // noop
  }
}


// TODO
function requires(params, type, attrs) {
  attrs.forEach(attr => {
    if (typeof params[attr] === 'undefined')
      throw new Error(`Cast type '${type}' requires '${attr}' param`)
  })
}

// TODO
function requiresAny(params, type, attrs) {
  attrs.forEach(aliases => {
    if (aliases.every(attr => typeof params[attr] === 'undefined')) {
      throw new Error(`Cast type '${type}' requires '${aliases[0]}' param`)
    }
  })
}

/**
 * TODO
 */
class LockingScript extends Cast {
  /**
   * TODO
   * @param {Object} cast
   * @param {Number} satoshis
   * @param {Object} params
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
   * TODO
   */
  getSize() {
    return super.getSize() + 8 // satoshis (8)
  }
}

/**
 * TODO
 */
class UnlockingScript extends Cast {
  /**
   * TODO
   * @param {Object} cast
   * @param {String} txid
   * @param {Number} txOutNum
   * @param {TxOut} txOut
   * @param {Number} nSequence
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
   * TODO
   */
  getSize() {
    return super.getSize() + 40 // txid (32), vout (4), nSquence (4)
  }

  /**
   * TODO
   */
  getScript(forge, params) {
    const tx = forge.tx,
          txOutNum = forge.inputs.indexOf(this),
          txOut = this.txOut
    
    return super.getScript({ tx, txOutNum, txOut}, params)
  }
}

export default Cast