import nimble from '@runonbitcoin/nimble'
import { decodeUint, trim } from './binary.js'
import { num } from '../helpers/index.js'

const {
  OP_1,
  OP_DROP,
  OP_DUP,
  OP_ELSE,
  OP_ENDIF,
  OP_EQUAL,
  OP_IF,
  OP_NIP,
  OP_SPLIT,
  OP_SWAP
} = nimble.constants.opcodes

/**
 * Assuming the top stack item is a VarInt encoded byte vector, the VarInt is
 * copied and placed on top of the stack as a ScriptNum.
 * 
 * The original element is not removed.
 * 
 * Use this function if you would like to to extract the VarInt number, yet
 * leave the original data on the stack.
 * 
 * @returns {void}
 */
export function getVarint() {
  this.script
    .push(OP_DUP)
    .apply(varintSwitch, [doGetVarint])
}

// Extract and decode the VarInt number
function doGetVarint(bytes) {
  if (bytes === 1) {
    this.script.push(OP_NIP)

  } else {
    this.script
      .push(OP_DROP)
      .push(num(bytes))
      .push(OP_SPLIT)
      .push(OP_DROP)
  }

  this.script.apply(decodeUint)
}

/**
 * Assuming the top stack item is a VarInt encoded byte vector, the VarInt
 * is extracted and placed on top of the stack as a ScriptNum.
 * 
 * The original element is removed and any remaining data is second on the
 * stack.
 * 
 * Use this function if the VarInt is part of a larger string of bytes and you
 * would like to extract the data whilst retaining the remaining bytes.
 * 
 * @returns {void}
 */
export function readVarint() {
  this.script.apply(varintSwitch, [doReadVarint])
}

// Extract the VarInt data and place on top
function doReadVarint(bytes) {
  if (bytes > 1) {
    this.script
      .push(OP_DROP)
      .push(num(bytes))
      .push(OP_SPLIT)
      .push(OP_SWAP)
  }

  this.script
    .apply(decodeUint)
    .push(OP_SPLIT)
    .push(OP_SWAP)
}

/**
 * Assuming the top stack item is a VarInt encoded binary, the VarInt prefix
 * is trimmed from the leading bytes and the encoded data is placed on top of
 * the stack.
 * 
 * The original element is removed.
 * 
 * Use this function if you would like to cleanly trim the VarInt number from
 * the encoded data.
 * 
 * @returns {void}
 */
export function trimVarint() {
  this.script.apply(varintSwitch, [doTrimVarint])
}

// Trim varint from leading bytes
function doTrimVarint(bytes) {
  this.script.push(OP_DROP)

  if (bytes > 1) {
    this.script.apply(trim, [bytes])
  }
}

// Shared VarInt switch statement
function varintSwitch(handleVarint) {
  this.script
    .push(OP_1)
    .push(OP_SPLIT)
    .push(OP_SWAP)
    .push(OP_DUP)
    .push([253])
    .push(OP_EQUAL)
    .push(OP_IF)
      .apply(handleVarint, [2])
    .push(OP_ELSE)
      .push(OP_DUP)
      .push([254])
      .push(OP_EQUAL)
      .push(OP_IF)
        .apply(handleVarint, [4])
      .push(OP_ELSE)
        .push(OP_DUP)
        .push([255])
        .push(OP_EQUAL)
        .push(OP_IF)
          .apply(handleVarint, [8])
        .push(OP_ELSE)
          .apply(handleVarint, [1])
        .push(OP_ENDIF)
      .push(OP_ENDIF)
    .push(OP_ENDIF)
}
