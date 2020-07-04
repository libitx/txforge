import {
  Bn,
  Ecdsa,
  Hash,
  Interp,
  KeyPair,
  OpCode,
  Point,
  Script,
  Sig
} from 'bsv'

/**
 * TODO
 */
const p2rph = {
  template: [
    { name: 'sig', size: 73 },
    { name: 'pubkey', size: 33 }
  ],

  /**
   * TODO
   * @param {Forge} forge 
   * @param {Object} signParams 
   */
  scriptSig(forge, {
    keyPair,
    kBuf, 
    sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
    flags = Interp.SCRIPT_VERIFY_MINIMALDATA | Interp.SCRIPT_ENABLE_SIGHASH_FORKID | Interp.SCRIPT_ENABLE_MAGNETIC_OPCODES | Interp.SCRIPT_ENABLE_MONOLITH_OPCODES
  } = sigOpts) {
    const tx = forge.tx,
          vin = forge.inputs.indexOf(this),
          txOut = this.txOut,
          script = new Script();
    
    if (vin < 0) throw new Error('Input cast not found')

    // If incorrect kBuf, then return error message
    if (!kBuf || !isValid(kBuf, txOut)) {
      return 'Cannot sign rpuzzle without valid kBuf'
    }

    if (!keyPair) keyPair = KeyPair.fromRandom()

    this.template.forEach(part => {
      if (part.name === 'sig') {
        const hashBuf = tx.sighash(sighashType, vin, txOut.script, txOut.valueBn, flags)
        const sig = new Ecdsa()
          .fromObject({
            hashBuf,
            keyPair,
            endian: 'little',
            k: Bn.fromBuffer(kBuf)
          })
          .sign().sig

        sig.fromObject({ nHashType: sighashType })
        script.writeBuffer(sig.toTxFormat())
      } else if (part.name === 'pubkey') {
        script.writeBuffer(keyPair.pubKey.toBuffer())
      }
    })

    return script
  }
}

// TODO
function isValid(kBuf, { script }) {
  const rBuf = getRBuf(kBuf)

  // Pay to Rpuzzle Hash
  if (script.chunks.length === 13) {
    return !!(
      script.chunks[9].opCodeNum &&
      script.chunks[10].buf &&
      Buffer.compare(
        script.chunks[10].buf,
        hashRBuf(script.chunks[9].opCodeNum, rBuf)) === 0
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

// TODO
function hashRBuf(opCodeNum, rBuf) {
  switch(opCodeNum) {
    case OpCode.OP_HASH160:
      return Hash.sha256Ripemd160(rBuf)
    case OpCode.OP_RIPEMD160:
      return Hash.ripemd160(rBuf)
    case OpCode.OP_SHA256:
      return Hash.sha256(rBuf)
    case OpCode.OP_HASH256:
      return Hash.sha256Sha256(rBuf)
    case OpCode.OP_SHA1:
      return Hash.sha1(rBuf)
    default:
      return rBuf
  }
}

// TODO
function getRBuf(kBuf) {
  const k = Bn.fromBuffer(kBuf),
        G = Point.getG(),
        N = Point.getN(),
        Q = G.mul(k),
        r = Q.x.umod(N).toBuffer();

  return r[0]>127 ? Buffer.concat([Buffer.alloc(1), r]) : r;
}

export default p2rph