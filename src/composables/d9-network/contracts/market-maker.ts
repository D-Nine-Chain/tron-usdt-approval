import { Keyring } from '@polkadot/api'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { ContractPromise } from '@polkadot/api-contract'
import type { u128 } from '@polkadot/types'
import BigNumber from 'bignumber.js'
import { Contracts } from '~/config/contracts'
import { getGasLimits } from '~/utils/contracts'

export const reserves = reactive<{ d9: BigNumber, usdt: BigNumber }>({
  d9: new BigNumber(0),
  usdt: new BigNumber(0),
})

/**
 * @throws {import('@polkadot/types/interfaces').DispatchError}
 */
export async function getLiquidity() {
  if (!api.value)
    return null
  const contract = new ContractPromise(api.value!, Contracts.MARKET_MAKER.abi, Contracts.MARKET_MAKER.address)
  const keyring = new Keyring({ type: 'sr25519' })
  const tempAccount = keyring.addFromMnemonic(mnemonicGenerate())
  const { result, output } = await contract.query.getCurrencyReserves(
    tempAccount.address,
    {
      gasLimit: getGasLimits().readLimit,
    },
  )
  if (result.isOk) {
    const ok = (output?.toJSON() as any)?.ok
    if (!ok)
      return null
    const [d9, usdt] = ok as [u128, u128]
    reserves.d9 = reduceTokenAmount(d9, 'D9')
    reserves.usdt = reduceTokenAmount(usdt, 'USDT')
    return toRaw(reserves)
  }
  else { throw result.asErr }
}

useIntervalFn(() => {
  getLiquidity().catch(console.warn)
}, 30000)

watch(api, async api => api && await getLiquidity())
