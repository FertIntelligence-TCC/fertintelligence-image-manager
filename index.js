const express = require('express')
const { ObjectId } = require('mongodb')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config();

const PORT = process.env.PORT || 8081

const app = express()
const allowedOrigins = (process.env.IMAGE_MANAGER_ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true)
    }
    return callback(new Error('Origin not allowed by CORS'))
  }
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

const bd_url = process.env.MONGODB_URI
if (!bd_url) {
  throw new Error('MONGODB_URI is required')
}

mongoose.connect(bd_url)
  .then(() => {
    console.log('Connect to DB')
  }).catch((err) => {
    console.log(err)
  })

const schema = new mongoose.Schema({
  image: String
})
const imageModel = mongoose.model('Image', schema)

const isValidImagePayload = (value) => typeof value === 'string' && value.trim().length > 0
const getImageFromPayload = (body) => {
  if (isValidImagePayload(body?.image)) return body.image
  if (isValidImagePayload(body?.img)) return body.img
  return null
}

app.get('/', async (req, res) => {
  res.json({ message: 'Server running', data: res.statusCode })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/get/:id', async (req, res) => {
  if (ObjectId.isValid(req.params.id)) {
    imageModel.findOne({ _id: new ObjectId(req.params.id) }).then((doc) => {
      res.status(200).json(doc)
    })
      .catch(() => {
        res.status(500).json({ error: 'Could not fetch the document' })
      })
  } else {
    res.status(500).json({ error: 'Could not fetch the document' })
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
  } catch (error) {
    return res.status(500).json({ error: 'Could not persist uploaded image' })
  }
})

app.delete('/delete/:id', (req, res) => {
  if (ObjectId.isValid(req.params.id)) {
    imageModel
      .deleteOne({ _id: new ObjectId(req.params.id) })
      .then((result) => {
        res.status(200).json(result)
      })
      .catch(() => {
        res.status(500).json({ error: 'Could not delete document' })
      })
  } else {
    res.status(500).json({ error: 'Could not delete document' })
  }
})

app.patch('/update/:id', (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Could not update document' })
  }

  const image = getImageFromPayload(req.body)
  if (!image) {
    return res.status(400).json({ error: 'Missing required field: image or img' })
  }

  imageModel
    .updateOne({ _id: new ObjectId(req.params.id) }, { $set: { image } })
    .then((result) => {
      res.status(200).json(result)
    })
    .catch(() => {
      res.status(500).json({ error: 'Could not update document' })
    })
})

app.listen(PORT, '0.0.0.0', () => console.log('Server is running at ' + PORT))
