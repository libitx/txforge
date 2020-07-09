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
      // thresholdOp
      {
        size: 1,
        data: ({ threshold }) => threshold + OpCode.OP_1 - 1
      },
      // pubKeys
      {
        size: ({ pubKeys }) => pubKeys.length * 33,
        data({ pubKeys }) {
          return pubKeys.reduce((script, pubKey) => {
            script.writeBuffer(pubKey.toBuffer())
            return script
          }, new Script())
        }
      },
      // pubKeysOp
      {
        size: 1,
        data: ({ pubKeys }) => pubKeys.length + OpCode.OP_1 - 1
      },
      OpCode.OP_CHECKMULTISIG
    ],

    /**
     * TODO
     * @param {*} params
     */
    validate(params) {
      if (typeof params.threshold !== 'number') {
        throw new Error('P2MS lockingScript requires threshold (M-of-N)')
      }
      if (!(Array.isArray(params.pubKeys) && params.pubKeys.every(k => !!k.point))) {
        throw new Error('P2MS lockingScript requires pubKeys')
      }
    }
  },

  /**
   * TODO
   */
  unlockingScript: {
    template: [
      OpCode.OP_0,
      // sigs
      {
        size: (params) => (params.keyPairs ? params.keyPairs.length : 2) * 73,
        data(ctx, {
          keyPairs,
          sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
          flags = Tx.SCRIPT_ENABLE_SIGHASH_FORKID
        }) {
          const {tx, txOutNum, txOut} = ctx
          const script = new Script()
          // Iterrate over each of the locking script pubKeys
          for (let i = 1; i < txOut.script.chunks.length-2; i++) {
            let keyPair = keyPairs.find(k => {
              return Buffer.compare(txOut.script.chunks[i].buf, k.pubKey.toBuffer()) === 0
            })
            const sig = tx.sign(keyPair, sighashType, txOutNum, txOut.script, txOut.valueBn, flags)
            script.writeBuffer(sig.toTxFormat())
          }
          return script
        }
      }
    ],

    /**
     * TODO
     */
    validate(ctx, params) {
      if (!params.keyPairs) throw new Error('P2MS unlockingScript requires valid keyPairs')
      if (!verifyKeyPairs(params.keyPairs, ctx.txOut)) {
        throw new Error('P2MS unlockingScript keyPairs must match lockingScript pubKeys')
      }
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