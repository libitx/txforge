import { assert } from 'chai'
import bsv from 'bsv'
import Cast from '../src/cast'

xit('testing', () => {
  const cast = new Cast({build() {console.log(this)}}, 'aeae')
  cast.build()

  const script = new bsv.Script()
  script.writeOpCode(bsv.OpCode.OP_RETURN)
  script.writeBuffer(Buffer.from('hello'))
  console.log(script)
})