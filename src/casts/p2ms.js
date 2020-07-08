import {
  OpCode,
  Script,
  Sig,
  Tx
} from 'bsv'

/**
 * TODO
 */
const P2MS = {
  /**
   * TODO
   */
  lockingScript: {
    template: [
      { name: 'thresholdOp', size: 1 },
      { name: 'pubKeys', size: ({ pubKeys }) => pubKeys.length * 33 },
      { name: 'pubKeysOp', size: 1 },
      OpCode.OP_CHECKMULTISIG
    ],

    /**
     * TODO
     * @param {Object} params 
     */
    script({ threshold, pubKeys }) {
      if (typeof threshold !== 'number') {
        throw new Error('P2MS lockingScript requires threshold (M-of-N)')
      }
      if (!(Array.isArray(pubKeys) && pubKeys.every(k => !!k.point))) {
        throw new Error('P2MS lockingScript requires pubKeys')
      }

      return this.template.reduce((script, part) => {
        switch(part.name) {
          case 'thresholdOp':
            script.writeOpCode(threshold + OpCode.OP_1 - 1)
            break
          case 'pubKeys':
            pubKeys.forEach(pubKey => {
              script.writeBuffer(pubKey.toBuffer())
            })
            break
          case 'pubKeysOp':
            script.writeOpCode(pubKeys.length + OpCode.OP_1 - 1)
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
      OpCode.OP_1,
      { name: 'sigs', size: (params) => {
        return (params.keyPairs ? params.keyPairs.length : 2) * 73
      }}
    ],

    /**
     * TODO
     */
    script(forge, {
      keyPairs,
      sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
      flags = Tx.SCRIPT_ENABLE_SIGHASH_FORKID
    }) {
      const tx = forge.tx,
            vin = forge.inputs.indexOf(this),
            txOut = this.txOut

      // Validations
      if (vin < 0) throw new Error('Input cast not found')
      if (!keyPairs) throw new Error('P2MS unlockingScript requires valid keyPairs')
      if (!verifyKeyPairs(keyPairs, txOut)) {
        throw new Error('P2MS unlockingScript keyPairs must match lockingScript pubKeys')
      }

      // Iterrate over template and create script
      return this.template.reduce((script, part) => {
        switch (part.name) {
          case 'sigs':
            
            // Iterrate over each of the locking script pubKeys
            for (let i = 1; i < txOut.script.chunks.length-2; i++) {
              let keyPair = keyPairs.find(k => {
                return Buffer.compare(txOut.script.chunks[i].buf, k.pubKey.toBuffer()) === 0
              })
              const sig = tx.sign(keyPair, sighashType, vin, txOut.script, txOut.valueBn, flags)
              script.writeBuffer(sig.toTxFormat())
            }
            break
          default:
            script.writeOpCode(part)
        }
        
        return script
      }, new Script())
    }
  }
}

// TODO
function verifyKeyPairs(keyPairs, { script }) {
  return Array.isArray(keyPairs) && keyPairs.every(keyPair => {
    return !!(
      keyPair.pubKey &&
      script.chunks.some(c => {
        return c.buf && Buffer.compare(c.buf, keyPair.pubKey.toBuffer()) === 0
      })
    )
  })
}

export default P2MS