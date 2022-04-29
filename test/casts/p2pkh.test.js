import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { casts, createUTXO } from '../../src/index.js'

const { P2PKH } = casts
const privkey = nimble.PrivateKey.fromRandom()
const address = privkey.toPublicKey().toAddress()
const utxo = createUTXO({
  txid: '0000000000000000000000000000000000000000000000000000000000000000',
  vout: 0
})

test('P2PKH.lock() locks satoshis to an address', t => {
  const cast = P2PKH.lock(1000, { address })
  const txout = cast.toTxOut()
  const script = cast.toScript()
  
  t.is(txout.satoshis, 1000)
  t.deepEqual(txout.script, script)
  t.regex(script.toASM(), /^OP_DUP OP_HASH160 [0-9a-f]{40} OP_EQUALVERIFY OP_CHECKSIG$/)
})

test('P2PKH.lock() accepts address as string', t => {
  t.notThrows(() => P2PKH.lock(1000, { address: address.toString() }))
})

test('P2PKH.lock() throws if arguments invalid', t => {
  t.throws(() => P2PKH.lock(1000, {}))
  t.throws(() => P2PKH.lock(1000, { address: 'Not an address' }))
})

test('P2PKH.unlock() unlocks UTXO with a privkey', t => {
  const cast = P2PKH.unlock(utxo, { privkey })
  const txin = cast.toTxIn()
  const script = cast.toScript()

  t.is(txin.txid, utxo.txid)
  t.is(txin.vout, utxo.vout)
  t.deepEqual(txin.script, script)
  t.regex(script.toASM(), /^0{142} [0-9a-f]{66}$/)
})

test('P2PKH.unlock() throws if arguments invalid', t => {
  t.throws(() => P2PKH.unlock(utxo, {}))
  t.throws(() => P2PKH.unlock(utxo, { privkey: 'Not a privkey' }))
})

test('P2PKH.simulate() evaluates as valid if signed with correct key', t => {
  t.true(P2PKH.simulate({ address }, { privkey }))
})

test('P2PKH.simulate() throws when signed with incorrect key', t => {
  const wrongKey = nimble.PrivateKey.fromRandom()
  t.throws(() => P2PKH.simulate({ address }, { privkey: wrongKey }))
})
