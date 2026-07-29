const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const { createApp, parseAllowedOrigins } = require('../app')

const OFFICIAL = 'https://fertintelligence-client.onrender.com'
const LOCAL = 'http://localhost:5173'
const ID = '507f1f77bcf86cd799439011'
const build = (imageModel, allowedOriginsValue = `${LOCAL},${OFFICIAL}`) =>
  createApp({ imageModel, allowedOriginsValue })

const modelReturning = (value) => ({
  findOne: async () => value,
  deleteOne: async () => ({}),
  updateOne: async () => ({})
})

describe('CORS configuration', () => {
  test('allows the official frontend, localhost and a normalized trailing slash', async () => {
    const app = build(modelReturning({ image: 'data:image/png;base64,abc' }), `${LOCAL}/,${OFFICIAL}/`)
    for (const origin of [LOCAL, OFFICIAL]) {
      const response = await request(app).get(`/get/${ID}`).set('Origin', origin)
      assert.equal(response.status, 200)
      assert.equal(response.headers['access-control-allow-origin'], origin)
    }
  })

  test('blocks an external origin with 403 and no allow-origin header', async () => {
    const app = build(modelReturning({ image: 'x' }))
    const response = await request(app)
      .get(`/get/${ID}`)
      .set('Origin', 'https://example-malicious.invalid')
    assert.equal(response.status, 403)
    assert.equal(response.headers['access-control-allow-origin'], undefined)
  })

  test('allows a request without Origin', async () => {
    const response = await request(build(modelReturning({ image: 'x' }))).get('/health')
    assert.equal(response.status, 200)
  })

  test('answers preflight with the expected headers', async () => {
    const response = await request(build(modelReturning({ image: 'x' })))
      .options(`/get/${ID}`)
      .set('Origin', OFFICIAL)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
    assert.equal(response.status, 204)
    assert.equal(response.headers['access-control-allow-origin'], OFFICIAL)
    assert.match(response.headers['access-control-allow-methods'], /GET/)
    assert.match(response.headers['access-control-allow-headers'], /Authorization/)
  })

  test('requires a configured origin list and rejects wildcard', () => {
    assert.throws(() => parseAllowedOrigins(), /at least one origin/)
    assert.throws(() => parseAllowedOrigins(`*,${LOCAL}`), /must not contain/)
  })

  test('trims and deduplicates origins', () => {
    assert.deepEqual(parseAllowedOrigins(` ${LOCAL}/,${LOCAL}, ${OFFICIAL} `), [LOCAL, OFFICIAL])
  })
})

describe('GET /get/:id', () => {
  test('returns an existing image without changing its content', async () => {
    const document = { _id: ID, image: 'data:image/png;base64,abc' }
    const response = await request(build(modelReturning(document)))
      .get(`/get/${ID}`)
      .set('Origin', OFFICIAL)
    assert.equal(response.status, 200)
    assert.match(response.headers['content-type'], /application\/json/)
    assert.deepEqual(response.body, document)
  })

  test('returns 404 for a missing image', async () => {
    const response = await request(build(modelReturning(null))).get(`/get/${ID}`)
    assert.equal(response.status, 404)
  })

  test('returns 400 for an invalid id', async () => {
    const response = await request(build(modelReturning(null))).get('/get/not-an-object-id')
    assert.equal(response.status, 400)
  })

  test('returns 503 when MongoDB lookup fails', async () => {
    const model = {
      findOne: async () => { throw new Error('database unavailable') }
    }
    const response = await request(build(model)).get(`/get/${ID}`)
    assert.equal(response.status, 503)
  })
})
