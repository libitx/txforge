import nimble from '@runonbitcoin/nimble'

const { decodeHex } = nimble.functions

export function num(num) {
  if (num === 0) {
    return 0;
  } else if (num > 0 && num <= 16) {
    return num ^ 80
  } else {
    return encodeScriptNum(num)
  }
}

function encodeScriptNum(num) {
  const neg = num < 0
  if (BigInt(num) === BigInt(0)) return []
  const arr = Array.from(decodeHex(BigInt(num).toString(16))).reverse()
  const full = arr[arr.length - 1] & 0x80
  if (full) arr.push(0x00)
  if (neg) arr[arr.length - 1] |= 0x80
  return arr
}