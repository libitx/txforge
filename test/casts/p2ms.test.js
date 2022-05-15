import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { casts, toUTXO } from '../../src/index.js'

const { P2MS } = casts
const keys = new Array(3).fill(0).map(_ => nimble.PrivateKey.fromRandom())
const pubkeys = keys.map(k => k.toPublicKey())
const privkeys = keys.slice(0, 2)
const utxo = toUTXO({
  txid: '0000000000000000000000000000000000000000000000000000000000000000',
  vout: 0
})

test('P2MS.lock() locks satoshis to a threshold of pubkeys', t => {
  const cast = P2MS.lock(1000, { pubkeys, threshold: 2 })
  const output = cast.toOutput()
  const script = cast.toScript()
  
  t.is(output.satoshis, 1000)
  t.deepEqual(output.script, script)
  t.regex(script.toASM(), /^OP_2 ([0-9a-f]{66} ?){3} OP_3 OP_CHECKMULTISIG$/)
})

test('P2MS.lock() throws if arguments invalid', t => {
  t.throws(() => P2MS.lock(1000, {}))
  t.throws(() => P2MS.lock(1000, { pubkeys: ['Not a pubkey'], threshold: 1 }))
  t.throws(() => P2MS.lock(1000, { pubkeys, threshold: 'xyz' }))
})

test('P2MS.unlock() unlocks UTXO with privkeys', t => {
  const cast = P2MS.unlock(utxo, { privkeys })
  const input = cast.toInput()
  const script = cast.toScript()

  t.is(input.txid, utxo.txid)
  t.is(input.vout, utxo.vout)
  t.deepEqual(input.script, script)
  t.regex(script.toASM(), /^0 (0{142} ?){2}$/)
})

test('P2MS.unlock() throws if arguments invalid', t => {
  t.throws(() => P2MS.unlock(utxo, {}))
  t.throws(() => P2MS.unlock(utxo, { privkeys: ['a', 'b']}))
})

test('P2MS.simulate() evaluates as valid if signed with threshold of keys', t => {
  t.true(P2MS.simulate({ pubkeys, threshold: 2 }, { privkeys }))
})

test('P2MS.simulate() evaluates as invalid if signed with insufficient threshold of keys', t => {
  t.throws(() => P2MS.simulate({ pubkeys, threshold: 2 }, { privkeys: [privkeys[0]] }))
})

test('P2MS.simulate() evaluates as invalid if signed with incorrect of keys', t => {
  const wrongKeys = new Array(2).fill(0).map(_ => nimble.PrivateKey.fromRandom())
  t.throws(() => P2MS.simulate({ pubkeys, threshold: 2 }, { privkeys: wrongKeys }))
})
