import nimble from '@runonbitcoin/nimble'
import { num } from '../helpers/index.js'

const { OP_1, OP_BIN2NUM, OP_CAT, OP_DROP, OP_NIP, OP_SIZE, OP_SPLIT, OP_SUB, OP_SWAP } = nimble.constants.opcodes

/**
 * Decodes the top stack element as a ScriptNum encoded number.
 * 
 * @param {string} endian Endianness (defaults 'le')
 * @returns {void}
 */
export function decodeUint(endian = 'le') {
  if (['be', 'big'].includes(endian)) {
    throw new Error('big endian decoding not implemented yet')

  } else {
    this.script
      .push([0])
      .push(OP_CAT)
      .push(OP_BIN2NUM)
  }
}

/**
 * Reverses the top item on the stack.
 * 
 * This macro pushes op codes on to the script that will reverse a binary of the
 * given length.
 * 
 * @param {number} len Length in bytes
 * @returns {void}
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
 * Slices bytes from top item on the stack, starting on the given `start` index
 * for `length` bytes. The stack item is replaced with the sliced value.
 * 
 * Byte vectors are zero indexed. If `start` is a negative integer, then the
 * start index is counted from the end.
 * 
 * @param {number} start Start index
 * @param {number} length Bytes to slice
 * @returns {void}
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
 * Trims the given number of leading or trailing bytes from the top item on the
 * stack. The stack item is replaced with the trimmed value.
 * 
 * When the given `length` is a positive integer, leading bytes are trimmed.
 * When a negative integer is given, trailing bytes are trimmed.
 * 
 * @param {number} length Bytes to trim
 * @returns {void}
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
