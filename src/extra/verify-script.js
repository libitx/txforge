import nimble from '@runonbitcoin/nimble'

const {
  encodeHex,
  decodeHex,
  decodeScriptChunks,
  verifyTxSignature,
  verifyTxSignatureAsync,
  ripemd160Async,
  sha1Async,
  sha256Async,
  decodePublicKey,
  ripemd160,
  sha1,
  sha256
} = nimble.functions

// These are the same opcodes as constants/opcodes, but they get inlined
const OP_0 = 0
const OP_1NEGATE = 79
const OP_1 = 81
const OP_2 = 82
const OP_3 = 83
const OP_4 = 84
const OP_5 = 85
const OP_6 = 86
const OP_7 = 87
const OP_8 = 88
const OP_9 = 89
const OP_10 = 90
const OP_11 = 91
const OP_12 = 92
const OP_13 = 93
const OP_14 = 94
const OP_15 = 95
const OP_16 = 96
const OP_NOP = 97
const OP_IF = 99
const OP_NOTIF = 100
const OP_ELSE = 103
const OP_ENDIF = 104
const OP_VERIFY = 105
const OP_RETURN = 106
const OP_TOALTSTACK = 107
const OP_FROMALTSTACK = 108
const OP_IFDUP = 115
const OP_DEPTH = 116
const OP_DROP = 117
const OP_DUP = 118
const OP_NIP = 119
const OP_OVER = 120
const OP_PICK = 121
const OP_ROLL = 122
const OP_ROT = 123
const OP_SWAP = 124
const OP_TUCK = 125
const OP_2DROP = 109
const OP_2DUP = 110
const OP_3DUP = 111
const OP_2OVER = 112
const OP_2ROT = 113
const OP_2SWAP = 114
const OP_CAT = 126
const OP_SPLIT = 127
const OP_SIZE = 130
const OP_INVERT = 131
const OP_AND = 132
const OP_OR = 133
const OP_XOR = 134
const OP_EQUAL = 135
const OP_EQUALVERIFY = 136
const OP_LSHIFT = 152
const OP_RSHIFT = 153
const OP_1ADD = 139
const OP_1SUB = 140
const OP_NEGATE = 143
const OP_ABS = 144
const OP_NOT = 145
const OP_0NOTEQUAL = 146
const OP_ADD = 147
const OP_SUB = 148
const OP_MUL = 149
const OP_DIV = 150
const OP_MOD = 151
const OP_BOOLAND = 154
const OP_BOOLOR = 155
const OP_NUMEQUAL = 156
const OP_NUMEQUALVERIFY = 157
const OP_NUMNOTEQUAL = 158
const OP_LESSTHAN = 159
const OP_GREATERTHAN = 160
const OP_LESSTHANOREQUAL = 161
const OP_GREATERTHANOREQUAL = 162
const OP_MIN = 163
const OP_MAX = 164
const OP_WITHIN = 165
const OP_NUM2BIN = 128
const OP_BIN2NUM = 129
const OP_RIPEMD160 = 166
const OP_SHA1 = 167
const OP_SHA256 = 168
const OP_HASH160 = 169
const OP_HASH256 = 170
const OP_CODESEPARATOR = 171
const OP_CHECKSIG = 172
const OP_CHECKSIGVERIFY = 173
const OP_CHECKMULTISIG = 174
const OP_CHECKMULTISIGVERIFY = 175
const OP_NOP1 = 176
const OP_NOP2 = 177
const OP_NOP3 = 178
const OP_NOP4 = 179
const OP_NOP5 = 180
const OP_NOP6 = 181
const OP_NOP7 = 182
const OP_NOP8 = 183
const OP_NOP9 = 184
const OP_NOP10 = 185

