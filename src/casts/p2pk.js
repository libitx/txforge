import {
  Address,
  OpCode,
  Script,
  Sig,
  Tx
} from 'bsv'

/**
 * TODO
 */
const P2PK = {
  /**
   * TODO
   */
  lockingScript: {
    // TODO
    template: [
      { name: 'pubKey', size: 33 },
      OpCode.OP_CHECKSIG
    ],

    /**
     * TODO
     * @param {Object} params 
     */
    script({ pubKey }) {
      if (!(pubKey && pubKey.point)) {
        throw new Error('P2PK lockingScript requires pubKey')
      }

      return this.template.reduce((script, part) => {
        switch (part.name) {
          case 'pubKey':
            script.writeBuffer(pubKey.toBuffer())
            break
          default:
            script.writeOpCode(part)
        }
        
        return script
      }, new Script())
    }
  },

  /**
   * TODO
   */
  unlockingScript: {
    template: [
      { name: 'sig', size: 72 }
    ],
  
    /**
     * TODO
     * 
     * @param {Forge} forge Forge instance
     * @param {Object} params scriptSig params 
     * @returns {Script}
     */
    script(forge, {
      keyPair,
      sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
      flags = Tx.SCRIPT_ENABLE_SIGHASH_FORKID
    }) {
      const tx = forge.tx,
            vin = forge.inputs.indexOf(this),
            txOut = this.txOut,
            script = new Script()
  
      // Validations
      if (vin < 0) throw new Error('Input cast not found')
      if (!keyPair || !verifyKeyPair(keyPair, txOut)) {
        throw new Error('P2PK unlockingScript requires valid keyPair')
      }

      const sig = tx.sign(keyPair, sighashType, vin, txOut.script, txOut.valueBn, flags)
      script.writeBuffer(sig.toTxFormat())

      return script
    }
  }
}

// TODO
function verifyKeyPair(keyPair, { script }) {
  return !!(
    script.chunks.length === 2 &&
    script.chunks[0].buf &&
    Buffer.compare(script.chunks[0].buf, keyPair.pubKey.toBuffer()) === 0
  )
}

export default P2PK