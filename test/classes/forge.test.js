import test from 'ava'
import fs from 'fs'
import nimble from '@runonbitcoin/nimble'
import { Forge, casts, createUTXO } from '../../src/index.js'

const path = new URL('../vectors/bip69.json', import.meta.url).pathname
const bip69 = JSON.parse(fs.readFileSync(path))

const { P2PK, OpReturn, Raw } = casts
const privkey = nimble.PrivateKey.fromRandom()
const pubkey = privkey.toPublicKey()
const address = pubkey.toAddress()
const utxo = {
  txid: '0000000000000000000000000000000000000000000000000000000000000000',
  vout: 0
}

test('forge.changeTo gets undefined by default', t => {
  const forge = new Forge()
  t.is(forge.changeTo, undefined)
})

test('forge.changeTo gets undefined if changeScript is not P2PKH', t => {
  const forge = new Forge({ changeScript: nimble.Script.fromASM('OP_TRUE')})
  t.is(forge.changeTo, undefined)
})

test('forge.changeTo gets address if changeScript is P2PKH', t => {
  const changeScript = nimble.Script.templates.P2PKHLockScript.fromAddress(address)
  const forge = new Forge({ changeScript })
  t.is(forge.changeTo, address.toString())
})

test('forge.changeTo sets P2PKH changeScript from address', t => {
  const forge = new Forge()
  forge.changeTo = address
  t.is(forge.changeScript.constructor.name, 'P2PKHLockScript')
})

test('forge.changeTo sets P2PKH changeScript from address string', t => {
  const forge = new Forge()
  forge.changeTo = address.toString()
  t.is(forge.changeScript.constructor.name, 'P2PKHLockScript')
})

test('forge.inputSum gets sum of all inputs', t => {
  const forge = new Forge()
  t.is(forge.inputSum, 0)

  forge.addInput(P2PK.unlock(createUTXO({ satoshis: 150 }), { privkey }))
  forge.addInput(P2PK.unlock(createUTXO({ satoshis: 9500 }), { privkey }))
  t.is(forge.inputSum, 9650)
})

test('forge.outputSum gets sum of all outputs', t => {
  const forge = new Forge()
  t.is(forge.outputSum, 0)

  forge.addOutput(P2PK.lock(150, { pubkey }))
  forge.addOutput(P2PK.lock(7735, { pubkey }))
  t.is(forge.outputSum, 7885)
})

test('forge.addInput() adds input casts to forge', t => {
  const forge = new Forge()
  t.is(forge.inputs.length, 0)

  forge.addInput(P2PK.unlock(createUTXO(), { privkey }))
  forge.addInput(P2PK.unlock(createUTXO(), { privkey }))
  t.is(forge.inputs.length, 2)
})

test('forge.addInput() accepts array of casts', t => {
  const forge = new Forge()
  t.is(forge.inputs.length, 0)

  forge.addInput([
    P2PK.unlock(createUTXO(), { privkey }),
    P2PK.unlock(createUTXO(), { privkey })
  ])
  t.is(forge.inputs.length, 2)
})

test('forge.addInput() throws if invalid value given', t => {
  const forge = new Forge()
  
  t.throws(() => forge.addInput('not a cast'))
  t.throws(() => forge.addInput(P2PK.lock(150, { pubkey })))
})

test('forge.addOutput() adds output casts to forge', t => {
  const forge = new Forge()
  t.is(forge.outputs.length, 0)

  forge.addOutput(P2PK.lock(150, { pubkey }))
  forge.addOutput(P2PK.lock(150, { pubkey }))
  t.is(forge.outputs.length, 2)
})

test('forge.addOutput() accepts array of casts', t => {
  const forge = new Forge()
  t.is(forge.outputs.length, 0)

  forge.addOutput([
    P2PK.lock(150, { pubkey }),
    P2PK.lock(150, { pubkey })
  ])
  t.is(forge.outputs.length, 2)
})

test('forge.addOutput() throws if invalid value given', t => {
  const forge = new Forge()
  
  t.throws(() => forge.addOutput('not a cast'))
  t.throws(() => forge.addOutput(P2PK.unlock(createUTXO(), { privkey })))
})

function assertBetween(val, min, max) {
  if (val < min || val > max) {
    throw new Error(`value not within range: ${val} != ${min} < ${max}`)
  }
}

test('forge.calcRequiredFee() calculates the required fee for the tx', t => {
  const forge = new Forge({
    inputs: [
      P2PK.unlock(createUTXO({...utxo, satoshis: 10000, script: '01'}), { privkey })
    ],
    outputs: [
      P2PK.lock(5000, { pubkey }),
      P2PK.lock(1000, { pubkey })
    ]
  })

  const bytes = forge.toTx().toBuffer().length
  t.is(forge.calcRequiredFee(), Math.ceil(bytes / 20))
  assertBetween(forge.calcRequiredFee(1000), bytes-1, bytes+1)
  t.pass()
})

test('forge.calcRequiredFee() calculates data scripts separately', t => {
  const forge = new Forge({
    outputs: [
      OpReturn.lock(0, { data: new Uint8Array(1000) })
    ]
  })

  const bytes = forge.toTx().toBuffer().length
  t.is(forge.calcRequiredFee(1000), bytes)
  t.is(forge.calcRequiredFee({ standard: 1000, data: 100}), bytes-914)
  t.pass()
})

test('forge.sort() sorts inputs as per bip69', t => {
  for (let v of bip69.inputs) {
    const inputs = v.inputs.map(i => {
      const utxo = createUTXO({ txid: i.txId, vout: i.vout })
      return P2PK.unlock(utxo, { privkey })
    })

    const forge = new Forge({ inputs }).sort()
    const indexes = forge.inputs.map(i => inputs.indexOf(i))
    t.deepEqual(indexes, v.expected, v.description)
  }
})

test('forge.sort() sorts outputs as per bip69', t => {
  for (let v of bip69.outputs) {
    const outputs = v.outputs.map(o => {
      return Raw.lock(o.value, { script: o.script })
    })

    const forge = new Forge({ outputs }).sort()
    const indexes = forge.outputs.map(i => outputs.indexOf(i))
    t.deepEqual(indexes, v.expected, v.description)
  }
})

test('forge.toTx() returns signed tx', t => {
  const forge = new Forge({
    inputs: [
      P2PK.unlock(createUTXO({...utxo, satoshis: 10000, script: '01'}), { privkey })
    ],
    outputs: [
      P2PK.lock(5000, { pubkey }),
      P2PK.lock(1000, { pubkey })
    ]
  })

  const tx = forge.toTx()
  t.true(tx instanceof nimble.Transaction)
  t.is(tx.outputs.length, 2)
  t.is(tx.fee, 4000)
})

test('forge.toTx() returns signed tx with change', t => {
  const forge = new Forge({
    inputs: [
      P2PK.unlock(createUTXO({...utxo, satoshis: 10000, script: '01'}), { privkey })
    ],
    outputs: [
      P2PK.lock(5000, { pubkey }),
      P2PK.lock(1000, { pubkey })
    ],
    changeScript: nimble.Script.templates.P2PKHLockScript.fromAddress(address)
  })

  const tx = forge.toTx()
  t.is(tx.outputs.length, 3)
  t.is(tx.outputs[2].satoshis, 3987)
  t.is(tx.fee, 13)
})
