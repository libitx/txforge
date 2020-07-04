import {Script, VarInt} from 'bsv'

/**
 * TODO
 */
class Cast {
  /**
   * TODO
   * @param {Object} cast 
   * @param {String} txid 
   * @param {Number} vout 
   * @param {TxOut} txOut 
   */
  constructor({template, toScript}, txid, txOutNum, txOut, nSequence) {
    this.txid = txid
    this.txHashBuf = Buffer.from(txid, 'hex').reverse()
    this.txOutNum = txOutNum
    this.txOut = txOut
    this.nSequence = nSequence
    this.template = template || []

    if (toScript && typeof toScript === 'function') {
      this.toScript = toScript
    }
  }

  /**
   * TODO
   */
  toScript() {
    throw new Error('Cast created with no toScript() function')
  }

  /**
   * TODO
   */
  toTemplate() {
    return this.template.reduce((script, part) => {
      const buf = Buffer.alloc(part.size)
      return script.writeBuffer(buf)
    }, new Script())
  }

  /**
   * TODO
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