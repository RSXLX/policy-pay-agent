import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'testnet';

const GRPC_URLS: Record<string, string> = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
  localnet: 'http://127.0.0.1:9000',
};

export const dAppKit = createDAppKit({
  networks: [NETWORK],
  defaultNetwork: NETWORK,
  createClient: (network) =>
    new SuiGrpcClient({
      network: network as never,
      baseUrl: GRPC_URLS[network] ?? GRPC_URLS.testnet!,
    }),
  enableBurnerWallet: NETWORK === 'localnet',
});

declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
