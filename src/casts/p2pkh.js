import {
  Address,
  Script,
  Sig,
  Tx
} from 'bsv'

/**
 * TODO
 */
const p2pkh = {
  template: [
    { name: 'sig', size: 73 },
    { name: 'pubkey', size: 33 }
  ],

  /**
   * TODO
   * 
   * @param {Forge} forge Forge instance
   * @param {Object} params scriptSig params 
   * @returns {Script}
   */
  scriptSig(forge, {
    keyPair,
    sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
    flags = Tx.SCRIPT_ENABLE_SIGHASH_FORKID
  }) {
    const tx = forge.tx,
          vin = forge.inputs.indexOf(this),
          txOut = this.txOut,
          script = new Script();

    // Validations
    if (vin < 0) throw new Error('Input cast not found')
    if (!keyPair || !isValid(keyPair, txOut)) {
      throw new Error('Cannot sign p2pkh scriptSig without valid keypair')
    }

    // Iterrate over template and create scriptSig
    this.template.forEach(part => {
      if (part.name === 'sig') {
        const sig = tx.sign(keyPair, sighashType, vin, txOut.script, txOut.valueBn, flags)
        script.writeBuffer(sig.toTxFormat())
      } else if (part.name === 'pubkey') {
        script.writeBuffer(keyPair.pubKey.toBuffer())
      }
    })

    return script
  }
}

// TODO
function isValid(keyPair, { script }) {
  const hashBuf = Address.fromPubKey(keyPair.pubKey).hashBuf
  return !!(
    script.chunks.length === 5 &&
    script.chunks[2].buf &&
    Buffer.compare(script.chunks[2].buf, hashBuf) === 0
  )
}

export default p2pkh