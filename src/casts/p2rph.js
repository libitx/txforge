import { Buffer } from 'buffer'
import {
  Bn,
  Ecdsa,
  Hash,
  Interp,
  KeyPair,
  OpCode,
  Point,
  Sig
} from 'bsv'

// Patch OpCodes until added to bsv2
// https://github.com/moneybutton/bsv/issues/161
OpCode.OP_SPLIT = 0x7f

const defaultRHash = 'PayToRHASH160'

/**
 * P2RPH (R-Puzzle) cast
 * 
 * Build and spend R-Puzzles, using the locking and unlocking scripts available
 * in this cast.
 * 
 * This cast wouldn't be possible without Dean Little revealing how R-Puzzles
 * actually work in his library, [rpuzzle](https://github.com/deanmlittle/rpuzzle).
 * Much of the code in this module is adapted from Dean's work.
 */
const P2RPH = {
  /**
   * P2RPH lockingScript
   * 
   * The expected lock parameters are:
   * 
   * * `type` - the hash algorithm to use (defaults to 'PayToRHASH160')
   * * `rBuf` - the R value in a Buffer or typed array
   * 
   * Example:
   * 
   * ```
   * // Creates R-Puzzle lockingScript
   * Cast.lockingScript(P2RPH, { satoshis: 0, rBuf })
   * ```
   */
  lockingScript: {
    script: [
      // 1. OpCodes
      OpCode.OP_OVER,
      OpCode.OP_3,
      OpCode.OP_SPLIT,
      OpCode.OP_NIP,
      OpCode.OP_1,
      OpCode.OP_SPLIT,
      OpCode.OP_SWAP,
      OpCode.OP_SPLIT,
      OpCode.OP_DROP,

      // 2. Hash type OpCode
      ({type = defaultRHash}) => RPuzzleTypes[type].op,

      // 3. rBufHash
      ({ type = defaultRHash, rBuf }) => RPuzzleTypes[type].hash(rBuf),

      // 4. OpCodes
      OpCode.OP_EQUALVERIFY,
      OpCode.OP_CHECKSIG
    ],

    /**
     * Returns the size of the script.
     * 
     * @param {Object} params Cast params
     * @returns {Number}
     */
    size({ type = defaultRHash }) {
      return 12 + (RPuzzleTypes[type].op ? 1 : 0) + RPuzzleTypes[type].size
    },

    /**
     * Validates the given params.
     * 
     * @param {Object} params Cast params
     */
    validate(params) {
      if (!(params.rBuf && Buffer.isBuffer(params.rBuf))) {
        throw new Error('P2RPH lockingScript requires rBuf')
      }
    }
  },

  /**
   * P2RPH unlockingScript
   * 
   * The expected unlock parameters are:
   * 
   * * `kBuf` - the K value in a Buffer or typed array
   * * `keyPair` - the bsv KeyPair to sign with (will generate ephemeral key if blank)
   * 
   * Example:
   * 
   * ```
   * // Creates unlockingScript from UTXO
   * Cast.unlockingScript(P2RPH, { txid, txOutNum, txOut, nSequence })
   * 
   * // Sign the unlockingScript with kBuf and keyPair (assuming vin 0)
   * forge.signTxIn(0, { kBuf, keyPair })
   * ```
   */
  unlockingScript: {
    script: [
      // 1. Sig
      function(ctx, {
        kBuf,
        keyPair,
        sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
        flags = Interp.SCRIPT_VERIFY_MINIMALDATA | Interp.SCRIPT_ENABLE_SIGHASH_FORKID | Interp.SCRIPT_ENABLE_MAGNETIC_OPCODES | Interp.SCRIPT_ENABLE_MONOLITH_OPCODES
      }) {
        const {tx, txOutNum, txOut} = ctx
        const hashBuf = tx.sighash(sighashType, txOutNum, txOut.script, txOut.valueBn, flags)
        const sig = new Ecdsa()
          .fromObject({
            hashBuf,
            keyPair,
            endian: 'little',
            k: Bn.fromBuffer(kBuf)
          })
          .sign().sig

        sig.fromObject({ nHashType: sighashType })
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
     * Generats a random bsv KeyPair if not already defined
     * 
     * @param {Object} params Cast params
     * @returns {Object}
     */
    setup({ keyPair }) {
      if (!keyPair) keyPair = KeyPair.fromRandom()
      return { keyPair }
    },

    /**
     * Validates the given params.
     * 
     * @param {Object} params Cast params
     */
    validate(ctx, params) {
      if (!(params.kBuf && verifyKBuf(params.kBuf, ctx.txOut))) {
        throw new Error('P2RPH unlockingScript requires valid kBuf')
      }
    }
  }
}


// The available hashing algos
// Use PayToR to pay to the bare R value
const RPuzzleTypes = {
  PayToRHASH160: {
    op: OpCode.OP_HASH160,
    hash: Hash.sha256Ripemd160,
    size: 20
  },
  PayToRRIPEMD160: {
    op: OpCode.OP_RIPEMD160,
    hash: Hash.ripemd160,
    size: 20
  },
  PayToRSHA256: {
    op: OpCode.OP_SHA256,
    hash: Hash.sha256,
    size: 32
  },
  PayToRHASH256: {
    op: OpCode.OP_HASH256,
    hash: Hash.sha256Sha256,
    size: 32
  },
  PayToRSHA1: {
    op: OpCode.OP_SHA1,
    hash: Hash.sha1,
    size: 20
  },
  PayToR: {
    hash: (r) => { return r },
    size: 32
  }
}

// Helper function verifies the kBuf matches the R Hash in txOut
function verifyKBuf(kBuf, { script }) {
  const rBuf = getRBuf(kBuf)

  // Pay to Rpuzzle Hash
  if (script.chunks.length === 13) {
    let type = Object.keys(RPuzzleTypes)
      .filter(key => RPuzzleTypes[key].op === script.chunks[9].opCodeNum)
      .map(key => RPuzzleTypes[key])[0]

    return !!(
      script.chunks[9].opCodeNum &&
      script.chunks[10].buf &&
      Buffer.compare(script.chunks[10].buf, type.hash(rBuf)) === 0
    )
    
  // Pay to Rpuzzle R value
  } else if (script.chunks.length === 12) {
    return !!(
      script.chunks[9].buf &&
      Buffer.compare(script.chunks[9].buf, rBuf) === 0
    )
  
  // Just false
  } else {
    return false
  }
}

// Helper function converts kBuf to rBuf
function getRBuf(kBuf) {
  const k = Bn.fromBuffer(kBuf),
        G = Point.getG(),
        N = Point.getN(),
        Q = G.mul(k),
        r = Buffer.from( Q.x.umod(N).toArray() );

  return r[0]>127 ? Buffer.concat([Buffer.alloc(1), r]) : r;
}

export default P2RPH