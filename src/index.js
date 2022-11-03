require('dotenv').config()
const express = require('express')
const { startStream } = require('near-lake-framework')
const bodyParser = require('body-parser')
const Cache = require('./helpers/Cache')
const Database = require('./helpers/Database')
const Repository = require('./Repository')
const Service = require('./Service')
const configs = require('./config/configs')

const handleStreamerMessage = async (streamerMessage) => {
	console.log(streamerMessage)
}

const main = async () => {
	const database = new Database()
	await database.init()
	const cache = new Cache()
	await cache.init()

	const repository = new Repository(database, cache)
	const service = new Service(repository)

	const server = express()
	server.use(bodyParser.urlencoded({ extended: true }))
	server.use(bodyParser.json())

	server.get('/', (_, _) => {
		res.send('ok')
	})

	const port = process.env.PORT || 5000
	server.listen(port)
	console.log('App is running on port: ', port)

	await startStream(configs.lakeConfig, handleStreamerMessage)
	console.log('Indexer is running')
}

main()
