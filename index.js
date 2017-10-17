'use strict'

const createKeccakHash = require('keccak')
const solidityCoder = require('web3/lib/solidity/coder')

const entryParsers = new WeakMap()
function createEntryParser (contractAbi) {
  // Check if a parser has previously been created.
  if (entryParsers.has(contractAbi)) return entryParsers.get(contractAbi)

  const possibleEvents = contractAbi
    .filter(({anonymous, type}) => type === 'event' && !anonymous)
    .map(({inputs, name}) => {
      // Compute the hash of the event signature, to be compared against log
      // topics.
      const fullName = `${name}(${inputs.map(({type}) => type).join(',')})`
      const hash = `0x${createKeccakHash('keccak256').update(fullName).digest().toString('hex')}`

      // Create a function that can parse the remaining topics and data from
      // the log, equivalent to how web3 parses contract events.
      const parseArgs = createArgsParser(inputs)
      return {hash, name, parseArgs}
    })

  const parser = entry => {
    const match = possibleEvents.find(({hash}) => hash === entry.topics[0])
    if (!match) return null

    return {
      eventName: match.name,
      args: match.parseArgs(entry.topics, entry.data)
    }
  }

  entryParsers.set(contractAbi, parser)
  return parser
}

function createArgsParser (inputs) {
  // Indexed inputs are included in the log topics.
  const indexedInputs = inputs.filter(({indexed}) => indexed)
  const indexedNames = indexedInputs.map(({name}) => name)
  const indexedTypes = indexedInputs.map(({type}) => type)

  // Non-indexed inputs are included in the log data.
  const nonIndexedInputs = inputs.filter(({indexed}) => !indexed)
  const nonIndexedNames = nonIndexedInputs.map(({name}) => name)
  const nonIndexedTypes = nonIndexedInputs.map(({type}) => type)

  return (topics, data) => {
    // solidityCoder.decodeParams() expects a data string (without the 0x prefix).
    const indexedData = topics.slice(1).map(str => str.slice(2)).join('')
    const nonIndexedData = data.slice(2)

    const args = {}
    solidityCoder.decodeParams(indexedTypes, indexedData).forEach((value, offset) => {
      args[indexedNames[offset]] = value
    })
    solidityCoder.decodeParams(nonIndexedTypes, nonIndexedData).forEach((value, offset) => {
      args[nonIndexedNames[offset]] = value
    })
    return args
  }
}

function extractContractEvents ({contractAbi, contractAddress, logs}) {
  // Only extract events emitted by the contract the transaction was sent to.
  const entries = logs.filter(({address}) => address === contractAddress)
  if (entries.length === 0) return []

  const parseEntry = createEntryParser(contractAbi)
  // Parse entries, and silently discard unrecognized events.
  return logs.map(parseEntry).filter(parsed => parsed !== null)
}
module.exports = extractContractEvents
