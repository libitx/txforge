import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { Tape, toScript } from '../../src/classes/tape.js'
import { decodeUint, reverse, slice, trim } from '../../src/macros/index.js'

const { evalScript, generateRandomData } = nimble.functions

test('decodeUint() casts the top stack element to a script number', t => {
  function uintBuf(len, cb) {
    const buf = new ArrayBuffer(len)
    const view = new DataView(buf)
    cb(view)
    return new Uint8Array(view.buffer)
  }

  const bufs = [
    uintBuf(1, v => v.setUint8(0, 24, true)),
    uintBuf(4, v => v.setUint32(0, 24, true)),
    uintBuf(4, v => v.setUint32(0, 4000000000, true)),
  ]

  const b = new Tape()
  b.each(bufs, buf => {
    b.push(buf).apply(decodeUint)
  })

  const script = toScript(b)
  const { stack } = evalScript([], script)

  const expected = [[24], [24], [0, 40, 107, 238, 0]]
  t.deepEqual(stack, expected)
})

test('reverse() reverses the data on top of the stack', t => {
  const bufs = [
    [1,2,3,4,5],
    [1,2,3,4,5,6,7,8],
    [1,2,3,4,5,6,7,8,9,10,11,12],
    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],
    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32],
    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34],
    Array.from(generateRandomData(560))
  ]
  t.plan(bufs.length)

  for (let buf of bufs) {
    const b = new Tape()
    b.push(buf)
    b.apply(reverse, [buf.length])

    const script = toScript(b)
    const { stack } = evalScript([], script)

    t.deepEqual(stack[0], buf.reverse())
  }
})

test('slice() slices bytes from the top of the stack', t => {
  t.plan(5)

  // When start has positive index
  for (let args of [[0, 2], [4, 4], [13, 2]]) {
    const buf = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])
    const b = new Tape()
    b.push(buf)
    b.apply(slice, args)

    const script = toScript(b)
    const { stack } = evalScript([], script)

    const expected = buf.slice(args[0], args[0] + args[1])
    t.deepEqual(stack[0], expected)
  }

  // When start has negative index
  for (let args of [[-4, 4], [-13, 2]]) {
    const buf = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])
    const b = new Tape()
    b.push(buf)
    b.apply(slice, args)

    const script = toScript(b)
    const { stack } = evalScript([], script)

    const expected = buf.slice(buf.length + args[0], buf.length + args[0] + args[1])
    t.deepEqual(stack[0], expected)
  }
})

test('trim() trims leading bytes from the top of the stack', t => {
  t.plan(4)

  for (let arg of [2, 4, 8, 13]) {
    const buf = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])
    const b = new Tape()
    b.push(buf)
    b.apply(trim, [arg])

    const script = toScript(b)
    const { stack } = evalScript([], script)

    const expected = buf.slice(arg)
    t.deepEqual(stack[0], expected)
  }
})

test('trim() trims trailing bytes from the top of the stack', t => {
  t.plan(4)
  
  for (let arg of [-2, -4, -8, -13]) {
    const buf = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])
    const b = new Tape()
    b.push(buf)
    b.apply(trim, [arg])

    const script = toScript(b)
    const { stack } = evalScript([], script)

    const expected = buf.slice(0, buf.length+arg)
    t.deepEqual(stack[0], expected)
  }
})