# @digicat/ethereum-extract-contract-events

Extracts events from a particular contract from block or transaction logs.
Requires [Node.js](https://nodejs.org/en/) 8.6 or newer.

## Usage

```js
const extractContractEvents = require('@digicat/ethereum-extract-contract-events')

// Let's assume you can get a transaction receipt. It may include logs:
const receipt = await getTransactionReceipt('0xe9d7d2bc7b98b1e5090b9363453836ab89b290415e997acb8d773e4f46440c09')

const events = extractContractEvents({
  // ABI array of the contract (required).
  contractAbi: […],
  // Address of the contract. You'll get events emitted by this contract.
  contractAddress: '0xef3b47f7e4865c72565f448cc162945ea5bcdc1e',
  // Logs from a transaction receipt, or a block.
  logs: receipt.logs
})
```
