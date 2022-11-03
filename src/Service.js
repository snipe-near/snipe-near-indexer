const configs = require('./config/configs')

const activityTypeEnum = Object.freeze({
	listing: 'listing',
})

class Service {
	constructor(repo, indexerQueue) {
		this.repo = repo
		this.indexerQueue = indexerQueue
	}

	_newListingData(marketplaceContractId, nftContractId, tokenId, ownerId, price, rawData) {
		return {
			marketplaceContractId,
			nftContractId,
			tokenId,
			ownerId,
			price,
			_raw: rawData,
		}
	}

	_parseJSON(data) {
		try {
			return JSON.parse(data)
		} catch (e) {
			return false
		}
	}

	_parseEVENTJSON(data) {
		const dataSplit = data.split('EVENT_JSON:')
		const jsonData = dataSplit[1]
		return this._parseJSON(jsonData)
	}

	_parseLog(log) {
		const result = this._parseJSON(log)
		if (result) return result
		return this._parseEVENTJSON(log)
	}

	_newComposeListingResult(blockHeight, timestamp, receiptId, predecessorId, receiverId) {
		return (listingData) => {
			return {
				blockHeight,
				timestamp,
				receiptId,
				predecessorId,
				receiverId,
				type: activityTypeEnum.listing,
				data: listingData,
			}
		}
	}

	_checkParasListing(receiverId, data) {
		if (receiverId !== configs.marketplaceContractIds.paras) return false
		if (data.type !== 'add_market_data') return false
		return this._newListingData(
			receiverId,
			data.params.nft_contract_id,
			data.params.token_id,
			data.params.owner_id,
			data.params.price,
			data
		)
	}

	_processLogs(blockHeight, timestamp, receiptId, predecessorId, receiverId, log) {
		const composeListingResult = this._newComposeListingResult(
			blockHeight,
			timestamp,
			receiptId,
			predecessorId,
			receiverId
		)
		const data = this._parseLog(log)

		const parasListing = this._checkParasListing(receiverId, data)
		if (parasListing) return composeListingResult(parasListing)

		return false
	}

	async handleStremerMessage(streamerMessage) {
		const blockHeight = streamerMessage.block.header.height
		const timestamp = parseInt(streamerMessage.block.header.timestamp / 10 ** 6)
		const shards = streamerMessage.shards

		const results = []
		for (const shard of shards) {
			for (const receiptExecutionOutcome of shard.receiptExecutionOutcomes) {
				const receiptId = receiptExecutionOutcome.receipt.receiptId
				const predecessorId = receiptExecutionOutcome.receipt.predecessorId
				const receiverId = receiptExecutionOutcome.receipt.receiverId
				for (const log of receiptExecutionOutcome.executionOutcome.outcome.logs) {
					const result = this._processLogs(
						blockHeight,
						timestamp,
						receiptId,
						predecessorId,
						receiverId,
						log
					)
					if (result) {
						results.push(result)
					}
				}
			}
		}

		if (results.length < 1) {
			return
		}

		console.log('Add to indexer queue', results)
		await this.indexerQueue.add({
			activities: results,
		})
	}
}

module.exports = Service
