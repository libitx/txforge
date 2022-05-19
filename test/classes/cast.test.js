import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { Cast, isCast, toUTXO } from '../../src/index.js'

const { Transaction, Script } = nimble.classes
const { opcodes } = nimble.constants
const { sha256, sha256d } = nimble.functions

class HashPuzzle extends Cast {
  lockingScript({ secret }) {
    this.script
      .push(opcodes.OP_SHA256)
      .push(sha256d(secret))
      .push(opcodes.OP_EQUAL)
  }

  unlockingScript({ secret }) {
    this.script.push(sha256(secret))
  }
}

const secret = 'test secret'

test('Cast#lock() creates a locking Cast', t => {
  const cast = HashPuzzle.lock(1000, { secret })
  t.true(isCast(cast))
  t.is(cast.mode, 'lock')
  t.is(cast.satoshis, 1000)
})

test('Cast#unlock() creates an unlocking Cast', t => {
  const utxo = toUTXO({
    txid: '0000000000000000000000000000000000000000000000000000000000000000',
    vout: 0
  })
  const cast = HashPuzzle.unlock(utxo, { secret })
  t.true(isCast(cast))
  t.is(cast.mode, 'unlock')
  t.is(cast.utxo.txid, '0000000000000000000000000000000000000000000000000000000000000000')
  t.is(cast.utxo.vout, 0)
})

test('Cast#simulate() returns vm with valid params', t => {
  const vm = HashPuzzle.simulate({ secret }, { secret })
  t.true(vm.success)
  t.is(vm.error, null)
  t.true(Array.isArray(vm.chunks))
  t.true(Array.isArray(vm.stack))
  t.true(Array.isArray(vm.stackTrace))
})

test('Cast#simulate() returns vm with unvalid params', t => {
  const vm = HashPuzzle.simulate({ secret }, { secret: 'incorrect' })
  t.false(vm.success)
  t.true(vm.error instanceof Error)
})

test('Cast#toScript() returns the script', t => {
  const cast = HashPuzzle.lock(1000, { secret })
  const script = cast.toScript()
  t.true(script instanceof Script)
  t.is(script.chunks.length, 3)
})

test('Cast#toOutput() returns the Output', t => {
  const cast = HashPuzzle.lock(1000, { secret })
  const output = cast.toOutput()
  t.true(output instanceof Transaction.Output)
  t.is(output.satoshis, 1000)
})

test('Cast#toOutput() throws if unlocking cast', t => {
  const utxo = toUTXO({
    txid: '0000000000000000000000000000000000000000000000000000000000000000',
    vout: 0
  })
  const cast = HashPuzzle.unlock(utxo, { secret })
  t.throws(_ => cast.toOutput())
})

test('Cast#toInput() returns the Output', t => {
  const utxo = toUTXO({
    txid: '0000000000000000000000000000000000000000000000000000000000000000',
    vout: 0
  })
  const cast = HashPuzzle.unlock(utxo, { secret })
  const input = cast.toInput()
  t.true(input instanceof Transaction.Input)
  t.is(input.txid, utxo.txid)
  t.is(input.vout, utxo.vout)
})

test('Cast#toInput() throws if locking cast', t => {
  const cast = HashPuzzle.lock(1000, { secret })
  t.throws(_ => cast.toInput())
})
