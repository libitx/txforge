import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { casts, createUTXO } from '../../src/index.js'
import { generateK, calculateR } from '../../src/extra/r-puzzle.js'

const { decodeHex, encodeHex, isBuffer } = nimble.functions
const { P2RPH } = casts
const k = generateK()
const r = calculateR(k)
const privkey = nimble.PrivateKey.fromRandom()
const utxo = createUTXO({
  txid: '0000000000000000000000000000000000000000000000000000000000000000',
  vout: 0
})

test('generateK() returns random 32 bytes', t => {
  const k = generateK()
  t.true(isBuffer(k))
  t.is(k.length, 32)
})

test('calculateR() returns R from K', t => {
  // Example taken from elixir tests
  const myK = '5c5fe3d59de129819770b3d91a6a5422f8cbb7c28f27a532de1efbc7c4ffb5d6'
  const myR = '00906367a7db162403eda7181c5270e9d86beee89d0886a1fe44238fcfbe9cabd3'

  const r = calculateR(decodeHex(myK))
  t.true(isBuffer(r))
  t.is(encodeHex(r), myR)
})

test('P2RPH.lock() locks satoshis to an R value', t => {
  const cast = P2RPH.lock(1000, { r })
  const output = cast.toOutput()
  const script = cast.toScript()
  
  t.is(output.satoshis, 1000)
  t.deepEqual(output.script, script)
  t.regex(script.toASM(), /^OP_OVER OP_3 OP_SPLIT OP_NIP OP_1 OP_SPLIT OP_SWAP OP_SPLIT OP_DROP OP_HASH160 [0-9a-f]{40} OP_EQUALVERIFY OP_TUCK OP_CHECKSIGVERIFY OP_CHECKSIG$/)
})

test('P2RPH.lock() throws if arguments invalid', t => {
  t.throws(() => P2RPH.lock(1000, {}))
  t.throws(() => P2RPH.lock(1000, { r: 'Not a buffer' }))
  t.throws(() => P2RPH.lock(1000, { r: [0, 1, 2, 3, 4] }))
})

test('P2RPH.unlock() unlocks UTXO with given K value', t => {
  const cast = P2RPH.unlock(utxo, { k, privkey })
  const input = cast.toInput()
  const script = cast.toScript()

  t.is(input.txid, utxo.txid)
  t.is(input.vout, utxo.vout)
  t.deepEqual(input.script, script)
  t.regex(script.toASM(), /^(0{142} ?){2} [0-9a-f]{66}$/)
})

test('P2RPH.unlock() signs with random k if none given', t => {
  const cast = P2RPH.unlock(utxo, { k })
  const script = cast.toScript()
  t.regex(script.toASM(), /^(0{142} ?){2} [0-9a-f]{66}$/)
})

test('P2RPH.unlock() throws if arguments invalid', t => {
  t.throws(() => P2RPH.unlock(utxo, {}))
  t.throws(() => P2RPH.unlock(utxo, { k: 'Not a buffer' }))
  t.throws(() => P2RPH.unlock(utxo, { k: [0, 1, 2, 3, 4] }))
})

test('P2RPH.simulate() evaluates as valid with correct K', t => {
  t.true(P2RPH.simulate({ r }, { k, privkey }))
  t.true(P2RPH.simulate({ r }, { k }))
})

test('P2RPH.simulate() evaluates as invalid with incorrect K', t => {
  const wrongK = generateK()
  t.throws(() => P2RPH.simulate({ r }, { k: wrongK }))
})
