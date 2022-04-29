import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'
import { signTx } from '../macros/index.js'

const { Address } = nimble.classes
const { OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG } = nimble.constants.opcodes

export class P2PKH extends Cast {
  init(params) {
    if (typeof params.address === 'string') {
      this.params.address = Address.from(params.address)
    }

    if (this.mode === 'lock') validateLock(this.params)
    if (this.mode === 'unlock') validateUnlock(this.params)
  }

  lockingScript({ address }) {
    this.script
      .push(OP_DUP)
      .push(OP_HASH160)
      .push(address.pubkeyhash)
      .push(OP_EQUALVERIFY)
      .push(OP_CHECKSIG)
  }

  unlockingScript({ privkey }) {
    this.script
      .apply(signTx, [privkey])
      .push(privkey.toPublicKey())
  }
}

function validateLock({ address } = {}) {
  if (!address?.pubkeyhash) {
    throw new Error('P2PKH lock must be created with valid `address`')
  }
}

function validateUnlock({ privkey } = {}) {
  if (typeof privkey?.toPublicKey !== 'function') {
    throw new Error('P2PKH unlock must be created with valid `privkey`')
  }
}
