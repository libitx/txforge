import nimble from '@runonbitcoin/nimble'
import { asm } from '../helpers/index.js'
import { decodeUint, reverse, slice, trim } from './binary.js'
import { trimVarint } from './varint.js'

const {
  OP_1, OP_2, OP_3, OP_1ADD, OP_ADD, OP_BIN2NUM, OP_NUM2BIN,
  OP_CAT, OP_DUP, OP_INVERT, OP_NIP, OP_PICK, OP_ROLL, OP_ROT, OP_SPLIT, OP_SUB, OP_SWAP, OP_TUCK,
  OP_IF, OP_ELSE, OP_ENDIF, OP_BOOLOR, OP_CHECKSIG, OP_CHECKSIGVERIFY, OP_EQUAL, OP_HASH256
} = nimble.constants.opcodes
const { decodeHex, preimage } = nimble.functions

const ORDER_PREFIX = decodeHex('414136d08c5ed2bf3ba048afe6dcaebafe')
const PUBKEY_A = decodeHex('023635954789a02e39fb7e54440b6f528d53efd65635ddad7f3c4085f97fdbdc48')
const PUBKEY_B = decodeHex('038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218')
const PUBKEY_OPT = decodeHex('02b405d7f0322a89d0f9f3a98e6f938fdc1c969a8d1382a2bf66a71ae74a1e83b0')
const SIG_PREFIX = decodeHex('3044022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f817980220')
const SIGHASH_FLAG = 0x41

/**
 * TODO
 */
export function getVersion() {
  this.script
    .push(OP_DUP)
    .apply(slice, [0, 4])
    .apply(decodeUint)
}

/**
 * TODO
 */
export function getPrevoutsHash() {
  this.script
    .push(OP_DUP)
    .apply(slice, [4, 32])
}

/**
 * TODO
 */
export function getSequenceHash() {
  this.script
    .push(OP_DUP)
    .apply(slice, [36, 32])
}

/**
 * TODO
 */
export function getOutpoint() {
  this.script
    .push(OP_DUP)
    .apply(slice, [68, 36])
}

/**
 * TODO
 */
export function getScript() {
  this.script
    .push(OP_DUP)
    .apply(trim, [104])
    .apply(trim, [-52])
    .apply(trimVarint)
}

/**
 * TODO
 */
export function getSatoshis() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-52, 8])
    .apply(decodeUint)
}

/**
 * TODO
 */
export function getSequence() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-44, 4])
    .apply(decodeUint)
}

/**
 * TODO
 */
export function getOutputsHash() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-40, 32])
}

/**
 * TODO
 */
export function getLocktime() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-8, 4])
    .apply(decodeUint)
}

/**
 * TODO
 */
export function getSighashType() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-4, 4])
    .apply(decodeUint)
}

/**
 * TODO
 */
export function pushTx() {
  const preimg = this.ctx ?
    preimage(
      this.ctx.tx,
      this.ctx.vin,
      this.utxo.script,
      this.utxo.satoshis,
      SIGHASH_FLAG
    ) :
    new Uint8Array(1448);

  this.script.push(preimg)
}

/**
 * TODO
 */
export function checkTx() {
  this.script
    .push(OP_HASH256)
    .apply(prepareSighash)
    .apply(pushOrder)
    .apply(divOrder)
    .apply(sighashMSBis0or255)
    .push(OP_IF)
      .push(OP_2)
      .push(OP_PICK)
      .push(OP_ADD)
    .push(OP_ELSE)
      .push(OP_1ADD)
    .push(OP_ENDIF)
    .apply(sighashModGtOrder)
    .push(OP_IF)
      .push(OP_SUB)
    .push(OP_ELSE)
      .push(OP_NIP)
    .push(OP_ENDIF)
    .apply(pushSig)
    .push(OP_SWAP)
    .push(OP_IF)
      .push(PUBKEY_A)
    .push(OP_ELSE)
      .push(PUBKEY_B)
    .push(OP_ENDIF)
    .push(OP_CHECKSIG)
}

/**
 * TODO
 */
export function checkTxVerify() {
  this.script.apply(checkTx)
  this.script.chunks.pop()
  this.script.push(OP_CHECKSIGVERIFY)
}

// TODO
function prepareSighash() {
  this.script
    .apply(reverse, [32])
    .push([0x1f])
    .push(OP_SPLIT)
    .push(OP_TUCK)
    .push(OP_CAT)
    .apply(decodeUint)
}

// TODO
function pushOrder() {
  this.script
    .push(ORDER_PREFIX)
    .push(asm('00 OP_15 OP_NUM2BIN OP_INVERT OP_CAT 00 OP_CAT'))
}

// TODO
function divOrder() {
  this.script
    .push(OP_DUP)
    .push(OP_2)
    .push(OP_DIV)
}

// TODO
function sighashMSBis0or255() {
  this.script.push(
    asm('OP_ROT OP_3 OP_ROLL OP_DUP ff OP_EQUAL OP_SWAP 00 OP_EQUAL OP_BOOLOR OP_TUCK')
  )
}

// TODO
function sighashModGtOrder() {
  this.script.push(
    asm('OP_3 OP_ROLL OP_TUCK OP_MOD OP_DUP OP_4 OP_ROLL OP_GREATERTHAN')
  )
}

// TODO
function pushSig() {
  this.script
    .push(SIG_PREFIX)
    .push(OP_SWAP)
    .apply(reverse, [32])
    .push(OP_CAT)
    .push([SIGHASH_FLAG])
    .push(OP_CAT)
}

/**
 * TODO
 */
export function checkTxOpt() {
  this.script
    .push(OP_HASH256)
    .apply(add1ToHash)
    .apply(pushSigOpt)
    .push(PUBKEY_OPT)
    .push(OP_CHECKSIG)
}

/**
 * TODO
 */
export function checkTxOptVerify() {
  this.script.apply(checkTxOpt)
  this.script.chunks.pop()
  this.script.push(OP_CHECKSIGVERIFY)
}

// TODO
function add1ToHash() {
  this.script.push(
    asm('OP_1 OP_SPLIT OP_SWAP OP_BIN2NUM OP_1ADD OP_SWAP OP_CAT')
  )
}

// TODO
function pushSigOpt() {
  this.script
    .push(SIG_PREFIX)
    .push(OP_SWAP)
    .push(OP_CAT)
    .push([SIGHASH_FLAG])
    .push(OP_CAT)
}