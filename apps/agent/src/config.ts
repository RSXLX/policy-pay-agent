import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  SUI_NETWORK: z.string().default('testnet'),
  SUI_FULLNODE_URL: z.string().url().default('https://fullnode.testnet.sui.io:443'),
  PACKAGE_ID: z.string().startsWith('0x'),
  COIN_TYPE: z.string().default('0x2::sui::SUI'),
  AGENT_PRIVATE_KEY: z.string().startsWith('suiprivkey'),
  AGENT_ADDRESS: z.string().startsWith('0x'),
  AGENT_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(10_000),
  AGENT_API_PORT: z.coerce.number().int().positive().default(8787),
  AGENT_STORE_PATH: z.string().default('./data/policy-pay-store.json'),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(): AppConfig {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
