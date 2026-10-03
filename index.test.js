const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { Readable } = require('stream')
const vm = require('vm')
const parsers = require('./')

const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')

// Load an isolated cache with a precise raw-body seam, without changing exports.
const withReader = reader => {
  const exports = {}
  vm.runInNewContext(source, {
    exports,
    require: name => name === 'raw-body' ? reader : require(name)
  })
  return exports
}

const request = (body, type, length) => {
  const req = new Readable({
    read () {
      if (body.length) this.push(body)
      this.push(null)
    }
  })
  req.headers = {}
  if (type) req.headers['content-type'] = type
  if (length !== undefined) req.headers['content-length'] = String(length)
  return req
}

// A regression must fail instead of waiting forever on an already-ended stream.
const bounded = promise => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Parser did not settle')), 500)
  promise.then(value => {
    clearTimeout(timer)
    resolve(value)
  }, err => {
    clearTimeout(timer)
    reject(err)
  })
})

const rejects = (promise, check) => bounded(promise).then(() => {
  throw new Error('Expected a rejection')
}, check)

const invalidJSON = err => {
  assert.strictEqual(err.statusCode, 400)
  assert.strictEqual(err.message, 'Invalid JSON')
  assert.strictEqual(err.originalError.name, 'SyntaxError')
}

test('exports all three parsers', () => {
  ;['buffer', 'text', 'json'].forEach(name => {
    assert.strictEqual(typeof parsers[name], 'function')
  })
})

;['utf-8', 'iso-8859-1'].forEach(charset => {
  test(`reuses an empty decoded body after the request ends (${charset})`, () => {
    const req = request('', `text/plain; charset=${charset}`, 0)
    let ended = false
    req.once('end', () => { ended = true })
    return bounded(parsers.buffer(req)).then(body => {
      assert.strictEqual(body, '')
      assert.strictEqual(ended, true)
      return bounded(parsers.text(req))
    }).then(body => {
      assert.strictEqual(body, '')
      return rejects(parsers.json(req), invalidJSON)
    }).then(() => bounded(parsers.buffer(req))).then(body => {
      assert.strictEqual(body, '')
    })
  })
})

const orders = [
  ['buffer', 'text', 'json'], ['buffer', 'json', 'text'],
  ['text', 'buffer', 'json'], ['text', 'json', 'buffer'],
  ['json', 'buffer', 'text'], ['json', 'text', 'buffer']
]

;[false, true].forEach(decoded => {
  ;['', '{"price":9.99}'].forEach(body => {
    orders.forEach(order => {
      test(`caches ${body ? 'nonempty' : 'empty'} ${decoded ? 'strings' : 'Buffers'} through ${order.join('/')}`, () => {
        const type = decoded ? 'application/json; charset=utf-8' : 'application/json'
        const req = request(Buffer.from(body), type)
        let firstBuffer
        return order.concat('buffer', 'buffer').reduce((previous, name) => previous.then(() => {
          const result = parsers[name](req)
          if (name === 'json' && !body) return rejects(result, invalidJSON)
          return bounded(result).then(value => {
            if (name === 'json') {
              assert.deepStrictEqual(value, { price: 9.99 })
            } else if (name === 'buffer' && !decoded) {
              assert.strictEqual(Buffer.isBuffer(value), true)
              assert.strictEqual(value.toString(), body)
              if (firstBuffer) assert.strictEqual(value, firstBuffer)
              firstBuffer = value
            } else {
              assert.strictEqual(value, body)
            }
          })
        }), Promise.resolve())
      })
    })
  })
})

;['', 'hello', Buffer.from(''), Buffer.from('hello')].forEach((body, index) => {
  test(`reads cached body only once (fixture ${index})`, () => {
    let calls = 0
    const reader = withReader(() => {
      calls++
      return Promise.resolve(body)
    })
    const req = { headers: { 'content-type': 'text/plain; charset=utf-8' } }
    return reader.buffer(req).then(value => {
      assert.strictEqual(value, body)
      return reader.text(req)
    }).then(value => {
      assert.strictEqual(value, body.toString())
      return reader.buffer(req)
    }).then(value => {
      assert.strictEqual(value, body)
      assert.strictEqual(calls, 1)
    })
  })
})

