import { loadConfig } from './config.js';
import { JsonStore } from './db/store.js';
import { logger } from './logger.js';
import { createServer } from './server.js';
import { createSuiClient } from './sui/client.js';
import { loadAgentKeypair } from './sui/keypair.js';
import { startWorker } from './worker.js';

const config = loadConfig();
const store = new JsonStore(config.AGENT_STORE_PATH);
await store.init();

const client = createSuiClient(config);
const signer = loadAgentKeypair(config.AGENT_PRIVATE_KEY);
const signerAddress = signer.toSuiAddress();

if (signerAddress.toLowerCase() !== config.AGENT_ADDRESS.toLowerCase()) {
  logger.warn(
    { envAddress: config.AGENT_ADDRESS, signerAddress },
    'AGENT_ADDRESS does not match AGENT_PRIVATE_KEY-derived address',
  );
}

const ctx = { store, client, signer };

startWorker(ctx, config.AGENT_POLL_INTERVAL_MS);

const server = createServer(ctx);
await server.listen({ port: config.AGENT_API_PORT, host: '0.0.0.0' });
logger.info({ port: config.AGENT_API_PORT, signerAddress }, 'PolicyPay agent started');
