import nimble from '@runonbitcoin/nimble'

const { decodeASM, decodeScriptChunks } = nimble.functions

/**
 * Decodes the ASM string and returns array of script chunks.
 * 
 * @param {string} str ASM string
 * @returns {array}
 */
export function asm(str) {
  return decodeScriptChunks(decodeASM(str))
}
