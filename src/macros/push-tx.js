import nimble from '@runonbitcoin/nimble'
import { asm } from '../helpers/index.js'
import { decodeUint, reverse, slice, trim } from './binary.js'
import { trimVarint } from './varint.js'

const {
  OP_CAT, OP_DUP, OP_HASH256, OP_SPLIT, OP_SWAP, OP_TUCK,
  OP_IF, OP_ELSE, OP_ENDIF, OP_CHECKSIG, OP_CHECKSIGVERIFY
} = nimble.constants.opcodes
const { decodeHex, preimage } = nimble.functions

const ORDER_PREFIX = decodeHex('414136d08c5ed2bf3ba048afe6dcaebafe')
const PUBKEY_A = decodeHex('023635954789a02e39fb7e54440b6f528d53efd65635ddad7f3c4085f97fdbdc48')
const PUBKEY_B = decodeHex('038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218')
const PUBKEY_OPT = decodeHex('02b405d7f0322a89d0f9f3a98e6f938fdc1c969a8d1382a2bf66a71ae74a1e83b0')
const SIG_PREFIX = decodeHex('3044022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f817980220')
const SIGHASH_FLAG = 0x41

/**
 * Assuming the top stack item is a Tx Preimage, gets the tx version number and
 * places it on the stack on top of the preimage.
 * 
 * @returns {void}
 */
export function getVersion() {
  this.script
    .push(OP_DUP)
    .apply(slice, [0, 4])
    .apply(decodeUint)
}

/**
 * Assuming the top stack item is a Tx Preimage, gets the 32 byte prevouts hash
 * and places it on the stack on top of the preimage.
 * 
 * @returns {void}
 */
export function getPrevoutsHash() {
  this.script
    .push(OP_DUP)
    .apply(slice, [4, 32])
}

/**
 * Assuming the top stack item is a Tx Preimage, gets the 32 byte sequence hash
 * and places it on the stack on top of the preimage.
 * 
 * @returns {void}
 */
export function getSequenceHash() {
  this.script
    .push(OP_DUP)
    .apply(slice, [36, 32])
}

/**
 * Assuming the top stack item is a Tx Preimage, gets the 36 byte outpoint and
 * places it on the stack on top of the preimage.
 * 
 * @returns {void}
 */
export function getOutpoint() {
  this.script
    .push(OP_DUP)
    .apply(slice, [68, 36])
}

/**
 * Assuming the top stack item is a Tx Preimage, gets the locking script and
 * places it on the stack on top of the preimage.
 * 
 * State can be placed in the locking script and so this becomes an invaluable
 * method for extracting and using that state.
 * 
 * @returns {void}
 */
export function getScript() {
  this.script
    .push(OP_DUP)
    .apply(trim, [104])
    .apply(trim, [-52])
    .apply(trimVarint)
}

/**
 * Assuming the top stack item is a Tx Preimage, gets the input satoshis number
 * and places it on the stack on top of the preimage.
 * 
 * @returns {void}
 */
export function getSatoshis() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-52, 8])
    .apply(decodeUint)
}

/**
 * Assuming the top stack item is a Tx Preimage, gets the input sequence number
 * and places it on the stack on top of the preimage.
 * 
 * @returns {void}
 */
export function getSequence() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-44, 4])
    .apply(decodeUint)
}

/**
 * Assuming the top stack item is a Tx Preimage, gets the 32 byte outputs hash
 * and places it on the stack on top of the preimage.
 * 
 * @returns {void}
 */
export function getOutputsHash() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-40, 32])
}

/**
 * Assuming the top stack item is a Tx Preimage, gets the tx locktime number and
 * places it on the stack on top of the preimage.
 * 
 * @returns {void}
 */
export function getLocktime() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-8, 4])
    .apply(decodeUint)
}

/**
 * Assuming the top stack item is a Tx Preimage, gets the preimage sighash type
 * and places it on the stack on top of the preimage.
 * 
 * @returns {void}
 */
export function getSighashType() {
  this.script
    .push(OP_DUP)
    .apply(slice, [-4, 4])
    .apply(decodeUint)
}

