import {
  OpCode,
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
    script: [
      // 1. PubKey
      ({ pubKey }) => pubKey.toBuffer(),

      // 2. OP_CHECKSIG
      OpCode.OP_CHECKSIG
    ],

    /**
     * TODO
     * @param {*} params
     */
    size: 35,

    /**
     * TODO
     * @param {Object} params 
     */
    validate(params) {
      if (!(params.pubKey && params.pubKey.point)) {
        throw new Error('P2PK lockingScript requires pubKey')
      }
    }
  },

  /**
   * TODO
   */
  unlockingScript: {
    script: [
      // 1. Sig
      function(ctx, {
        keyPair,
        sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
        flags = Tx.SCRIPT_ENABLE_SIGHASH_FORKID
      }) {
        const {tx, txOutNum, txOut} = ctx
        const sig = tx.sign(keyPair, sighashType, txOutNum, txOut.script, txOut.valueBn, flags)
        return sig.toTxFormat()
      }
    ],

    /**
     * TODO
     * @param {*} params
     */
    size: 73,

    /**
     * TODO
     * @param {Object} params 
     */
    validate(ctx, params) {
      if (!params.keyPair || !verifyKeyPair(params.keyPair, ctx.txOut)) {
        throw new Error('P2PK unlockingScript requires valid keyPair')
      }
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