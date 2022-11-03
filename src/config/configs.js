module.exports = {
	nodeEnv: process.env.NODE_ENV || 'testnet',
	redisUrl: process.env.REDIS_URL,
	mongoUrl: process.env.MONGO_URL,
	lakeConfig: {
		s3BucketName:
			process.env.NODE_ENV === 'mainnet' ? 'near-lake-data-mainnet' : 'near-lake-data-testnet',
		s3RegionName: 'eu-central-1',
		startBlockHeight:
			(process.env.START_BLOCK_HEIGHT ? parseInt(process.env.START_BLOCK_HEIGHT) : null) ||
			77632946,
	},
}
