import { client } from "./apollo/client";
import { CURRENT_GLOBAL_DATA, GLOBAL_DATA } from "./apollo/queries";
import { getBlockFromTimestamp } from "./blocks/queries";
import {
  CurrentFactoriesQuery,
  CurrentFactoriesQueryVariables,
  FactoriesQuery,
  FactoriesQueryVariables,
} from "./generated/subgraph";

export type GlobalData = {
  total_liquidity_BNB: string;
  total_liquidity_USD: string;
  total_volume_BNB: string;
  total_volume_USD: string;
  volume_BNB: string;
  volume_USD: string;
  tx_count: number;
};
export const FACTORY_ADDRESS = "0x15Ac679f35e1aD6B34f69d1F8113124C5ca06644";
export const SKIP_BLOCKS = 200;
export const BLOCK_TIME = 3;

export async function getGlobalData(): Promise<GlobalData> {
  const epochSecond = Math.round(new Date().getTime() / 1000);
  const oneDayAgoBlock = await getBlockFromTimestamp(
    epochSecond - 86400 - SKIP_BLOCKS * BLOCK_TIME
  );

  if (!oneDayAgoBlock) {
    throw new Error("Failed to fetch blocks from the subgraph");
  }

  const { data: currentResult, errors: currentResultErrors } = await client.query<
    CurrentFactoriesQuery,
    CurrentFactoriesQueryVariables
  >({
    query: CURRENT_GLOBAL_DATA,
    variables: {
      factoryAddress: FACTORY_ADDRESS,
    },
    fetchPolicy: "network-only",
  });

  if (currentResultErrors && currentResultErrors.length > 0) {
    throw new Error("Failed to fetch current uniswap factories from subgraph");
  }

  const { data: oneDayAgoResult, errors: oneDayAgoResultErrors } = await client.query<
    FactoriesQuery,
    FactoriesQueryVariables
  >({
    query: GLOBAL_DATA,
    variables: {
      factoryAddress: FACTORY_ADDRESS,
      blockNumber: +oneDayAgoBlock,
    },
    fetchPolicy: "network-only",
  });

  if (oneDayAgoResultErrors && oneDayAgoResultErrors.length > 0) {
    throw new Error("Failed to fetch one day ago uniswap factories from subgraph");
  }

  const currentData = currentResult.factories[0];
  const oneDayAgoData = oneDayAgoResult.factories[0];

  const oneDayVolumeBNB =
    parseFloat(currentData.totalVolumeBNB) - parseFloat(oneDayAgoData.totalVolumeBNB);
  const oneDayVolumeUSD =
    parseFloat(currentData.totalVolumeUSD) - parseFloat(oneDayAgoData.totalVolumeUSD);
  const oneDayTxCount = parseInt(currentData.totalTransactions) - parseInt(oneDayAgoData.totalTransactions);

  // return data
  let data = <GlobalData>{};
  data.total_liquidity_BNB = currentData.totalLiquidityBNB;
  data.total_liquidity_USD = currentData.totalLiquidityUSD;
  data.total_volume_BNB = currentData.totalVolumeBNB;
  data.total_volume_USD = currentData.totalVolumeUSD;
  data.volume_BNB = oneDayVolumeBNB.toString();
  data.volume_USD = oneDayVolumeUSD.toString();
  data.tx_count = oneDayTxCount;

  return data;
}