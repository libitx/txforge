import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { casts, createUTXO } from '../../src/index.js'

const { P2PK } = casts
const privkey = nimble.PrivateKey.fromRandom()
const pubkey = privkey.toPublicKey()
const utxo = createUTXO({
  txid: '0000000000000000000000000000000000000000000000000000000000000000',
  vout: 0
})

test('P2PK.lock() locks satoshis to a pubkey', t => {
  const cast = P2PK.lock(1000, { pubkey })
  const output = cast.toOutput()
  const script = cast.toScript()
  
  t.is(output.satoshis, 1000)
  t.deepEqual(output.script, script)
  t.regex(script.toASM(), /^[0-9a-f]{66} OP_CHECKSIG$/)
})

test('P2PK.lock() throws if arguments invalid', t => {
  t.throws(() => P2PK.lock(1000, {}))
  t.throws(() => P2PK.lock(1000, { pubkey: 'Not a pubkey' }))
})

test('P2PK.unlock() unlocks UTXO with given privkey', t => {
  const cast = P2PK.unlock(utxo, { privkey })
  const input = cast.toInput()
  const script = cast.toScript()

  t.is(input.txid, utxo.txid)
  t.is(input.vout, utxo.vout)
  t.deepEqual(input.script, script)
  t.regex(script.toASM(), /^0{142}$/)
})

test('P2PK.unlock() throws if arguments invalid', t => {
  t.throws(() => P2PK.unlock(utxo, {}))
  t.throws(() => P2PK.unlock(utxo, { privkey: 'Not a privkey' }))
})

test('P2PK.simulate() evaluates as valid if signed with correct key', t => {
  t.true(P2PK.simulate({ pubkey }, { privkey }))
})

test('P2PK.simulate() evaluates as invalid if signed with incorrect key', t => {
  const wrongKey = nimble.PrivateKey.fromRandom()
  t.throws(() => P2PK.simulate({ pubkey }, { privkey: wrongKey }))
})
