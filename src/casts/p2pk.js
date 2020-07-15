import { Buffer } from 'buffer'
import {
  OpCode,
  Sig,
  Tx
} from 'bsv'

/**
 * P2PK (pay-to-pubKey) cast
 * 
 * Build and spend pay-to-pubKey transactions, using the locking and unlocking
 * scripts available in this cast.
 */
const P2PK = {
  /**
   * P2PK lockingScript
   * 
   * The expected lock parameters are:
   * 
   * * `pubKey` - the bsv PubKey object to pay to
   * 
   * Example:
   * 
   * ```
   * // Creates P2PK lockingScript
   * Cast.lockingScript(P2PK, { satoshis: 1000, pubKey })
   * ```
   */
  lockingScript: {
    script: [
      // 1. PubKey
      ({ pubKey }) => pubKey.toBuffer(),

      // 2. OP_CHECKSIG
      OpCode.OP_CHECKSIG
    ],

    /**
     * Returns the size of the script.
     * 
     * @property {Object} size Script size
     */
    size: 35,

    /**
     * Validates the given params.
     * 
     * @param {Object} params Cast params
     */
    validate(params) {
      if (!(params.pubKey && params.pubKey.point)) {
        throw new Error('P2PK lockingScript requires pubKey')
      }
    }
  },

  /**
   * P2PK unlockingScript
   * 
   * The expected unlock parameters are:
   * 
   * * `keyPair` - bsv KeyPair object
   * 
   * Example:
   * 
   * ```
   * // Creates unlockingScript from UTXO
   * Cast.unlockingScript(P2PK, { txid, txOutNum, txOut, nSequence })
   * 
   * // Sign the unlockingScript a keyPair (assuming vin 0)
   * forge.signTxIn(0, { keyPair })
   * ```
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
     * Returns the size of the script.
     * 
     * @property {Object} size Script size
     */
    size: 73,

    /**
     * Validates the given params.
     * 
     * @param {Object} params Cast params
     */
    validate(ctx, params) {
      if (!params.keyPair || !verifyKeyPair(params.keyPair, ctx.txOut)) {
        throw new Error('P2PK unlockingScript requires valid keyPair')
      }
    }
  }
}

// Helper function verifies the given keyPair matches the pubKey in txOut
function verifyKeyPair(keyPair, { script }) {
  return !!(
    script.chunks.length === 2 &&
    script.chunks[0].buf &&
    Buffer.compare(script.chunks[0].buf, keyPair.pubKey.toBuffer()) === 0
  )
}

export default P2PK