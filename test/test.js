import test from 'ava'
import ganache from 'ganache-core'
import memdown from 'memdown'
import truffleContract from 'truffle-contract'
import compiledContract from './fixtures/EventEmitter.json'
import extractContractEvents from '..'

const provider = ganache.provider({
  accounts: [
    {balance: 10e18},
    {balance: 0}
  ],
  db: memdown(),
  mnemonic: 'i’ll be with you lost boys',
  locked: true
})

const [from] = Object.keys(provider.manager.state.accounts)

const pendingDeploy = (() => {
  const contract = truffleContract(compiledContract)
  contract.setProvider(provider)
  contract.defaults({from, gas: 4700000, gasPrice: 1})
  return contract.new()
})()

test.beforeEach(async t => {
  const contract = await pendingDeploy
  const {abi: contractAbi, address: contractAddress} = contract
  t.context = {
    contract,
    contractAbi,
    contractAddress,
    async emit (indexedValue = 1, regularValue = 2) {
      const {receipt: {logs}} = await contract.emit(indexedValue, regularValue)
      return {contractAbi, contractAddress, logs}
    },
    async emitAdditional (indexedValue = 1, regularValue = 2) {
      const {receipt: {logs}} = await contract.emitAdditional(indexedValue, regularValue)
      return {contractAbi, contractAddress, logs}
    }
  }
})

test('extracts events', async t => {
  const events = extractContractEvents(await t.context.emit(1, 2))
  t.true(events.length === 1)
  t.is(events[0].eventName, 'Emitted')
  t.is(events[0].args.indexedValue.toNumber(), 1)
  t.is(events[0].args.regularValue.toNumber(), 2)

  const additional = extractContractEvents(await t.context.emitAdditional(1, 2))
  t.true(additional.length === 2)
  t.is(additional[0].eventName, 'Emitted')
  t.is(additional[0].args.indexedValue.toNumber(), 1)
  t.is(additional[0].args.regularValue.toNumber(), 2)
  t.is(additional[1].eventName, 'Additional')
  t.is(additional[1].args.indexedValue.toNumber(), 1)
  t.is(additional[1].args.regularValue.toNumber(), 2)
})

test('caches parser', async t => {
  const result = await t.context.emit()
  extractContractEvents(result)
  extractContractEvents(result)
  t.pass() // Here for code coverage.
})

test('bails out if logs are empty', t => {
  const {contractAbi, contractAddress} = t.context
  t.deepEqual(extractContractEvents({
    contractAbi,
    contractAddress,
    logs: []
  }), [])
})

test('bails out if there are no logs for the given address', async t => {
  const {contractAbi, contractAddress} = t.context
  const {logs} = await t.context.emit()
  t.not(contractAddress, '0xdecafbaddecafbaddecafbaddecafaddecafbad0')
  t.deepEqual(extractContractEvents({
    contractAbi,
    contractAddress: '0xdecafbaddecafbaddecafbaddecafaddecafbad0',
    logs
  }), [])
})

test('ignores events that do not match the ABI', async t => {
  const {contractAbi, contractAddress} = t.context
  const {logs} = await t.context.emit()
  t.deepEqual(extractContractEvents({
    contractAbi: contractAbi.map(item => item.type === 'event' ? {...item, name: 'Mismatched'} : item),
    contractAddress,
    logs
  }), [])
})
