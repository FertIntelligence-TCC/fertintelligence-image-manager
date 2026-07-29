const mongoose = require('mongoose')
require('dotenv').config()

const { createApp } = require('./app')

const PORT = process.env.PORT || 8081
const bdUrl = process.env.MONGODB_URI

if (!bdUrl) {
  throw new Error('MONGODB_URI is required')
}

const schema = new mongoose.Schema({ image: String })
const imageModel = mongoose.model('Image', schema)
const app = createApp({ imageModel })

mongoose.connect(bdUrl)
  .then(() => {
    console.log('Connected to DB')
    app.listen(PORT, '0.0.0.0', () => console.log('Server is running at ' + PORT))
  })
  .catch(() => {
    console.error('Could not connect to DB')
    process.exitCode = 1
  })
