import { promises as fs } from 'node:fs';
import path from 'node:path';
import { RegisteredVaultSchema, type RegisteredVault } from '@policy-pay/sdk';
import { z } from 'zod';

const ExecutionSchema = z.object({
  id: z.string(),
  vaultId: z.string(),
  planHashHex: z.string(),
  txDigest: z.string().optional(),
  status: z.enum(['PLANNED', 'EXECUTED', 'FAILED', 'SKIPPED']),
  reason: z.string().optional(),
  createdAtMs: z.number(),
  raw: z.any().optional(),
});

export type ExecutionRecord = z.infer<typeof ExecutionSchema>;

const StoreSchema = z.object({
  vaults: z.array(RegisteredVaultSchema),
  executions: z.array(ExecutionSchema),
});

type StoreData = z.infer<typeof StoreSchema>;

export class JsonStore {
  constructor(private readonly filePath: string) {}

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await this.write({ vaults: [], executions: [] });
    }
  }

  async listVaults(): Promise<RegisteredVault[]> {
    const data = await this.read();
    return data.vaults;
  }

  async upsertVault(vault: RegisteredVault): Promise<RegisteredVault> {
    const data = await this.read();
    const normalized = RegisteredVaultSchema.parse({
      ...vault,
      createdAtMs: vault.createdAtMs ?? Date.now(),
    });
    const index = data.vaults.findIndex((v) => v.vaultId === vault.vaultId);
    if (index >= 0) data.vaults[index] = normalized;
    else data.vaults.push(normalized);
    await this.write(data);
    return normalized;
  }

  async getVault(vaultId: string): Promise<RegisteredVault | undefined> {
    const data = await this.read();
    return data.vaults.find((v) => v.vaultId === vaultId);
  }

  async addExecution(record: ExecutionRecord): Promise<ExecutionRecord> {
    const data = await this.read();
    const normalized = ExecutionSchema.parse(record);
    data.executions.unshift(normalized);
    data.executions = data.executions.slice(0, 500);
    await this.write(data);
    return normalized;
  }

  async listExecutions(vaultId: string): Promise<ExecutionRecord[]> {
    const data = await this.read();
    return data.executions.filter((e) => e.vaultId === vaultId);
  }

  private async read(): Promise<StoreData> {
    const raw = await fs.readFile(this.filePath, 'utf-8');
    return StoreSchema.parse(JSON.parse(raw));
  }

  private async write(data: StoreData) {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }
}
