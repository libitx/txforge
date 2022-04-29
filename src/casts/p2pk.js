import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'
import { signTx } from '../macros/index.js'

const { OP_CHECKSIG } = nimble.constants.opcodes

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
