module.exports = {
	port: process.env.PORT || 5000,
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
	marketplaceContractIds: {
		paras:
			process.env.NODE_ENV === 'mainnet'
				? 'marketplace.paras.near'
				: 'paras-marketplace-v1.testnet',
		mintbase:
			process.env.NODE_ENV === 'mainnet'
				? 'market.mintbase1.near'
				: 'market-v2-beta.mintspace2.testnet',
	},
	snipeNearContractId: process.env.SNIPE_NEAR_CONTRACT_ID,
}
