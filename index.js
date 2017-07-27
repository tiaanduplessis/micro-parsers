'use strict'

const getRawBody = require('raw-body')
const typer = require('media-typer')

const rawBodyMap = new WeakMap()

const createError = (code, message, original) => {
  const err = new Error(message)

  err.statusCode = code
  err.originalError = original

  return err
}

const parseJSON = str => {
  try {
    return JSON.parse(str)
  } catch (err) {
    throw createError(400, 'Invalid JSON', err)
  }
}

exports.buffer = (req, { limit = '1mb', encoding } = {}) =>
  Promise.resolve().then(() => {
    const type = req.headers['content-type'] || 'text/plain'
    const length = req.headers['content-length']

    if (encoding === undefined) {
      encoding = typer.parse(type).parameters.charset
    }

    const body = rawBodyMap.get(req)

    if (body) {
      return body
    }

    return getRawBody(req, { limit, length, encoding })
      .then(buf => {
        rawBodyMap.set(req, buf)
        return buf
      })
      .catch(err => {
        if (err.type === 'entity.too.large') {
          throw createError(413, `Body exceeded ${limit} limit`, err)
        } else {
          throw createError(400, 'Invalid body', err)
        }
      })
  })

exports.text = (req, { limit, encoding } = {}) =>
  exports.buffer(req, { limit, encoding }).then(body => body.toString(encoding))

exports.json = (req, opts) =>
  exports.text(req, opts).then(body => parseJSON(body))
