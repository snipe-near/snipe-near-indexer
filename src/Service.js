const configs = require('./config/configs')

const activityTypeEnum = Object.freeze({
	listing: 'listing',
	snipe: 'snipe',
	deleteSnipe: 'delete_snipe',
	buyToken: 'buy_token',
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

	_newComposeResult(blockHeight, timestamp, receiptId, predecessorId, receiverId) {
		return (type, data) => {
			return {
				blockHeight,
				timestamp,
				receiptId,
				predecessorId,
				receiverId,
				type,
				data,
			}
		}
	}

	_watchParasListing(receiverId, data) {
		if (receiverId !== configs.marketplaceContractIds.paras) return false
		if (data.type !== 'add_market_data') return false

		return {
			type: activityTypeEnum.listing,
			result: this._newListingData(
				receiverId,
				data.params.nft_contract_id,
				data.params.token_id,
				data.params.owner_id,
				data.params.price,
				data
			),
		}
	}

	_watchMintbaseListing(receiverId, data) {
		if (receiverId !== configs.marketplaceContractIds.mintbase) return false
		if (data.event !== 'nft_list') return false
		if (data.data.currency !== 'near') return false

		return {
			type: activityTypeEnum.listing,
			result: this._newListingData(
				receiverId,
				data.data.nft_contract_id,
				data.data.nft_token_id,
				data.data.nft_owner_id,
				data.data.price,
				data
			),
		}
	}

	_watchSnipeNear(receiverId, data) {
		if (receiverId !== configs.snipeNearContractId) return false
		if (data.standard !== 'snipe_near') return false

		if (data.event === activityTypeEnum.snipe) {
			return {
				type: activityTypeEnum.snipe,
				result: {
					snipeId: data.data.snipe_id,
					accountId: data.data.account_id,
					contractId: data.data.contract_id,
					tokenId: data.data.token_id || null,
					deposit: data.data.deposit,
					status: data.data.status.toLowerCase(),
					memo: data.data.memo || null,
				},
			}
		}

		if (data.event === activityTypeEnum.deleteSnipe) {
			return {
				type: activityTypeEnum.deleteSnipe,
				result: {
					snipeId: data.data.snipe_id,
					accountId: data.data.account_id,
				},
			}
		}

		if (data.event === activityTypeEnum.buyToken) {
			return {
				type: activityTypeEnum.buyToken,
				result: {
					marketplaceContractId: data.data.marketplace_contract_id,
					price: data.data.price,
					snipeId: data.data.snipe_id,
					tokenId: data.data.token_id,
					status: data.data.status.toLowerCase(),
					accountId: data.data.account_id,
				},
			}
		}
	}

	_processLogs(blockHeight, timestamp, receiptId, predecessorId, receiverId, log) {
		const composeResult = this._newComposeResult(
			blockHeight,
			timestamp,
			receiptId,
			predecessorId,
			receiverId
		)
		const data = this._parseLog(log)

		// marketplaces
		const parasListing = this._watchParasListing(receiverId, data)
		if (parasListing) return composeResult(parasListing.type, parasListing.result)
		const mintbaseListing = this._watchMintbaseListing(receiverId, data)
		if (mintbaseListing) return composeResult(mintbaseListing.type, mintbaseListing.result)

		// snipe near
		const snipeNear = this._watchSnipeNear(receiverId, data)
		if (snipeNear) return composeResult(snipeNear.type, snipeNear.result)

		return false
	}

	async handleStremerMessage(streamerMessage) {
		const blockHeight = streamerMessage.block.header.height
		const timestamp = parseInt(streamerMessage.block.header.timestamp / 10 ** 6)
		const shards = streamerMessage.shards
		console.log('BlockHeight: ', blockHeight)

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
