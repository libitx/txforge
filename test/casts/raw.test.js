import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { casts, toUTXO } from '../../src/index.js'

const { Raw } = casts
const lockScript = nimble.Script.fromHex('76a914a58621fd80c3abcf4f81d343f6a78dc891082d6688ac')
const unlockScript = nimble.Script.fromHex('47304402205832ed8192e83d640824c021107024f9f03adf1fcc9bca826025ab1ce9f012b9022005d71b00d40023a6bb8a2644f7f599bf367850a1ec5ddc95882c9841a1867c6a412102554669f32b842ec626175d3b5380a335213506d55aa896f04d66d9f46f48cf18')
const utxo = toUTXO({
  txid: '0000000000000000000000000000000000000000000000000000000000000000',
  vout: 0
})

test('Raw.lock() locks satoshis to an script', t => {
  const cast = Raw.lock(1000, { script: lockScript })
  const output = cast.toOutput()
  const script = cast.toScript()
  
  t.is(output.satoshis, 1000)
  t.deepEqual(output.script, script)
  t.regex(script.toASM(), /^OP_DUP OP_HASH160 [0-9a-f]{40} OP_EQUALVERIFY OP_CHECKSIG$/)
})

test('Raw.lock() accepts script as string', t => {
  t.notThrows(() => Raw.lock(1000, { script: lockScript.toHex() }))
})

test('Raw.lock() throws if arguments invalid', t => {
  t.throws(() => Raw.lock(1000, {}))
  t.throws(() => Raw.lock(1000, { script: 'Not a script' }))
})

test('Raw.unlock() unlocks UTXO with a privkey', t => {
  const cast = Raw.unlock(utxo, { script: unlockScript })
  const input = cast.toInput()
  const script = cast.toScript()

  t.is(input.txid, utxo.txid)
  t.is(input.vout, utxo.vout)
  t.deepEqual(input.script, script)
  t.regex(script.toASM(), /^[0-9a-f]{142} [0-9a-f]{66}$/)
})

test('Raw.unlock() throws if arguments invalid', t => {
  t.throws(() => Raw.unlock(utxo, {}))
  t.throws(() => Raw.unlock(utxo, { script: 'Not a script' }))
})