/**
 * Pushes the current Tx Preimage onto the stack. If no tx context is available,
 * then 181 bytes of zeros are pushed onto the script instead.
 * 
 * @returns {void}
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
    new Uint8Array(181);

  this.script.push(preimg)
}

/**
 * Assuming the top stack item is a Tx Preimage, creates and verifies a
 * signature with `OP_CHECKSIG`.
 * 
 * The Tx Preimage is removed from the stack and replaced with the result from
 * `OP_CHECKSIG`.
 * 
 * @returns {void}
 */
export function checkTx() {
  this.script
    .push(OP_HASH256)
    .apply(prepareSighash)
    .apply(pushOrder)
    .apply(divOrder)
    .apply(sighashMSBis0or255)
    .push(asm('OP_IF OP_2 OP_PICK OP_ADD OP_ELSE OP_1ADD OP_ENDIF'))
    .apply(sighashModGtOrder)
    .push(asm('OP_IF OP_SUB OP_ELSE OP_NIP OP_ENDIF'))
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
 * As {@link checkTx} but verifies the signature with `OP_CHECKSIGVERIFY`.
 * 
 * @returns {void}
 */
export function checkTxVerify() {
  this.script.apply(checkTx)
  this.script.cells.pop()
  this.script.push(OP_CHECKSIGVERIFY)
}

// Prepares the sighash and MSB
function prepareSighash() {
  this.script
    .apply(reverse, [32])
    .push([0x1F])
    .push(OP_SPLIT)
    .push(OP_TUCK)
    .push(OP_CAT)
    .apply(decodeUint)
}

// Pushes the secp256k1 order onto the stack
function pushOrder() {
  this.script
    .push(ORDER_PREFIX)
    .push(asm('00 OP_15 OP_NUM2BIN OP_INVERT OP_CAT 00 OP_CAT'))
}

// Divides the order by 2
function divOrder() {
  this.script.push(asm('OP_DUP OP_2 OP_DIV'))
}

// Is the sighash MSB 0x00 or 0xFF
function sighashMSBis0or255() {
  this.script
    .push(asm('OP_ROT OP_3 OP_ROLL OP_DUP ff OP_EQUAL OP_SWAP 00 OP_EQUAL OP_BOOLOR OP_TUCK'))
}

// Is the sighash mod greater than the secp256k1 order
function sighashModGtOrder() {
  this.script.push(
    asm('OP_3 OP_ROLL OP_TUCK OP_MOD OP_DUP OP_4 OP_ROLL OP_GREATERTHAN')
  )
}

// Constructs and pushes the signature onto the stack
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
 * Assuming the top stack item is a Tx Preimage, creates and verifies a
 * signature with `OP_CHECKSIG`.
 * 
 * This uses the {@link https://xiaohuiliu.medium.com/optimal-op-push-tx-ded54990c76f optimal OP_PUSH_TX approach}
 * which compiles to 87 bytes (compared to 438 as per {@link checkTx}).
 * 
 * However, due to the {@link https://bitcoin.stackexchange.com/questions/85946/low-s-value-in-bitcoin-signature Low-S Constraint}
 * the most significant byte of the sighash must be less than a theshold of
 * `0x7E`. There is a roughly 50% chance the signature being invalid. Therefore,
 * when using this technique it is necessary to check the preimage and if
 * necessary continue to malleate the transaction until it is valid.
 * 
 * @returns {void}
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
 * As {@link checkTxOpt} but verifies the signature with `OP_CHECKSIGVERIFY`.
 * 
 * @returns {void}
 */
export function checkTxOptVerify() {
  this.script.apply(checkTxOpt)
  this.script.cells.pop()
  this.script.push(OP_CHECKSIGVERIFY)
}

// Adds 1 to the sighash MSB
function add1ToHash() {
  this.script.push(
    asm('OP_1 OP_SPLIT OP_SWAP OP_BIN2NUM OP_1ADD OP_SWAP OP_CAT')
  )
}

// Constructs and pushes the signature onto the stack (optimal version)
function pushSigOpt() {
  this.script
    .push(SIG_PREFIX)
    .push(OP_SWAP)
    .push(OP_CAT)
    .push([SIGHASH_FLAG])
    .push(OP_CAT)
}
