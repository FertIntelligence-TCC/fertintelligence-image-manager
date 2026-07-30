const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
require('dotenv').config()

const defaultIds = [
  '6a2de83dc3f06580e36573e1',
  '6a55d1c85ce25171423ec0d4',
  '6a152c3d78dca49209af1269'
]

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : defaultIds

const configuredCollection = 'images'

const isCandidateCollection = (name) =>
  name === configuredCollection ||
  /image|imagem|photo|foto/i.test(name) ||
  name.endsWith('.files')

async function main () {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined')
  }

  await mongoose.connect(process.env.MONGODB_URI)

  const db = mongoose.connection.db
  const collections = await db.listCollections({}, { nameOnly: true }).toArray()
  const names = collections.map(({ name }) => name).sort()
  const candidates = names.filter(isCandidateCollection)
  const gridFsCollections = names.filter(
    (name) => name.endsWith('.files') || name.endsWith('.chunks')
  )

  console.log(`database=${db.databaseName}`)
  console.log('collections:')
  for (const name of names) console.log(`- ${name}`)

  console.log('candidate collections:')
  if (!candidates.length) console.log('- none')
  for (const name of candidates) console.log(`- ${name}`)

  console.log('gridfs-compatible collections:')
  if (!gridFsCollections.length) console.log('- none')
  for (const name of gridFsCollections) console.log(`- ${name}`)

  for (const id of ids) {
    console.log(`id=${id}`)

    if (!ObjectId.isValid(id)) {
      console.log('- invalid ObjectId')
      continue
    }

    let found = false
    const objectId = new ObjectId(id)

    for (const collectionName of candidates) {
      const collection = db.collection(collectionName)
      const asObjectId = await collection.findOne(
        { _id: objectId },
        { projection: { _id: 1 } }
      )
      const asString = await collection.findOne(
        { _id: id },
        { projection: { _id: 1 } }
      )

      if (asObjectId) {
        console.log(`- found collection=${collectionName} type=ObjectId`)
        found = true
      }

      if (asString) {
        console.log(`- found collection=${collectionName} type=string`)
        found = true
      }
    }

    if (!found) console.log('- not found in candidate collections')
  }
}

main()
  .catch((error) => {
    console.error(`technical-error=${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
