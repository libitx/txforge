import { Buffer } from 'buffer'
import {
  OpCode,
  Script,
  Sig,
  Tx
} from 'bsv'

/**
 * P2MS (multisig) cast
 * 
 * Build and spend multisig transactions, using the locking and unlocking
 * scripts available in this cast.
 */
const P2MS = {
  /**
   * P2MS lockingScript
   * 
   * The expected lock parameters are:
   * 
   * * `threshold` - the number of signatures required to unlock the UTXO
   * * `pubKeys` - array of bsv PubKey objects 
   * 
   * Example:
   * 
   * ```
   * // Creates 2 of 3 multisig lockingScript
   * Cast.lockingScript(P2MS, { satoshis: 1000, threshold: 2, pubKeys: [pk1, pk2, pk3] })
   * ```
   */
  lockingScript: {
    script: [
      // 1. Threshold Op
      ({ threshold }) => threshold + OpCode.OP_1 - 1,

      // 2. PubKeys
      function({ pubKeys }) {
        return pubKeys.reduce((script, pubKey) => {
          script.writeBuffer(pubKey.toBuffer())
          return script
        }, new Script())
      },

      // 3. PubKeys Op
      ({ pubKeys }) => pubKeys.length + OpCode.OP_1 - 1,

      // 4. OP_CHECKMULTISIG
      OpCode.OP_CHECKMULTISIG
    ],

    /**
     * Returns the size of the script.
     * 
     * @param {Object} params Cast params
     * @returns {Number}
     */
    size: ({ pubKeys }) => 2 + (pubKeys.length * 34),

    /**
     * Validates the given params.
     * 
     * @param {Object} params Cast params
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
   * P2MS unlockingScript
   * 
   * The expected unlock parameters are:
   * 
   * * `keyPairs` - array of bsv KeyPair objects
   * 
   * Example:
   * 
   * ```
   * // Creates unlockingScript from UTXO
   * Cast.unlockingScript(P2MS, { txid, txOutNum, txOut, nSequence })
   * 
   * // Sign the unlockingScript with 2 keyPairs (assuming vin 0)
   * forge.signTxIn(0, { keyPairs: [k1, k2] })
   * ```
   */
  unlockingScript: {
    script: [
      // 1. OP_0 required
      OpCode.OP_0,

      // 2. Sigs
      function(ctx, {
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
    ],

    /**
     * Returns the size of the script.
     * 
     * @param {Object} params Cast params
     * @returns {Number}
     */
    size: (params) => 1 + ((params.keyPairs ? params.keyPairs.length : 2) * 73),
    

    /**
     * Validates the given params.
     * 
     * @param {Object} params Cast params
     */
    validate(ctx, params) {
      if (!params.keyPairs) throw new Error('P2MS unlockingScript requires valid keyPairs')
      if (!verifyKeyPairs(params.keyPairs, ctx.txOut)) {
        throw new Error('P2MS unlockingScript keyPairs must match lockingScript pubKeys')
      }
    }
  }
}

// Helper function verifies all given keyPairs match pubKeys in txOut
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