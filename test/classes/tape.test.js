import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { Tape, toScript } from '../../src/index.js'

const { opcodes } = nimble.constants

test('Tape.push() pushes an opcode onto the tape', t => {
  const tape = new Tape()
  tape.push(opcodes.OP_RETURN)
  t.deepEqual(tape.cells, [{ opcode: 106 }])
})

test('Tape.push() pushes a buffer onto the tape', t => {
  const tape = new Tape()
  tape.push(Array.from(new Uint8Array([1,2,3,4])))
  t.deepEqual(tape.cells, [{ buf: [1,2,3,4] }])
})

test('Tape.push() pushes a string onto the tape', t => {
  const tape = new Tape()
  tape.push('hello')
  t.true(tape.cells[0].buf instanceof Uint8Array)
})

test('Tape.push() pushes an array of elements onto the tape', t => {
  const tape = new Tape()
  tape.push([opcodes.OP_RETURN, 'hello', new Uint8Array([1,2,3,4])])
  t.is(tape.cells.length, 3)
})

test('Tape.push() throws if an invalid integer', t => {
  const tape = new Tape()
  t.throws(_ => tape.push(999))
})

test('Tape.push() throws if an unknown type', t => {
  const tape = new Tape()
  t.throws(_ => tape.push({ foo: 'bar' }))
})


test('Tape.apply() applies the macro to the tape', t => {
  function macro(code) {
    this.script.push(code)
  }
  const tape = new Tape()
  tape.apply(macro, [opcodes.OP_RETURN])

  t.deepEqual(tape.cells, [{ opcode: 106 }])
})

test('Tape.apply() throws helpful error if arguments not an array', t => {
  function macro(code) {
    this.script.push(code)
  }
  const tape = new Tape()
  t.throws(_ => tape.apply(macro, opcodes.OP_RETURN), { message: /^invalid args/ })
})

test('Tape.each() iterates over the elements', t => {
  const tape = new Tape()
  tape.each([1,2,3], (el, i) => tape.push([el, i]))
  t.is(tape.cells.length, 3)
  t.deepEqual(tape.cells[0], { buf: [1, 0] })
})

test('Tape.repeats() iterates the specified number of times', t => {
  const tape = new Tape()
  tape.repeat(3, (i) => tape.push([i]))
  t.is(tape.cells.length, 3)
  t.deepEqual(tape.cells[0], { buf: [0] })
})

test('toScript() converts the tape to a script', t => {
  const tape = new Tape()
  tape.push(opcodes.OP_RETURN).push('hello')
  const script = toScript(tape)

  t.true(script instanceof nimble.Script)
  t.is(script.toHex(), '6a0568656c6c6f')
})

test('toScript() throws if the argument is not a tape', t => {
  t.throws(_ => toScript('hello'), { message: /^invalid argument/ })
})