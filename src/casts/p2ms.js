import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'
import { num } from '../helpers/index.js'
import { signTx } from '../macros/index.js'

const { OP_0, OP_CHECKMULTISIG } = nimble.constants.opcodes

/**
 * Pay to Multi Sig
 * 
 * P2MS scripts are used to lock Bitcoin to multiple public keys. The Bitcoin
 * can later be unlocked by signing with the specified threshold of
 * corresponding private keys.
 * 
 * ## Lock params
 * 
 * - `pubkeys` - Array of public keys
 * - `threshold` - Integer of required signatures
 * 
 * ## Unlock params
 * 
 * - `privkeys` - Array of private keys
 * 
 * ## Example
 * 
 * ```
 * P2MS.lock(1000, { pubkeys: [pub1, pub2, pub3], threshold: 2 })
 * 
 * P2MS.unlock(utxo, { privkey: [priv1, priv2] })
 * ```
 */
export class P2MS extends Cast {
  init() {
    if (this.mode === 'lock') validateLock(this.params)
    if (this.mode === 'unlock') validateUnlock(this.params)
  }

  lockingScript({ pubkeys, threshold }) {
    this.script
      .push(num(threshold))
      .apply(pushPubkeys, [pubkeys])
      .push(num(pubkeys.length))
      .push(OP_CHECKMULTISIG)   
  }

  unlockingScript({ privkeys }) {
    this.script
      .push(OP_0)
      .apply(pushSigs, [privkeys])
  }
}

function pushPubkeys(pubkeys) {
  pubkeys.forEach(pubkey => {
    this.script.push(pubkey)
  })
}

function pushSigs(privkeys) {
  privkeys.forEach(privkey => {
    this.script.apply(signTx, [privkey])
  })
}

function validateLock({ pubkeys, threshold } = {}) {
  if (!(Array.isArray(pubkeys) && pubkeys.every(k => k.point))) {
    throw new Error('P2MS lock must be created with array of `pubkeys`')
  }

  if (!Number.isInteger(threshold)) {
    throw new Error('P2MS lock must be created with `threshold` integer')
  }
}

function validateUnlock({ privkeys } = {}) {
  if (!(Array.isArray(privkeys) && privkeys.every(k => typeof k.toPublicKey === 'function'))) {
    throw new Error('P2MS unlock must be created with array of `privkeys`')
  }
}