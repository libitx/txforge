import nimble from '@runonbitcoin/nimble'
import { num } from '../helpers/index.js'

const { OP_1, OP_CAT, OP_DROP, OP_NIP, OP_SIZE, OP_SPLIT, OP_SUB, OP_SWAP } = nimble.constants.opcodes

/**
 * TODO
 */
export function reverse(len) {
  for (let i = 1; i < len; i++) {
    this.script.push(OP_1).push(OP_SPLIT)
  }

  for (let i = 1; i < len; i++) {
    this.script.push(OP_SWAP).push(OP_CAT)
  }
}

/**
 * TODO
 */
export function slice(start, length) {
  if (start === 0) {
    this.script
      .push(num(length))
      .push(OP_SPLIT)
      .push(OP_DROP)

  } else if (start > 0) {
    this.script
      .apply(trim, [start])
      .apply(slice, [0, length])

  } else if (start < 0) {
    this.script
      .push(OP_SIZE)
      .push(num(start * -1))
      .push(OP_SUB)
      .push(OP_SPLIT)
      .push(OP_NIP)
      .apply(slice, [0, length])
  }
}

/**
 * TODO
 */
export function trim(length) {
  if (length > 0) {
    this.script
      .push(num(length))
      .push(OP_SPLIT)
      .push(OP_NIP)

  } else if (length < 0) {
    this.script
      .push(OP_SIZE)
      .push(num(length * -1))
      .push(OP_SUB)
      .push(OP_SPLIT)
      .push(OP_DROP)
  }
}