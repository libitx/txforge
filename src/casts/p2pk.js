import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'
import { signTx } from '../macros/index.js'

const { OP_CHECKSIG } = nimble.constants.opcodes

/**
 * Pay to Public Key
 * 
 * P2PK scripts are used to lock Bitcoin to a public key. The Bitcoin can later
 * be unlocked using the corresponding private key.
 * 
 * ## Lock params
 * 
 * - `pubkey` - Public key
 * 
 * ## Unlock params
 * 
 * - `privkey` - Private key
 * 
 * ## Examples
 * 
 * ```
 * P2PK.lock(1000, { pubkey })
 * 
 * P2PK.unlock(utxo, { privkey })
 * ```
 */
export class P2PK extends Cast {
  init() {
    if (this.mode === 'lock') validateLock(this.params)
    if (this.mode === 'unlock') validateUnlock(this.params)
  }

  lockingScript({ pubkey }) {
    this.script
      .push(pubkey)
      .push(OP_CHECKSIG)
  }

  unlockingScript({ privkey }) {
    this.script.apply(signTx, [privkey])
  }
}

function validateLock({ pubkey } = {}) {
  if (!pubkey?.point) {
    throw new Error('P2PK unlock must be created with valid `pubkey`')
  }
}

function validateUnlock({ privkey } = {}) {
  if (typeof privkey?.toPublicKey !== 'function') {
    throw new Error('P2PK unlock must be created with valid `privkey`')
  }
}
