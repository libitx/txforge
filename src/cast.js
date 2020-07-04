import {Script, VarInt} from 'bsv'

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
   * @param {String} txid UTXO txid
   * @param {Number} vout UTXO vout
   * @param {TxOut} txOut UTXO txOut instance
   * @param {Number} nSequence nSequence number
   * @constructor
   */
  constructor({template, scriptSig}, txid, txOutNum, txOut, nSequence) {
    this.txid = txid
    this.txHashBuf = Buffer.from(txid, 'hex').reverse()
    this.txOutNum = txOutNum
    this.txOut = txOut
    this.nSequence = nSequence
    this.template = template || []

    if (scriptSig && typeof scriptSig === 'function') {
      this.scriptSig = scriptSig
    }
  }

  /**
   * Returns a placeholder scriptSig, with signatures and other dynamic push
   * datas zeroed out.
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
   * Returns the generated scriptSig. Must be defined in the Cast template.
   * 
   * @returns {Script}
   */
  scriptSig() {
    throw new Error('Cast created with no scriptSig() function')
  }

  /**
   * Returns the estimated size of the scriptSig, based on the Cast template.
   * 
   * @returns {Number}
   */
  size() {
    const init = 40 // txid, vout, nSquence
    return this.template.reduce((sum, p) => {
      let size
      if (p.size) {
        size = VarInt.fromNumber(p.size).buf.length + p.size;
      } else if (Buffer.isBuffer(p)) {
        size = VarInt.fromNumber(p.length).buf.length + p.length
      } else {
        size = 1
      }
      return sum + size
    }, init)
  }
}

export default Cast