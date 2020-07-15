import { Buffer } from 'buffer'
import {
  Address,
  OpCode,
  Sig,
  Tx
} from 'bsv'


/**
 * P2PKH (pay-to-pubKeyHash) cast
 * 
 * Build and spend pay-to-pubKeyHash transactions, using the locking and
 * unlocking scripts available in this cast.
 */
const P2PKH = {
  /**
   * P2PKH lockingScript
   * 
   * The expected lock parameters are:
   * 
   * * `address` - the bsv Address object to pay to
   * 
   * Example:
   * 
   * ```
   * // Creates P2PK lockingScript
   * Cast.lockingScript(P2PKH, { satoshis: 1000, address })
   * ```
   */
  lockingScript: {
    script: [
      // 1. OpCodes
      OpCode.OP_DUP,
      OpCode.OP_HASH160,

      // 2. PubKeyHash
      ({ address }) => address.hashBuf,

      // 3. OpCodes
      OpCode.OP_EQUALVERIFY,
      OpCode.OP_CHECKSIG
    ],

    /**
     * Returns the size of the script.
     * 
     * @property {Object} size Script size
     */
    size: 25,

    /**
     * Validates the given params.
     * 
     * @param {Object} params Cast params
     */
    validate(params) {
      if (!(params.address && params.address.hashBuf)) {
        throw new Error('P2PKH lockingScript requires address')
      }
    }
  },

  /**
   * P2PKH unlockingScript
   * 
   * The expected unlock parameters are:
   * 
   * * `keyPair` - bsv KeyPair object
   * 
   * Example:
   * 
   * ```
   * // Creates unlockingScript from UTXO
   * Cast.unlockingScript(P2PKH, { txid, txOutNum, txOut, nSequence })
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
      },

      // 2. PubKey
      (_ctx, { keyPair }) => keyPair.pubKey.toBuffer()
    ],

    /**
     * Returns the size of the script.
     * 
     * @property {Object} size Script size
     */
    size: 107,

    /**
     * Validates the given params.
     * 
     * @param {Object} params Cast params
     */
    validate(ctx, params) {
      if (!(params.keyPair && verifyKeyPair(params.keyPair, ctx.txOut))) {
        throw new Error('P2PKH unlockingScript requires valid keyPair')
      }
    }
  }
}

// Helper function verifies the given keyPair matches the pubKey in txOut
function verifyKeyPair(keyPair, { script }) {
  const hashBuf = Address.fromPubKey(keyPair.pubKey).hashBuf
  return !!(
    script.chunks.length === 5 &&
    script.chunks[2].buf &&
    Buffer.compare(script.chunks[2].buf, hashBuf) === 0
  )
}

export default P2PKH