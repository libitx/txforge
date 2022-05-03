import nimble from '@runonbitcoin/nimble'
import { BN_SIZE, PT_SIZE, getMemoryBuffer, getSecp256k1Exports, writeBN, readBN } from '@runonbitcoin/nimble/wasm/wasm-secp256k1.js'

const { encodeHex, generatePrivateKey } = nimble.functions

const secp256k1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141')

/**
 * Generates and returns a random K value.
 * 
 * @returns {Uint8Array}
 */
export const generateK = generatePrivateKey

/**
 * Calculates and returns the R value from the give K value.
 * 
 * @param {Uint8Array} k K value
 * @returns {Uint8Array}
 */
export function calculateR(k) {
  const memory = getMemoryBuffer()
  const privateKeyPos = memory.length - BN_SIZE
  const publicKeyPos = privateKeyPos - PT_SIZE

  writeBN(memory, privateKeyPos, k)

  getSecp256k1Exports().g_mul(publicKeyPos, privateKeyPos)

  const point = {
    x: readBN(memory, publicKeyPos),
    y: readBN(memory, publicKeyPos + BN_SIZE)
  }

  const rBn = BigInt(`0x${ encodeHex(point.x) }`) % secp256k1_N
  const rBuf = bnToBuf(rBn)

  if (rBuf[0] > 127) {
    const buf = new Uint8Array(rBuf.length + 1)
    buf.set([0], 0)
    buf.set(rBuf, 1)
    return buf
  } else {
    return rBuf
  }
}

// Converts js bigint to uint8array
function bnToBuf(bn) {
  var hex = BigInt(bn).toString(16);
  if (hex.length % 2) { hex = '0' + hex; }

  var len = hex.length / 2;
  var u8 = new Uint8Array(len);

  var i = 0;
  var j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j+2), 16);
    i += 1;
    j += 2;
  }

  return u8;
}
