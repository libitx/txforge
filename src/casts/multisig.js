import {
  OpCode,
  Script
} from 'bsv'

/**
 * TODO
 */
const multisig = {
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
        throw new Error('Multisig lockingScript requires threshold (M-of-N)')
      }
      if (!(Array.isArray(pubKeys) && pubKeys.every(k => !!k.point))) {
        throw new Error('Multisig lockingScript requires pubKeys')
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
      { name: 'sigs', size: ({ keyPairs }) => keyPairs.length * 73 }
    ],

    /**
     * TODO
     */
    script(forge, {
      keyPair,
      sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
      flags = Tx.SCRIPT_ENABLE_SIGHASH_FORKID
    }) {
      // TODO
    }
  }
}

export default multisig