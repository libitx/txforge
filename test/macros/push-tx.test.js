import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { casts, forgeTx, Cast, getUTXO } from '../../src/index.js'
import { Tape, toScript } from '../../src/classes/tape.js'
import { num } from '../../src/helpers/index.js'
import {
  getVersion,
  getPrevoutsHash,
  getSequenceHash,
  getOutpoint,
  getScript,
  getSatoshis,
  getSequence,
  getOutputsHash,
  getLocktime,
  getSighashType,
  pushTx,
  checkTx,
  checkTxVerify,
  checkTxOpt,
} from '../../src/macros/index.js'

const { Script } = nimble.classes
const { decodeHex, evalScript, preimage } = nimble.functions
const { OP_DROP } = nimble.constants.opcodes

const prevTx = forgeTx({
  outputs: [
    casts.P2PKH.lock(50000, { address: '15KgnG69mTbtkx73vNDNUdrWuDhnmfCxsf' })
  ]
})

const utxo = getUTXO(prevTx, 0)

const testTx = forgeTx({
  inputs: [
    casts.Raw.unlock(utxo, { script: new Script() })
  ]
})

const prevOut = prevTx.outputs[0]
const preimg = preimage(testTx, 0, prevOut.script, prevOut.satoshis, 0x41)


test('getVersion() puts tx version on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getVersion)
  const script = toScript(b)
  const { stack } = evalScript([], script)

  t.deepEqual(stack[stack.length-1], [1])
})

test('getPrevoutsHash() puts prev outpoints hash on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getPrevoutsHash)
  const script = toScript(b)
  const { stack } = evalScript([], script)

  const expected = Array.from(testTx._hashPrevouts)
  t.deepEqual(stack[stack.length-1], expected)
})

test('getSequenceHash() puts txin sequence hash on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getSequenceHash)
  const script = toScript(b)
  const { stack } = evalScript([], script)

  const expected = Array.from(testTx._hashSequence)
  t.deepEqual(stack[stack.length-1], expected)
})

test('getOutpoint() puts txin outpoint on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getOutpoint)
  const script = toScript(b)
  const { stack } = evalScript([], script)

  const expected = Array.from(decodeHex(prevTx.hash).reverse()).concat([0,0,0,0])
  t.deepEqual(stack[stack.length-1], expected)
})

test('getScript() puts lock script on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getScript)
  const script = toScript(b)
  const { stack } = evalScript([], script)

  t.deepEqual(stack[stack.length-1], Array.from(prevOut.script.buffer))
})

test('getSatoshis() puts lock satoshis on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getSatoshis)
  const script = toScript(b)
  const { stack } = evalScript([], script)

  t.deepEqual(stack[stack.length-1], num(50000))
})

test('getSequence() puts txin sequence on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getSequence)
  const script = toScript(b)
  const { stack } = evalScript([], script)

  t.deepEqual(stack[stack.length-1], num(0xFFFFFFFF))
})

test('getOutputsHash() puts tx outputs hash on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getOutputsHash)
  const script = toScript(b)
  const { stack } = evalScript([], script)

  const expected = Array.from(testTx._hashOutputsAll)
  t.deepEqual(stack[stack.length-1], expected)
})

test('getLocktime() puts tx locktime on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getLocktime).push([1])
  const script = toScript(b)
  const { stack } = evalScript([], script)

  t.deepEqual(stack[stack.length-2], [])
})

test('getSighashType() puts tx sighash type on top of stack', t => {
  const b = new Tape()
  b.push(preimg).apply(getSighashType)
  const script = toScript(b)
  const { stack } = evalScript([], script)

  t.deepEqual(stack[stack.length-1], [0x41])
})

test('pushTx() pushes the tx preimage onto the stack', t => {
  const b = new Tape()
  b.cast.ctx = { tx: testTx, vin: 0 }
  b.cast.utxo = utxo
  b.apply(pushTx)
  const script = toScript(b)
  const { stack } = evalScript(script, [])

  t.deepEqual(stack[0], preimg)
})

test('pushTx() pushes zero bytes placeholder onto the stack without context', t => {
  const b = new Tape()
  b.apply(pushTx).push([1])
  const script = toScript(b)
  const { stack } = evalScript(script, [])

  t.deepEqual(stack[0], new Uint8Array(181).fill(0))
})

class TestCast extends Cast {
  lockingScript({ extraBytes, optimized, verify }) {
    if (extraBytes) {
      this.script.push([0]).push(OP_DROP)
    }
    if (optimized) {
      this.script.apply(checkTxOpt)
    } else if (verify) {
      this.script.apply(checkTxVerify).push([1,2,3])
    } else {
      this.script.apply(checkTx)
    }
  }

  unlockingScript() {
    this.script.apply(pushTx)
  }
}

test('TestCast simulates full check tx', t => {
  const vm = TestCast.simulate()
  t.true(vm.success)
})

test('TestCast simulates full check tx verify', t => {
  const vm = TestCast.simulate({ verify: true })
  t.true(vm.success)
})

test('TestCast simulates optimal check tx verify', t => {
  const vm = TestCast.simulate({ optimized: true })
  t.true(vm.success)
})

test('TestCast optimal check has 50% chance of not working', t => {
  const vm = TestCast.simulate({ optimized: true, extraBytes: true })
  t.false(vm.success)
  t.truthy(vm.error)
})
