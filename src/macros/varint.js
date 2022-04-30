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
 * TODO
 */
export function getVarint() {
  this.script
    .push(OP_DUP)
    .apply(varintSwitch, [doGetVarint])
}

// TODO
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
 * TODO
 */
export function readVarint() {
  this.script.apply(varintSwitch, [doReadVarint])
}

// TODO
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
 * TODO
 */
export function trimVarint() {
  this.script.apply(varintSwitch, [doTrimVarint])
}

function doTrimVarint(bytes) {
  this.script.push(OP_DROP)

  if (bytes > 1) {
    this.script.apply(trim, [bytes])
  }
}

// TODO
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