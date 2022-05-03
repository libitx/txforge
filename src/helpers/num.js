import nimble from '@runonbitcoin/nimble'

const { decodeHex } = nimble.functions

/**
 * If num is 0-16 the appropriate opcode is returned. otherwise a ScriptNum
 * buffer is returned.
 * 
 * @param {number} num Number
 * @returns {number|number[]}
 */
export function num(num) {
  if (num === 0) {
    return 0;
  } else if (num > 0 && num <= 16) {
    return num + 80
  } else {
    return scriptNum(num)
  }
}

/**
 * Encodes the given integer as a ScriptNum byte vector.
 * 
 * @param {number} num Number
 * @returns {number[]}
 */
export function scriptNum(num) {
  if (num === 0) return []
  const neg = num < 0
  const arr = Array.from(decodeHex(BigInt(num).toString(16))).reverse()
  const full = arr[arr.length - 1] & 0x80
  if (full) arr.push(0x00)
  if (neg) arr[arr.length - 1] |= 0x80
  return arr
}
