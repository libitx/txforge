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

// Patch OpCodes until added to bsv2
// https://github.com/moneybutton/bsv/issues/161
OpCode.OP_SPLIT = 0x7f

const defaultRHash = 'PayToRHASH160'

/**
 * TODO
 */
const P2RPH = {
  /**
   * TODO
   */
  lockingScript: {
    template: [
      OpCode.OP_OVER,
      OpCode.OP_3,
      OpCode.OP_SPLIT,
      OpCode.OP_NIP,
      OpCode.OP_1,
      OpCode.OP_SPLIT,
      OpCode.OP_SWAP,
      OpCode.OP_SPLIT,
      OpCode.OP_DROP,
      { name: 'hashOp', size: ({type = defaultRHash}) => RPuzzleTypes[type].op ? 1 : 0 },
      { name: 'rHash', size: ({type = defaultRHash, rBuf}) => RPuzzleTypes[type].hash(rBuf).length },
      OpCode.OP_EQUALVERIFY,
      OpCode.OP_CHECKSIG
    ],

    /**
     * TODO
     * @param {*} params
     */
    script({ type = defaultRHash, rBuf }) {
      if (!rBuf || !Buffer.isBuffer(rBuf)) {
        throw new Error('P2RPH lockingScript requires rBuf')
      }

      type = RPuzzleTypes[type]

      return this.template.reduce((script, part) => {
        switch (part.name) {
          case 'hashOp':
            if (type.op) script.writeOpCode(type.op)
            break
          case 'rHash':
            script.writeBuffer(type.hash(rBuf))
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
      { name: 'sig', size: 72 },
      { name: 'pubKey', size: 33 }
    ],
  
    /**
     * TODO
     * @param {Forge} forge 
     * @param {Object} signParams 
     */
    script(forge, {
      kBuf,
      keyPair,
      sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
      flags = Interp.SCRIPT_VERIFY_MINIMALDATA | Interp.SCRIPT_ENABLE_SIGHASH_FORKID | Interp.SCRIPT_ENABLE_MAGNETIC_OPCODES | Interp.SCRIPT_ENABLE_MONOLITH_OPCODES
    } = sigOpts) {
      const tx = forge.tx,
            vin = forge.inputs.indexOf(this),
            txOut = this.txOut
      
      // Validations
      if (vin < 0) throw new Error('Input cast not found')
      if (!kBuf || !verifyKBuf(kBuf, txOut)) {
        throw new Error('P2RPH unlockingScript requires valid kBuf')
      }
  
      if (!keyPair) keyPair = KeyPair.fromRandom()
  
      return this.template.reduce((script, part) => {
        switch(part.name) {
          case 'sig':
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
            break

          case 'pubKey':
            script.writeBuffer(keyPair.pubKey.toBuffer())
            break
        }
        return script
      }, new Script())
  
      return script
    }
  }
}


// TODO
const RPuzzleTypes = {
  PayToRHASH160: {
    op: OpCode.OP_HASH160,
    hash: Hash.sha256Ripemd160
  },
  PayToRRIPEMD160: {
    op: OpCode.OP_RIPEMD160,
    hash: Hash.ripemd160
  },
  PayToRSHA256: {
    op: OpCode.OP_SHA256,
    hash: Hash.sha256
  },
  PayToRHASH256: {
    op: OpCode.OP_HASH256,
    hash: Hash.sha256Sha256
  },
  PayToRSHA1: {
    op: OpCode.OP_SHA1,
    hash: Hash.sha1
  },
  PayToR: {
    op: false,
    hash: (r) => { return r }
  }
}


// TODO
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

// TODO
function getRBuf(kBuf) {
  const k = Bn.fromBuffer(kBuf),
        G = Point.getG(),
        N = Point.getN(),
        Q = G.mul(k),
        r = Q.x.umod(N).toBuffer();

  return r[0]>127 ? Buffer.concat([Buffer.alloc(1), r]) : r;
}

export default P2RPH