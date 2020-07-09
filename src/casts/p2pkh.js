import {
  Address,
  OpCode,
  Sig,
  Tx
} from 'bsv'


/**
 * TODO
 */
const P2PKH = {
  /**
   * TODO
   */
  lockingScript: {
    template: [
      OpCode.OP_DUP,
      OpCode.OP_HASH160,
      // pubKeyHash
      {
        size: 20,
        data: ({ address }) => address.hashBuf
      },
      OpCode.OP_EQUALVERIFY,
      OpCode.OP_CHECKSIG
    ],

    validate(params) {
      if (!(params.address && params.address.hashBuf)) {
        throw new Error('P2PKH lockingScript requires address')
      }
    }
  },

  /**
   * TODO
   */
  unlockingScript: {
    template: [
      // sig
      {
        size: 72,
        data(ctx, {
          keyPair,
          sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
          flags = Tx.SCRIPT_ENABLE_SIGHASH_FORKID
        }) {
          const {tx, txOutNum, txOut} = ctx
          const sig = tx.sign(keyPair, sighashType, txOutNum, txOut.script, txOut.valueBn, flags)
          return sig.toTxFormat()
        }
      },
      // pubKey
      {
        size: 33,
        data: (_ctx, { keyPair }) => keyPair.pubKey.toBuffer()
      }
    ],

    validate(ctx, params) {
      if (!(params.keyPair && verifyKeyPair(params.keyPair, ctx.txOut))) {
        throw new Error('P2PKH unlockingScript requires valid keyPair')
      }
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

export default P2PKH