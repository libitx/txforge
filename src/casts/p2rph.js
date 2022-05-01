import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'
import { asm } from '../helpers/index.js'
import { signTx, signTxWithK } from '../macros/index.js'

const { PrivateKey } = nimble.classes
const { isBuffer, generatePrivateKey, sha256ripemd160 } = nimble.functions

/**
 * Pay to R-Puzzle Hash
 * 
 * P2RPH scripts are used to lock Bitcoin to a hash puzzle based on the R value
 * of an ECDSA signature. The Bitcoin can later be unlocked with knowledge of
 * the corresponding K value used in that signature.
 * 
 * The technique allows for the spending party to sign the unlocking script
 * using any private key.
 * 
 * ## Lock params
 * 
 * - `r` - R value
 * 
 * ## Unlock params
 * 
 * - `k` - K value
 * - `privkey` - Optional private key to sign with
 * 
 * ## Examples
 * 
 * TxForge offers an additional module with helpers to generate K and R values.
 * 
 * ```
 * import { generateK, calculateR } from 'txforge/extra/r-puzzle
 * 
 * const k = generateK()
 * const r = calculateR(k)
 * 
 * P2RPH.lock(1000, { r })
 * 
 * P2RPH.unlock(utxo, { k })
 * ```
 */
export class P2RPH extends Cast {
  init(params) {
    if (this.mode === 'unlock' && typeof params.privkey === 'undefined') {
      this.params.privkey = PrivateKey.fromRandom()
    }

    if (this.mode === 'lock') validateLock(this.params)
    if (this.mode === 'unlock') validateUnlock(this.params)
  }

  lockingScript({ r }) {
    this.script
      .push(asm('OP_OVER OP_3 OP_SPLIT OP_NIP OP_1 OP_SPLIT OP_SWAP OP_SPLIT OP_DROP OP_HASH160'))
      .push(sha256ripemd160(r))
      .push(asm('OP_EQUALVERIFY OP_TUCK OP_CHECKSIGVERIFY OP_CHECKSIG'))
  }

  unlockingScript({ k, privkey }) {
    this.script
      .apply(signTx, [privkey])
      .apply(signTxWithK, [privkey, k])
      .push(privkey.toPublicKey())
  }
}

function validateLock({ r } = {}) {
  if (!isBuffer(r) || ![32, 33].includes(r.length)) {
    throw new Error('P2RPH lock must be created with valid `r` buffer')
  }
}

function validateUnlock({ k } = {}) {
  if (!isBuffer(k) || k.length !== 32) {
    throw new Error('P2RPH unlock must be created with valid `k` buffer')
  }
}
