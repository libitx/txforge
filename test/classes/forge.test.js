import test from 'ava'
import fs from 'fs'
import nimble from '@runonbitcoin/nimble'
import { Forge, casts, createForge, createUTXO, forgeTx } from '../../src/index.js'

const path = new URL('../vectors/bip69.json', import.meta.url).pathname
const bip69 = JSON.parse(fs.readFileSync(path))

const { P2PK, P2PKH, OpReturn, Raw } = casts
const privkey = nimble.PrivateKey.fromRandom()
const pubkey = privkey.toPublicKey()
const address = pubkey.toAddress()
const utxo = {
  txid: '0000000000000000000000000000000000000000000000000000000000000000',
  vout: 0
}

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

test('forge.changeTo() sets changeScript to any given class and params', t => {
  const forge = new Forge()
  forge.changeTo(P2PK, { pubkey })

  t.true(forge.changeScript instanceof nimble.Script)
  t.is(forge.changeScript.length, 35)
})

test('forge.changeTo() accepts P2PKH params as sensible default', t => {
  const forge = new Forge()
  forge.changeTo({ address })
  t.true(forge.changeScript instanceof nimble.Script)
  t.is(forge.changeScript.length, 25)
})

test('forge.changeTo() accepts Raw params as sensible default', t => {
  const forge = new Forge()
  forge.changeTo({ script: '01' })
  t.true(forge.changeScript instanceof nimble.Script)
  t.is(forge.changeScript.length, 2)
})

test('forge.changeTo() throws error if invalid cast params given', t => {
  const forge = new Forge()
  t.throws(_ => forge.changeTo({ foo: 'bar' }))
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
    change: { address }
  })

  const tx = forge.toTx()
  t.is(tx.outputs.length, 3)
  t.is(tx.outputs[2].satoshis, 3987)
  t.is(tx.fee, 13)
})

test('createForge() sets given inputs and outputs', t => {
  const forge = createForge({
    inputs: [
      P2PKH.unlock(createUTXO(), { privkey }),
      P2PK.unlock(createUTXO(), { privkey })
    ],
    outputs: [
      P2PKH.lock(10000, { address }),
      P2PK.lock(10000, { pubkey }),
      OpReturn.lock(0, { data: 'hello world' })
    ]
  })

  t.is(forge.inputs.length, 2)
  t.is(forge.outputs.length, 3)
  t.is(forge.outputSum, 20000)
})

test('createForge() sets given change param tuple', t => {
  const forge = createForge({
    change: [P2PK, { pubkey }]
  })

  t.true(forge.changeScript instanceof nimble.Script)
  t.is(forge.changeScript.length, 35)
})

test('createForge() sets given change param as P2PKH script', t => {
  const forge = createForge({
    change: { address }
  })

  t.true(forge.changeScript instanceof nimble.Script)
  t.is(forge.changeScript.length, 25)
})

test('createForge() sets given change param as Raw script', t => {
  const forge = createForge({
    change: { script: 'ae' }
  })

  t.true(forge.changeScript instanceof nimble.Script)
  t.is(forge.changeScript.length, 2)
})

test('createForge() sets given locktime', t => {
  const forge = createForge({
    locktime: 999999
  })

  t.is(forge.locktime, 999999)
})

test('createForge() sets given options', t => {
  const forge = createForge({
    options: { sort: true, foo: 'bar' }
  })

  t.is(forge.options.sort, true)
  t.is(forge.options.foo, 'bar')
  t.deepEqual(forge.options.rates, { standard: 50, data: 50 })
})

test('forgeTx() returns a built transaction', t => {
  const txid = '0000000000000000000000000000000000000000000000000000000000000000'
  const tx = forgeTx({
    inputs: [
      P2PKH.unlock(createUTXO({ txid, vout: 0, satoshis: 10000, script: '006a' }), { privkey }),
      P2PK.unlock(createUTXO({ txid, vout: 0, satoshis: 10000, script: '006a' }), { privkey })
    ],
    outputs: [
      P2PKH.lock(10000, { address }),
      P2PK.lock(10000, { pubkey }),
      OpReturn.lock(0, { data: 'hello world' })
    ]
  })

  t.is(tx.inputs.length, 2)
  t.is(tx.outputs.length, 3)
})

test('forgeTx() sets change on the tx', t => {
  const txid = '0000000000000000000000000000000000000000000000000000000000000000'
  const tx = forgeTx({
    inputs: [
      P2PKH.unlock(createUTXO({ txid, vout: 0, satoshis: 10000, script: '006a' }), { privkey }),
    ],
    outputs: [
      P2PKH.lock(1000, { address }),
    ],
    change: { address }
  })

  t.is(tx.inputs.length, 1)
  t.is(tx.outputs.length, 2)
})

test('forgeTx() sets locktime on the tx', t => {
  const tx = forgeTx({
    locktime: 999999
  })

  t.is(tx.locktime, 999999)
})

test('forgeTx() uses given rates', t => {
  const txid = '0000000000000000000000000000000000000000000000000000000000000000'
  const tx = forgeTx({
    inputs: [
      P2PKH.unlock(createUTXO({ txid, vout: 0, satoshis: 10000, script: '006a' }), { privkey }),
    ],
    outputs: [
      OpReturn.lock(0, { data: new Array(1000).fill(0) }),
    ],
    change: { address },
    options: { rates: 1000 }
  })

  t.true(tx.fee > 1200)
})
