require('dotenv').config()
const express = require('express')
const { startStream } = require('near-lake-framework')
const Queue = require('bull')
const bodyParser = require('body-parser')
const Cache = require('./helpers/Cache')
const Database = require('./helpers/Database')
const Repository = require('./Repository')
const Service = require('./Service')
const configs = require('./config/configs')

const main = async () => {
	const database = new Database()
	await database.init()
	const cache = new Cache()
	await cache.init()

	const indexerQueue = new Queue('indexer', configs.redisUrl)

	const repository = new Repository(database, cache)
	const service = new Service(repository, indexerQueue)

	const server = express()
	server.use(bodyParser.urlencoded({ extended: true }))
	server.use(bodyParser.json())

	server.get('/', () => {
		res.send('ok')
	})

	server.listen(configs.port)
	console.log('App is running on port: ', configs.port)

	await startStream(configs.lakeConfig, service.handleStremerMessage.bind(service))
	console.log('Indexer is running')
}

main()
