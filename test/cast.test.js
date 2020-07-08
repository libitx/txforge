import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../src/forge'
import {P2PKH, P2RPH} from '../src/casts'


describe('new Cast() with P2PKH params', () => {
  let cast, keyPair;
  beforeEach(() => {
    keyPair = bsv.KeyPair.fromRandom()
    const pubKeyHash = bsv.Address.fromPubKey(keyPair.pubKey).hashBuf.toString('hex')
    cast = Forge.cast(P2PKH, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a914'+ pubKeyHash +'88ac'
    })
  })

  xit('should return a placeholder scriptSig', () => {
    const script = cast.placeholder()
    assert.equal(script.toBuffer().length, 108)
    assert.match(script.toHex(), /(00){73}.+(00){33}/)
  })

  xit('should return estimate input size', () => {
    assert.equal(cast.size(), 148)
  })

  xit('must return scriptSig with valid params')
  xit('throws error with invalid scriptSig params')
})


describe('new Cast() with P2RPH params', () => {
  xit('should return a placeholder scriptSig')
  xit('should return estimate input size')
  xit('must return scriptSig with valid params')
  xit('throws error with invalid scriptSig params')
})