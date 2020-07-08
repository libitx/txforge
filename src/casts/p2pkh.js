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
const p2pkh = {
  /**
   * TODO
   */
  lockingScript: {
    // TODO
    template: [
      OpCode.OP_DUP,
      OpCode.OP_HASH160,
      { name: 'pubKeyHash', size: 20 },
      OpCode.OP_EQUALVERIFY,
      OpCode.OP_CHECKSIG
    ],

    /**
     * TODO
     * @param {Object} params 
     */
    script({ address }) {
      if (!(address && address.hashBuf)) {
        throw new Error('P2PKH lockingScript requires address')
      }

      return this.template.reduce((script, part) => {
        if (part.name === 'pubKeyHash') {
          script.writeBuffer(address.hashBuf)
        } else {
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
      { name: 'sig', size: 72 },
      { name: 'pubKey', size: 33 }
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
            txOut = this.txOut
  
      // Validations
      if (vin < 0) throw new Error('Input cast not found')
      if (!keyPair || !verifyKeyPair(keyPair, txOut)) {
        throw new Error('Cannot sign p2pkh scriptSig without valid keypair')
      }
  
      // Iterrate over template and create scriptSig
      return this.template.reduce((script, part) => {
        if (part.name === 'sig') {
          const sig = tx.sign(keyPair, sighashType, vin, txOut.script, txOut.valueBn, flags)
          script.writeBuffer(sig.toTxFormat())
        } else if (part.name === 'pubKey') {
          script.writeBuffer(keyPair.pubKey.toBuffer())
        }
        return script
      }, new Script())
    }
  }
}

// TODO
function verifyKeyPair(keyPair, { script }) {
  const hashBuf = Address.fromPubKey(keyPair.pubKey).hashBuf
  return !!(
    script.chunks.length === 5 &&
    script.chunks[2].buf &&
    Buffer.compare(script.chunks[2].buf, hashBuf) === 0
  )
}

export default p2pkh