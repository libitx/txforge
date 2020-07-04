import {Bn, Ecdsa, Interp, KeyPair, Script, Sig, VarInt} from 'bsv'

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
  toScript(forge, {
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
    if (!kBuf || !Buffer.isBuffer(kBuf)) throw new Error('Must provide kBuf to sign rpuzzle')

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

export default p2rph