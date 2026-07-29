const express = require('express')
const { ObjectId } = require('mongodb')
const cors = require('cors')

const CORS_ENV_NAME = 'CORS_ALLOWED_ORIGINS'
const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
const ALLOWED_HEADERS = ['Content-Type', 'Authorization']

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, '')

const parseAllowedOrigins = (value) => {
  if (!value || !value.trim()) {
    throw new Error(`${CORS_ENV_NAME} must contain at least one origin`)
  }

  const origins = [...new Set(value.split(',').map(normalizeOrigin).filter(Boolean))]
  if (origins.includes('*')) {
    throw new Error(`${CORS_ENV_NAME} must not contain "*"`)
  }

  for (const origin of origins) {
    let parsed
    try {
      parsed = new URL(origin)
    } catch {
      throw new Error(`${CORS_ENV_NAME} contains an invalid origin`)
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(`${CORS_ENV_NAME} contains an invalid origin`)
    }
  }

  return origins
}

const createApp = ({ imageModel, allowedOriginsValue = process.env[CORS_ENV_NAME] }) => {
  const app = express()
  const allowedOrigins = parseAllowedOrigins(allowedOriginsValue)
  const corsOptions = {
    origin: true,
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS
  }

  app.use((req, res, next) => {
    const origin = req.get('Origin')
    if (origin && !allowedOrigins.includes(normalizeOrigin(origin))) {
      return res.status(403).json({ error: 'Origin not allowed by CORS' })
    }
    return next()
  })
  app.use(cors(corsOptions))
  app.options('*', cors(corsOptions))
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ extended: true, limit: '50mb' }))

  const isValidImagePayload = (value) => typeof value === 'string' && value.trim().length > 0
  const getImageFromPayload = (body) => {
    if (isValidImagePayload(body?.image)) return body.image
    if (isValidImagePayload(body?.img)) return body.img
    return null
  }

  app.get('/', (req, res) => {
    res.json({ message: 'Server running', data: res.statusCode })
  })

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/get/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid image id' })
    }

    try {
      const doc = await imageModel.findOne({ _id: new ObjectId(req.params.id) })
      if (!doc) {
        return res.status(404).json({ error: 'Image not found' })
      }
      return res.status(200).json(doc)
    } catch {
      return res.status(503).json({ error: 'Could not fetch the document' })
    }
  })

  app.post('/upload', async (req, res) => {
    const image = getImageFromPayload(req.body)
    if (!image) {
      return res.status(400).json({ error: 'Missing required field: image or img' })
    }

    try {
      const data = await new imageModel({ image }).save()
      return res.send({ data })
    } catch {
      return res.status(500).json({ error: 'Could not persist uploaded image' })
    }
  })

  app.delete('/delete/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid image id' })
    }
    try {
      return res.status(200).json(await imageModel.deleteOne({ _id: new ObjectId(req.params.id) }))
    } catch {
      return res.status(500).json({ error: 'Could not delete document' })
    }
  })

  app.patch('/update/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Could not update document' })
    }
    const image = getImageFromPayload(req.body)
    if (!image) {
      return res.status(400).json({ error: 'Missing required field: image or img' })
    }
    try {
      const result = await imageModel.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { image } }
      )
      return res.status(200).json(result)
    } catch {
      return res.status(500).json({ error: 'Could not update document' })
    }
  })

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    return res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

module.exports = { createApp, parseAllowedOrigins, normalizeOrigin, CORS_ENV_NAME }