export function verifyScript (unlockScript, lockScript, tx, vin, parentSatoshis, async = false) {
  try {
    const unlockChunks = decodeScriptChunks(unlockScript)
    const lockChunks = decodeScriptChunks(lockScript)

    if (unlockChunks.some(x => x.opcode && x.opcode > 96)) throw new Error('non-push data in unlock script')

    const chunks = unlockChunks.concat(lockChunks)
    const log = [] 
    const stack = []
    const altStack = []
    const branchExec = []
    let checkIndex = 0
    let done = false

    const pop = () => {
      if (!stack.length) throw new Error('stack empty')
      return stack.pop()
    }

    const altpop = () => {
      if (!altStack.length) throw new Error('alt stack empty')
      return altStack.pop()
    }

    const popBool = () => pop().some(x => x)

    const encodeNum = (num, neg) => {
      if (typeof num === 'object') { neg = num.neg; num = num.num }
      if (BigInt(num) === BigInt(0)) return []
      const arr = Array.from(decodeHex(BigInt(num).toString(16))).reverse()
      const full = arr[arr.length - 1] & 0x80
      if (full) arr.push(0x00)
      if (neg) arr[arr.length - 1] |= 0x80
      return arr
    }

    const decodeNum = (arr) => {
      if (!arr.length) return { num: BigInt(0), neg: false }
      const neg = !!(arr[arr.length - 1] & 0x80)
      arr[arr.length - 1] &= 0x7F
      const num = BigInt(`0x${encodeHex(Array.from(arr).reverse())}`)
      return { num, neg }
    }

    const addNum = (a, b) => {
      if (a.neg === b.neg) {
        return { num: a.num + b.num, neg: a.neg }
      } else {
        return a.num > b.num
          ? ({ num: a.num - b.num, neg: a.neg })
          : ({ num: b.num - a.num, neg: b.neg })
      }
    }

    const subNum = (b, a) => addNum(a, { num: b.num, neg: !b.neg })

    const lessThan = (b, a) => a.neg !== b.neg
      ? a.neg
      : (a.neg && a.num > b.num) || (!a.neg && a.num < b.num)

    const greaterThan = (b, a) => a.neg !== b.neg
      ? !a.neg
      : (a.neg && a.num < b.num) || (!a.neg && a.num > b.num)

    const lessThanOrEqual = (b, a) => a.neg !== b.neg
      ? a.neg
      : (a.neg && a.num >= b.num) || (!a.neg && a.num <= b.num)

    const greaterThanOrEqual = (b, a) => a.neg !== b.neg
      ? !a.neg
      : (a.neg && a.num <= b.num) || (!a.neg && a.num >= b.num)

    let i = 0

    function step () {
      // Skip branch
      if (branchExec.length > 0 && !branchExec[branchExec.length - 1]) {
        let sub = 0
        while (i < chunks.length) {
          const chunk = chunks[i]
          const opcode = chunk.opcode
          if (opcode === OP_IF || opcode === OP_NOTIF) {
            sub++
          } else if (opcode === OP_ENDIF) {
            if (sub === 0) break
            sub--
          } else if (opcode === OP_ELSE) {
            if (!sub) break
          }
          i++
        }
        if (i >= chunks.length) {
          done = true
          return
        }
      }

      // Commit previous change to log
      if (i > 0) { log.push([chunks[i-1], [...stack]]) }

      const chunk = chunks[i++]

      if (chunk.buf) {
        stack.push(chunk.buf)
        return
      }

      switch (chunk.opcode) {
        case OP_1NEGATE: stack.push([0x81]); break
        case OP_0: stack.push([]); break
        case OP_1: stack.push([1]); break
        case OP_2: stack.push([2]); break
        case OP_3: stack.push([3]); break
        case OP_4: stack.push([4]); break
        case OP_5: stack.push([5]); break
        case OP_6: stack.push([6]); break
        case OP_7: stack.push([7]); break
        case OP_8: stack.push([8]); break
        case OP_9: stack.push([9]); break
        case OP_10: stack.push([10]); break
        case OP_11: stack.push([11]); break
        case OP_12: stack.push([12]); break
        case OP_13: stack.push([13]); break
        case OP_14: stack.push([14]); break
        case OP_15: stack.push([15]); break
        case OP_16: stack.push([16]); break
        case OP_NOP: break
        case OP_IF: branchExec.push(popBool()); break
        case OP_NOTIF: branchExec.push(!popBool()); break
        case OP_ELSE:
          if (!branchExec.length) throw new Error('ELSE found without matching IF')
          branchExec[branchExec.length - 1] = !branchExec[branchExec.length - 1]
          break
        case OP_ENDIF:
          if (!branchExec.length) throw new Error('ENDIF found without matching IF')
          branchExec.pop()
          break
        case OP_VERIFY: if (!popBool()) throw new Error('OP_VERIFY failed'); break
        case OP_RETURN: done = true; break
        case OP_TOALTSTACK: altStack.push(pop()); break
        case OP_FROMALTSTACK: stack.push(altpop()); break
        case OP_IFDUP: { const v = pop(); stack.push(v); if (v.some(x => x)) stack.push(Array.from(v)) } break
        case OP_DEPTH: stack.push(encodeNum(BigInt(stack.length))); break
        case OP_DROP: pop(); break
        case OP_DUP: { const v = pop(); stack.push(v); stack.push(Array.from(v)) } break
        case OP_NIP: { const x2 = pop(); pop(); stack.push(x2) } break
        case OP_OVER: { const x2 = pop(); const x1 = pop(); stack.push(x1, x2, x1) } break
        case OP_PICK: {
          const n = decodeNum(pop())
          if (n.neg || n.num >= stack.length) throw new Error('OP_PICK failed, out of range')
          stack.push(Array.from(stack[stack.length - Number(n.num) - 1]))
        } break
        case OP_ROLL: {
          const n = decodeNum(pop())
          if (n.neg || Number(n.num) >= stack.length) throw new Error('OP_ROLL failed, out of range')
          stack.push(stack.splice(stack.length - Number(n.num) - 1, 1)[0])
        } break
        case OP_ROT: { const x3 = pop(); const x2 = pop(); const x1 = pop(); stack.push(x2, x3, x1) } break
        case OP_SWAP: { const x2 = pop(); const x1 = pop(); stack.push(x2, x1) } break
        case OP_TUCK: { const x2 = pop(); const x1 = pop(); stack.push(x2, x1, x2) } break
        case OP_2DROP: pop(); pop(); break
        case OP_2DUP: { const x2 = pop(); const x1 = pop(); stack.push(x1, x2, x1, x2) } break
        case OP_3DUP: { const x3 = pop(); const x2 = pop(); const x1 = pop(); stack.push(x1, x2, x3, x1, x2, x3) } break
        case OP_2OVER: {
          const x4 = pop(); const x3 = pop(); const x2 = pop(); const x1 = pop()
          stack.push(x1, x2, x3, x4, x1, x2)
        } break
        case OP_2ROT: {
          const x6 = pop(); const x5 = pop(); const x4 = pop(); const x3 = pop(); const x2 = pop(); const x1 = pop()
          stack.push(x3, x4, x5, x6, x1, x2)
        } break
        case OP_2SWAP: {
          const x4 = pop(); const x3 = pop(); const x2 = pop(); const x1 = pop()
          stack.push(x3, x4, x1, x2)
        } break
        case OP_CAT: { const x2 = pop(); const x1 = pop(); stack.push(Array.from([...x1, ...x2])) } break
        case OP_SPLIT: {
          const n = decodeNum(pop())
          const x = pop()
          if (n.neg || Number(n.num) > x.length) throw new Error('OP_SPLIT failed, out of range')
          stack.push(x.slice(0, Number(n.num)), x.slice(Number(n.num)))
        } break
        case OP_SIZE: { const x = pop(); stack.push(x); stack.push(encodeNum(x.length)) } break
        case OP_INVERT: stack.push(pop().map(ai => ai ^ 0xFF)); break
        case OP_AND: {
          const a = pop(); const b = pop()
          if (a.length !== b.length) throw new Error('OP_AND failed, different sizes')
          stack.push(a.map((ai, i) => ai & b[i]))
        } break
        case OP_OR: {
          const a = pop(); const b = pop()
          if (a.length !== b.length) throw new Error('OP_OR failed, different sizes')
          stack.push(a.map((ai, i) => ai | b[i]))
        } break
        case OP_XOR: {
          const a = pop(); const b = pop()
          if (a.length !== b.length) throw new Error('OP_XOR failed, different sizes')
          stack.push(a.map((ai, i) => ai ^ b[i]))
        } break
        case OP_EQUAL: {
          const a = pop(); const b = pop()
          const equal = a.length === b.length && !a.some((ai, i) => ai !== b[i])
          stack.push(encodeNum(equal ? 1 : 0))
        } break
        case OP_EQUALVERIFY: {
          const a = pop(); const b = pop()
          const equal = a.length === b.length && !a.some((ai, i) => ai !== b[i])
          if (!equal) throw new Error('\'OP_EQUALVERIFY failed"')
        } break
        case OP_LSHIFT : {
          const n = decodeNum(pop())
          if (n.neg) throw new Error('OP_LSHIFT failed, n negative')
          stack.push(lshift(pop(), Number(n.num)))
        } break
        case OP_RSHIFT : {
          const n = decodeNum(pop())
          if (n.neg) throw new Error('OP_RSHIFT failed, n negative')
          stack.push(rshift(pop(), Number(n.num)))
        } break
        case OP_1ADD: stack.push(encodeNum(addNum(decodeNum(pop()), { num: BigInt(1), neg: false }))); break
        case OP_1SUB: stack.push(encodeNum(addNum(decodeNum(pop()), { num: BigInt(1), neg: true }))); break
        case OP_NEGATE: { const n = decodeNum(pop()); stack.push(encodeNum({ num: n.num, neg: !n.neg })) } break
        case OP_ABS: { const n = decodeNum(pop()); stack.push(encodeNum(n.num)) } break
        case OP_NOT: { const n = decodeNum(pop()); stack.push(n.num === BigInt(0) ? encodeNum(1) : encodeNum(0)) } break
        case OP_0NOTEQUAL: { const n = decodeNum(pop()); stack.push(n.num === BigInt(0) ? encodeNum(0) : encodeNum(1)) } break
        case OP_ADD: stack.push(encodeNum(addNum(decodeNum(pop()), decodeNum(pop())))); break
        case OP_SUB: stack.push(encodeNum(subNum(decodeNum(pop()), decodeNum(pop())))); break
        case OP_MUL: { const b = decodeNum(pop()); const a = decodeNum(pop()); stack.push(encodeNum(a.num * b.num, a.neg !== b.neg)) } break
        case OP_DIV: {
          const b = decodeNum(pop()); const a = decodeNum(pop())
          if (b.num === BigInt(0)) throw new Error('OP_DIV failed, divide by 0')
          stack.push(encodeNum(a.num / b.num, a.neg !== b.neg))
        } break
        case OP_MOD: {
          const b = decodeNum(pop()); const a = decodeNum(pop())
          if (b.num === BigInt(0)) throw new Error('OP_DIV failed, divide by 0')
          stack.push(encodeNum(a.num % b.num, a.neg))
        } break
        case OP_BOOLAND: { const a = popBool(); const b = popBool(); stack.push(encodeNum(a && b ? 1 : 0)) } break
        case OP_BOOLOR: { const a = popBool(); const b = popBool(); stack.push(encodeNum(a || b ? 1 : 0)) } break
        case OP_NUMEQUAL: {
          const b = decodeNum(pop()); const a = decodeNum(pop())
          stack.push(encodeNum(a.num === b.num && a.neg === b.neg ? 1 : 0))
        } break
        case OP_NUMEQUALVERIFY: {
          const b = decodeNum(pop()); const a = decodeNum(pop())
          if (a.num !== b.num || a.neg !== b.neg) throw new Error('OP_NUMEQUALVERIFY failed')
        } break
        case OP_NUMNOTEQUAL: {
          const b = decodeNum(pop()); const a = decodeNum(pop())
          stack.push(encodeNum(a.num !== b.num || a.neg !== b.neg ? 1 : 0))
        } break
        case OP_LESSTHAN: stack.push(encodeNum(lessThan(decodeNum(pop()), decodeNum(pop())) ? 1 : 0)); break
        case OP_GREATERTHAN: stack.push(encodeNum(greaterThan(decodeNum(pop()), decodeNum(pop())) ? 1 : 0)); break
        case OP_LESSTHANOREQUAL: stack.push(encodeNum(lessThanOrEqual(decodeNum(pop()), decodeNum(pop())) ? 1 : 0)); break
        case OP_GREATERTHANOREQUAL: stack.push(encodeNum(greaterThanOrEqual(decodeNum(pop()), decodeNum(pop())) ? 1 : 0)); break
        case OP_MIN: {
          const b = decodeNum(pop()); const a = decodeNum(pop())
          stack.push(encodeNum(lessThan(b, a) ? a : b))
        } break
        case OP_MAX: {
          const b = decodeNum(pop()); const a = decodeNum(pop())
          stack.push(encodeNum(greaterThan(b, a) ? a : b))
        } break
        case OP_WITHIN: {
          const max = decodeNum(pop()); const min = decodeNum(pop()); const x = decodeNum(pop())
          stack.push(encodeNum(greaterThanOrEqual(min, x) && lessThan(max, x) ? 1 : 0))
        } break
        case OP_BIN2NUM: stack.push(encodeNum(decodeNum(pop()))); break
        case OP_NUM2BIN: {
          const m = decodeNum(pop())
          const narr = pop()
          const n = decodeNum(narr)
          const oor = m.neg || m.num < BigInt(1) || m.num < BigInt(narr.length) || m.num > BigInt(2147483647)
          if (oor) throw new Error('OP_NUM2BIN failed, out of range')
          const arr = Array.from(decodeHex(BigInt(n.num).toString(16)))
          for (let i = arr.length; i < Number(m.num); i++) arr.push(0x00)
          const full = arr[arr.length - 1] & 0x80
          if (full) arr.push(0x00)
          if (n.neg) { arr[arr.length - 1] |= n.neg ? 0x80 : 0x00 }
          stack.push(arr)
        } break
        case OP_RIPEMD160:
          if (async) {
            return ripemd160Async(pop()).then(x => stack.push(x))
          } else {
            stack.push(ripemd160(pop()))
            return
          }
        case OP_SHA1:
          if (async) {
            return sha1Async(pop()).then(x => stack.push(x))
          } else {
            stack.push(sha1(pop()))
            return
          }
        case OP_SHA256:
          if (async) {
            return sha256Async(pop()).then(x => stack.push(x))
          } else {
            stack.push(sha256(pop()))
            return
          }
        case OP_HASH160:
          if (async) {
            return sha256Async(pop()).then(x => ripemd160Async(x)).then(x => stack.push(x))
          } else {
            stack.push(ripemd160(sha256(pop())))
            return
          }
        case OP_HASH256:
          if (async) {
            return sha256Async(pop()).then(x => sha256Async(x)).then(x => stack.push(x))
          } else {
            stack.push(sha256(sha256(pop())))
            return
          }
        case OP_CODESEPARATOR: checkIndex = i + 1; break
        case OP_CHECKSIG:
        case OP_CHECKSIGVERIFY: {
          const pubkeybytes = pop()
          const pubkey = decodePublicKey(pubkeybytes)
          const signature = pop()
          const cleanedScript = lockScript.slice(checkIndex)

          const check = verified => {
            if (chunk.opcode === OP_CHECKSIG) {
              stack.push(encodeNum(verified ? 1 : 0))
            } else {
              if (!verified) throw new Error('OP_CHECKSIGVERIFY failed')
            }
          }

          if (async) {
            return verifyTxSignatureAsync(tx, vin, signature, pubkey, cleanedScript, parentSatoshis).then(check)
          } else {
            check(verifyTxSignature(tx, vin, signature, pubkey, cleanedScript, parentSatoshis))
          }
        } break
        case OP_CHECKMULTISIG:
        case OP_CHECKMULTISIGVERIFY: {
        // Pop the keys
          const total = decodeNum(pop())
          if (total.neg) throw new Error('OP_CHECKMULTISIG failed, out of range')
          const keys = []
          for (let i = 0; i < Number(total.num); i++) {
            const pubkey = decodePublicKey(pop())
            keys.push(pubkey)
          }

          // Pop the sigs
          const required = decodeNum(pop())
          if (required.neg || required.num > total.num) throw new Error('OP_CHECKMULTISIG failed, out of range')
          const sigs = []
          for (let i = 0; i < Number(required.num); i++) {
            sigs.push(pop())
          }

          // Pop one more off. This isn't used and can't be changed.
          pop()

          // Verify the sigs
          let key = 0
          let sig = 0
          let success = true
          const cleanedScript = lockScript.slice(checkIndex)

          const check = success => {
            if (chunk.opcode === OP_CHECKMULTISIG) {
              stack.push(encodeNum(success ? 1 : 0))
            } else {
              if (!success) throw new Error('OP_CHECKMULTISIGVERIFY failed')
            }
          }

          if (async) {
            return (async () => {
              while (sig < sigs.length) {
                if (key === keys.length) {
                  success = false
                  break
                }
                const verified = await verifyTxSignatureAsync(tx, vin, sigs[sig], keys[key], cleanedScript, parentSatoshis)
                if (verified) {
                  sig++
                }
                key++
              }
              return success
            })().then(check)
          } else {
            while (sig < sigs.length) {
              if (key === keys.length) {
                success = false
                break
              }
              const verified = verifyTxSignature(tx, vin, sigs[sig], keys[key], cleanedScript, parentSatoshis)
              if (verified) {
                sig++
              }
              key++
            }
            check(success)
          }
        } break
        case OP_NOP1: break
        case OP_NOP2: break
        case OP_NOP3: break
        case OP_NOP4: break
        case OP_NOP5: break
        case OP_NOP6: break
        case OP_NOP7: break
        case OP_NOP8: break
        case OP_NOP9: break
        case OP_NOP10: break
        default: throw new Error(`reserved opcode: ${chunk.opcode}`)
      }
    }

    function finish () {
      log.push([chunks[chunks.length-1], [...stack]])
      if (branchExec.length) throw new Error('ENDIF missing')
      if (!pop().some(x => x)) throw new Error('top of stack is false')

      return {
        chunks,
        stack: log[log.length-1][1],
        log: log,
      }
    }

    if (async) {
      return (async () => {
        while (i < chunks.length && !done) await step()
        return finish()
      })()
    } else {
      while (i < chunks.length && !done) step()
      return finish()
    }
  } catch (e) {
    if (async) {
      return Promise.reject(e)
    } else {
      throw e
    }
  }
}

