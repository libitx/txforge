import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'
import { asm } from '../helpers/index.js'
import { signTx, signTxWithK } from '../macros/index.js'

const { PrivateKey } = nimble.classes
const { isBuffer, generatePrivateKey, sha256ripemd160 } = nimble.functions

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
