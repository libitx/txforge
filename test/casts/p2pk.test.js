import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../../src/forge'
import Cast from '../../src/cast'
import { P2PK } from '../../src/casts'

const keyPair = bsv.KeyPair.fromRandom(),
      pubKey = keyPair.pubKey


describe('P2PK.lockingScript', () => {
  let cast;
  beforeEach(() => {
    cast = Cast.lockingScript(P2PK, { satoshis: 5000, pubKey })
  })

  it('template is correct length', () => {
    assert.lengthOf(cast.template, 2)
  })

  it('size() returns correct txOut size', () => {
    assert.equal(cast.size(), 44)
  })

  it('script() returns P2PK locking script', () => {
    const script = cast.script(cast.params)
    assert.lengthOf(script.chunks, 2)
    assert.deepEqual(script.chunks[0].buf, pubKey.toBuffer())
  })

  it('script() throws error if no pubKey', () => {
    cast = Cast.lockingScript(P2PK, { satoshis: 5000 })
    assert.throws(_ => cast.script(cast.params), 'P2PK lockingScript requires pubKey')
  })
})


describe('P2PK.unlockingScript', () => {
  let cast, forge;
  beforeEach(() => {
    cast = Cast.unlockingScript(P2PK, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '21'+ pubKey.toString('hex') +'ac'
    })
    forge = new Forge({ inputs: [cast] })
    forge.build()
  })

  it('template is correct length', () => {
    assert.lengthOf(cast.template, 1)
  })

  it('size() returns correct txOut size', () => {
    assert.equal(cast.size(), 114)
  })

  it('script() returns P2PK unlocking script', () => {
    const script = cast.script(forge, { keyPair })
    assert.lengthOf(script.chunks, 1)
    assert.isTrue(bsv.Sig.IsTxDer(script.chunks[0].buf))
  })

  it('script() throws error when incorrect keyPair', () => {
    const keyPair = bsv.KeyPair.fromRandom()
    assert.throws(_ => cast.script(forge, { keyPair }), 'P2PK unlockingScript requires valid keyPair')
  })
})