test('keeps separate request caches isolated', () => {
  let calls = 0
  const reader = withReader(() => Promise.resolve(calls++ === 0 ? '' : 'second'))
  const first = { headers: {} }
  const second = { headers: {} }
  return reader.text(first).then(value => {
    assert.strictEqual(value, '')
    return reader.text(second)
  }).then(value => {
    assert.strictEqual(value, 'second')
    return reader.text(first)
  }).then(value => {
    assert.strictEqual(value, '')
    return reader.text(second)
  }).then(value => {
    assert.strictEqual(value, 'second')
    assert.strictEqual(calls, 2)
  })
})

test('preserves explicit encoding and default Buffer results', () => {
  const req = request(Buffer.from([0xe9]), 'text/plain')
  return bounded(parsers.buffer(req, { encoding: 'latin1' })).then(value => {
    assert.strictEqual(value, 'é')
    return bounded(parsers.text(req, { encoding: 'latin1' }))
  }).then(value => {
    assert.strictEqual(value, 'é')
    return bounded(parsers.buffer(request(Buffer.from([0xe9]))))
  }).then(value => {
    assert.strictEqual(Buffer.isBuffer(value), true)
    assert.strictEqual(value[0], 0xe9)
  })
})

test('preserves malformed JSON errors and caches the successfully read body', () => {
  const req = request('{broken', 'application/json; charset=utf-8')
  return rejects(parsers.json(req), invalidJSON)
    .then(() => rejects(parsers.json(req), invalidJSON))
    .then(() => bounded(parsers.text(req)))
    .then(body => assert.strictEqual(body, '{broken'))
})

;[undefined, 4].forEach(length => {
  test(`preserves the body limit error (content-length ${length})`, () => {
    const req = request('four', 'text/plain; charset=utf-8', length)
    return rejects(parsers.buffer(req, { limit: 3 }), err => {
      assert.strictEqual(err.statusCode, 413)
      assert.strictEqual(err.message, 'Body exceeded 3 limit')
      assert.strictEqual(err.originalError.type, 'entity.too.large')
    })
  })
})

test('preserves content-length mismatch errors', () => {
  const req = request('a', 'text/plain', 2)
  return rejects(parsers.buffer(req), err => {
    assert.strictEqual(err.statusCode, 400)
    assert.strictEqual(err.message, 'Invalid body')
    assert.strictEqual(err.originalError.type, 'request.size.invalid')
  })
})

test('preserves stream errors', () => {
  const original = new Error('fixture stream failure')
  const req = new Readable({ read () { this.emit('error', original) } })
  req.headers = {}
  return rejects(parsers.buffer(req), err => {
    assert.strictEqual(err.statusCode, 400)
    assert.strictEqual(err.message, 'Invalid body')
    assert.strictEqual(err.originalError, original)
  })
})

;[undefined, 'entity.too.large'].forEach(type => {
  test(`does not cache a failed read (${type || 'stream error'})`, () => {
    const original = new Error('fixture read failure')
    original.type = type
    let calls = 0
    const reader = withReader((req, opts) => {
      assert.deepStrictEqual(Object.assign({}, opts), { limit: '2kb', length: '0', encoding: 'utf-8' })
      calls++
      return calls === 1 ? Promise.reject(original) : Promise.resolve('')
    })
    const req = { headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': '0' } }
    return rejects(reader.text(req, { limit: '2kb' }), err => {
      assert.strictEqual(err.statusCode, type ? 413 : 400)
      assert.strictEqual(err.message, type ? 'Body exceeded 2kb limit' : 'Invalid body')
      assert.strictEqual(err.originalError, original)
    }).then(() => reader.text(req, { limit: '2kb' })).then(value => {
      assert.strictEqual(value, '')
      return reader.text(req, { limit: '2kb' })
    }).then(value => {
      assert.strictEqual(value, '')
      assert.strictEqual(calls, 2)
    })
  })
})
