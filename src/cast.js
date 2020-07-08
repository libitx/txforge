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
  constructor({script, template}) {
    // Set template and script
    this.template = template || []
    if (script && typeof script === 'function') {
      this.script = script
    }
  }

  /**
   * TODO
   * @param {Object} cast
   * @param {Number} satoshis
   * @param {Object} params
   */
  static lockingScript(cast, params) {
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
  static unlockingScript(cast, params) {
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
   * Returns the generated scriptSig. Must be defined in the Cast template.
   * 
   * @returns {Script}
   */
  script() {
    throw new Error('Cast created with no script() function')
  }

  /**
   * Returns the estimated size of the script, based on the Cast template.
   * 
   * @returns {Number}
   */
  size() {
    const s = this.template.reduce((sum, p) => {
      if (typeof p === 'undefined') return sum;
      
      let size
      if (p.size) {
        const _s = typeof p.size === 'function' ? p.size(this.params) : p.size
        size = VarInt.fromNumber(_s).buf.length + _s
      } else if (Buffer.isBuffer(p)) {
        size = VarInt.fromNumber(p.length).buf.length + p.length
      } else {
        size = 1
      }
      return sum + size
    }, 0)
    return VarInt.fromNumber(s).buf.length + s
  }
}


// TODO
function requires(params, type, attrs) {
  attrs.forEach(attr => {
    if (typeof params[attr] === 'undefined')
      throw new Error(`Cast type '${type}' requires '${attr}' attribute`)
  })
}

// TODO
function requiresAny(params, type, attrs) {
  attrs.forEach(aliases => {
    if (aliases.every(attr => typeof params[attr] === 'undefined')) {
      throw new Error(`Cast type '${type}' requires '${aliases[0]}' attribute`)
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
      throw new Error('UnlockingScript Cast requires satoshis attribute')
    }

    this.satoshis = satoshis
    this.params = params
  }

  /**
   * TODO
   */
  size() {
    return super.size() + 8 // satoshis (8)
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
        throw new Error(`UnlockingScript Cast requires '${attr}' attribute`)
    })

    this.txid = txid
    this.txHashBuf = Buffer.from(txid, 'hex').reverse()
    this.txOutNum = txOutNum
    this.txOut = txOut
    this.nSequence = nSequence
    this.params = params
  }

  /**
   * Returns a placeholder script, with signatures and dynamic push datas zeroed
   * out.
   * 
   * @returns {Script}
   */
  placeholder() {
    return this.template.reduce((script, part) => {
      const buf = Buffer.alloc(part.size)
      return script.writeBuffer(buf)
    }, new Script())
  }

  /**
   * TODO
   */
  size() {
    return super.size() + 40 // txid (32), vout (4), nSquence (4)
  }
}

export default Cast