import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { AppConfig } from '../config.js';

export function createSuiClient(config: AppConfig) {
  return new SuiGrpcClient({
    network: config.SUI_NETWORK as never,
    baseUrl: config.SUI_FULLNODE_URL,
  });
}

export type SuiClient = ReturnType<typeof createSuiClient>;
