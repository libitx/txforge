import {Address, Script, Sig, Tx, VarInt} from 'bsv'

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
   * @param {Forge} forge 
   * @param {Object} signParams 
   */
  toScript(forge, {
    keyPair,
    sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
    flags = Tx.SCRIPT_ENABLE_SIGHASH_FORKID
  }) {
    const tx = forge.tx,
          vin = forge.inputs.indexOf(this),
          txOut = this.txOut,
          script = new Script();
    
    if (vin < 0) throw new Error('Input cast not found')
    // Return if incorrect keypair
    if (!keyPair || 0 < Buffer.compare(
      Address.fromPubKey(keyPair.pubKey).hashBuf,
      txOut.script.chunks[2].buf
    )) {
      throw new Error('Cannot sign p2pkh input without keypair')
    }

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

export default p2pkh