import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../../src/forge'
import Cast from '../../src/cast'
import { P2RPH } from '../../src/casts'

const rBuf = Buffer.from('3d324ce134fef197a82015508aa9950da57273fe4dc4abf5ab4c50c9d06be90b', 'hex'),
      kBuf = Buffer.from('ed7d04e7ec6de2d550992479ad9f52e941049a68cd5b7a24b15659204c78b338', 'hex')


describe('P2RPH.lockingScript', () => {
  let cast1, cast2, cast3;
  beforeEach(() => {
    cast1 = Cast.lockingScript(P2RPH, { satoshis: 5000, rBuf })
    cast2 = Cast.lockingScript(P2RPH, { satoshis: 5000, type: 'PayToR', rBuf })
    cast3 = Cast.lockingScript(P2RPH, { satoshis: 5000, type: 'PayToRSHA256', rBuf })
  })

  it('script template is correct length', () => {
    assert.lengthOf(cast1.script, 13)
    assert.lengthOf(cast2.script, 13)
    assert.lengthOf(cast3.script, 13)
  })

  it('getSize() returns correct txOut size', () => {
    assert.equal(cast1.getSize(), 42)
    assert.equal(cast2.getSize(), 53)
    assert.equal(cast3.getSize(), 54)
  })

  it('getScript() returns P2RPH locking script', () => {
    const script1 = cast1.getScript(cast1.params)
    const script2 = cast2.getScript(cast2.params)
    assert.lengthOf(script1.chunks, 13)
    assert.lengthOf(script2.chunks, 12)
    assert.deepEqual(script1.chunks[10].buf, bsv.Hash.sha256Ripemd160(rBuf))
    assert.deepEqual(script2.chunks[9].buf, rBuf)
  })

  it('getScript() throws error if no rBuf', () => {
    const cast = Cast.lockingScript(P2RPH, { satoshis: 5000 })
    assert.throws(_ => cast.getScript(cast.params), 'P2RPH lockingScript requires rBuf')
  })
})


describe('P2RPH.unlockingScript', () => {
  let cast, forge;
  beforeEach(() => {
    cast = Cast.unlockingScript(P2RPH, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '78537f77517f7c7f75a914de7bacce2f3bb02f03773483096ce4a61c28537a88ac'
    })
    forge = new Forge({ inputs: [cast] })
    forge.build()
  })

  it('script template is correct length', () => {
    assert.lengthOf(cast.script, 2)
  })

  it('getSize() returns correct txOut size', () => {
    assert.equal(cast.getSize(), 148)
  })

  it('getScript() returns P2RPH unlocking script', () => {
    const script = cast.getScript(forge, { kBuf })
    assert.lengthOf(script.chunks, 2)
  })

  it('getScript() signs with given keyPair', () => {
    const keyPair = bsv.KeyPair.fromRandom()
    const script = cast.getScript(forge, { kBuf, keyPair })
    assert.lengthOf(script.chunks, 2)
    assert.deepEqual(script.chunks[1].buf, keyPair.pubKey.toBuffer())
  })

  it('getScript() throws error when incorrect kBuf', () => {
    const kBuf = bsv.Random.getRandomBuffer(32)
    assert.throws(_ => cast.getScript(forge, { kBuf }), 'P2RPH unlockingScript requires valid kBuf')
  })
})