const LSHIFT_MASK = [0xff, 0x7f, 0x3f, 0x1f, 0x0f, 0x07, 0x03, 0x01]

function lshift (arr, n) {
  const bitshift = n % 8
  const byteshift = Math.floor(n / 8)
  const mask = LSHIFT_MASK[bitshift]
  const overflowmask = mask ^ 0xFF
  const result = Array.from(arr.length).fill(0)
  for (let i = arr.length - 1; i >= 0; i--) {
    const k = i - byteshift
    if (k >= 0) {
      let val = arr[i] & mask
      val <<= bitshift
      result[k] |= val
    }
    if (k - 1 >= 0) {
      let carryval = arr[i] & overflowmask
      carryval >>= (8 - bitshift) % 8
      result[(k - 1)] |= carryval
    }
  }
  return result
}

const RSHIFT_MASK = [0xff, 0xfE, 0xfc, 0xf8, 0xf0, 0xe0, 0xc0, 0x80]

function rshift (arr, n) {
  const bitshift = n % 8
  const byteshift = Math.floor(n / 8)
  const mask = RSHIFT_MASK[bitshift]
  const overflowmask = mask ^ 0xFF
  const result = new Array(arr.length).fill(0)
  for (let i = 0; i < arr.length; i++) {
    const k = i + byteshift
    if (k < arr.length) {
      let val = arr[i] & mask
      val >>= bitshift
      result[k] |= val
    }
    if (k + 1 < arr.length) {
      let carryval = arr[i] & overflowmask
      carryval <<= (8 - bitshift) % 8
      result[k + 1] |= carryval
    }
  }
  return result
}

