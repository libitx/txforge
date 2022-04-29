import nimble from '@runonbitcoin/nimble'

const { sighashFlags } = nimble.constants
const { generateTxSignature } = nimble.functions
const { ecdsaSignWithK, encodeDER, sighash } = nimble.functions

export function signTx(privkey) {
  // If ctx, create signature, otherwise empty 71 bytes
  const sig = this.ctx ?
    generateTxSignature(
      this.ctx.tx,
      this.ctx.vin,
      this.utxo.script,
      this.utxo.satoshis,
      privkey.number,
      privkey.toPublicKey().point,
      this.opts.sighashFlags || sighashFlags.SIGHASH_ALL
    ) :
    new Uint8Array(71);
  
  this.script.push(sig)
}

export function signTxWithK(privkey, k) {
  // If ctx, create signature, otherwise empty 71 bytes
  const sig = this.ctx ?
    generateTxSigWithK(
      this.ctx.tx,
      this.ctx.vin,
      this.utxo.script,
      this.utxo.satoshis,
      privkey,
      k,
      this.opts.sighashFlags || sighashFlags.SIGHASH_ALL
    ) :
    new Uint8Array(71);
  
  this.script.push(sig)
}

function generateTxSigWithK(tx, vin, script, satoshis, privkey, k, flags) {
  const hash = sighash(tx, vin, script, satoshis, flags)
  const sig = ecdsaSignWithK(hash, k, privkey.number, privkey.toPublicKey().point)
  return Array.from([...encodeDER(sig), flags])
}