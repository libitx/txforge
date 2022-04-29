import nimble from '@runonbitcoin/nimble'

const { decodeASM, decodeScriptChunks } = nimble.functions

export function asm(str) {
  return decodeScriptChunks(decodeASM(str))
}
