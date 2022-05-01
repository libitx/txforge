import test from 'ava'
import { casts } from '../../src/index.js'

const { OpReturn } = casts

test('OpReturn.lock() takes a single data binary parameter', t => {
  const cast = OpReturn.lock(0, { data: 'hello world' })
  const output = cast.toOutput()
  const script = cast.toScript()

  t.is(output.satoshis, 0)
  t.deepEqual(output.script, script)
  t.regex(script.toASM(), /^0 OP_RETURN [0-9a-f]{22}$/)
})

test('OpReturn.lock() takes a list of data binary parameters', t => {
  const cast = OpReturn.lock(0, { data: ['hello', 'world'] })
  const script = cast.toScript()

  t.regex(script.toASM(), /^0 OP_RETURN [0-9a-f]{10} [0-9a-f]{10}$/)
})

test('OpReturn.lock() takes a mixed list of parameters', t => {
  const cast = OpReturn.lock(0, { data: ['hello', 'world', { opcode: 90 }, [0,1,2,3]] })
  const script = cast.toScript()

  t.regex(script.toASM(), /^0 OP_RETURN [0-9a-f]{10} [0-9a-f]{10} OP_10 00010203$/)
})
