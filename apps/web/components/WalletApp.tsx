'use client';

import { DAppKitProvider, useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Gauge,
  KeyRound,
  Loader2,
  Pause,
  Play,
  Plus,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  buildAddRuleTx,
  buildCreateVaultTx,
  buildDepositTx,
  buildPauseTx,
  buildResumeTx,
  buildRevokeAgentTx,
  buildWithdrawTx,
  formatDateMs,
  shortAddress,
  SUI_COIN_TYPE,
  suiToMist,
} from '@policy-pay/sdk';
import { dAppKit } from '../app/dapp-kit';
import { extractDigest, findCreatedObjects } from '../lib/result';

const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0xTODO';
const network = process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'testnet';
const defaultCoinType = process.env.NEXT_PUBLIC_DEFAULT_COIN_TYPE ?? SUI_COIN_TYPE;
const agentApiUrl = process.env.NEXT_PUBLIC_AGENT_API_URL ?? 'http://localhost:8787';
const isPackageConfigured = isValidAddress(packageId);

type CreatedObject = {
  objectId: string;
  objectType?: string;
  owner?: any;
};

type ActivityItem = {
  id: string;
  type: 'payment' | 'system' | 'owner' | 'agent';
  tone: 'success' | 'info' | 'warning' | 'danger';
  title: string;
  description?: string;
  amount?: string;
  digest?: string;
  timestamp: number;
  raw?: any;
};

type RuleItem = {
  id: string;
  recipient: string;
  amount: string;
  periodSeconds: string;
  label: string;
  nextDueMs: number;
  digest?: string;
  active: boolean;
};

type VaultPolicy = {
  agentAddress: string;
  maxPerTx: number;
  maxPerWindow: number;
  windowMinutes: number;
  minReserve: number;
  expiresAtMs: number;
};

const defaultVaultPolicy: VaultPolicy = {
  agentAddress: '',
  maxPerTx: 0.2,
  maxPerWindow: 0.3,
  windowMinutes: 2,
  minReserve: 0.1,
  expiresAtMs: Date.now() + 24 * 3600_000,
};

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function explorerSuffix() {
  return network && network !== 'mainnet' ? `?network=${encodeURIComponent(network)}` : '';
}

function transactionUrl(digest: string) {
  return `https://suiexplorer.com/txblock/${digest}${explorerSuffix()}`;
}

function objectUrl(objectId: string) {
  return `https://suiexplorer.com/object/${objectId}${explorerSuffix()}`;
}

function objectLabel(objectType?: string) {
  if (!objectType) return 'Object';
  if (objectType.includes('AgentVault')) return 'AgentVault';
  if (objectType.includes('OwnerCap')) return 'OwnerCap';
  if (objectType.includes('AgentSessionCap')) return 'AgentSessionCap';
  return objectType.split('::').pop() ?? 'Object';
}

function pickObject(objects: CreatedObject[], name: string) {
  return objects.find((object) => object.objectType?.includes(name))?.objectId;
}

function nowLabel(ts: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function formatTransactionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Invalid package id')) {
    return 'Contract package id is not configured. Publish the Move package, then set NEXT_PUBLIC_PACKAGE_ID to the package object id.';
  }
  if (message.includes('Invalid') && message.toLowerCase().includes('address')) {
    return 'Enter a valid Sui address before signing.';
  }
  return message || 'Transaction failed before it was submitted.';
}

function isValidAddress(value: string) {
  if (!value || !value.startsWith('0x')) return false;
  try {
    return isValidSuiAddress(normalizeSuiAddress(value));
  } catch {
    return false;
  }
}

export function WalletApp() {
  return (
    <DAppKitProvider dAppKit={dAppKit}>
      <ProductShell />
    </DAppKitProvider>
  );
}

function ProductShell() {
  const account = useCurrentAccount();
  const [createOpen, setCreateOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [vaultId, setVaultId] = useState('');
  const [ownerCapId, setOwnerCapId] = useState('');
  const [sessionCapId, setSessionCapId] = useState('');
  const [vaultBalance, setVaultBalance] = useState(0);
  const [agentStatus, setAgentStatus] = useState<'active' | 'paused' | 'revoked'>('active');
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | ActivityItem['type']>('all');
  const [agentPlan, setAgentPlan] = useState<any>(null);
  const [vaultPolicy, setVaultPolicy] = useState<VaultPolicy>(defaultVaultPolicy);
  const [creationDigest, setCreationDigest] = useState<string | undefined>();

  const addActivity = (item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    setActivity((old) => [{ ...item, id: uid(), timestamp: Date.now() }, ...old].slice(0, 20));
  };

  const hasVault = Boolean(vaultId);
  const minReserve = vaultPolicy.minReserve;
  const maxPerTx = vaultPolicy.maxPerTx;
  const maxPerWindow = vaultPolicy.maxPerWindow;
  const availableBalance = Math.max(0, vaultBalance - minReserve);
  const activeRules = rules.filter((rule) => rule.active);

  const status = useMemo(() => {
    if (!account) return { className: 'warning', label: 'Wallet required' };
    if (!hasVault) return { className: 'warning', label: 'No agent yet' };
    if (agentStatus !== 'active') return { className: agentStatus, label: agentStatus };
    if (vaultBalance <= minReserve) return { className: 'warning', label: 'Needs funding' };
    if (activeRules.length === 0) return { className: 'warning', label: 'No rules' };
    return { className: 'active', label: 'Active' };
  }, [account, activeRules.length, agentStatus, hasVault, vaultBalance]);

  return (
    <div className="app-shell">
      <Topbar accountAddress={account?.address} />

      {!account ? (
        <Landing />
      ) : !hasVault ? (
        <NoAgentState onCreate={() => setCreateOpen(true)} accountAddress={account.address} />
      ) : (
        <Dashboard
          accountAddress={account.address}
          status={status}
          vaultId={vaultId}
          ownerCapId={ownerCapId}
          sessionCapId={sessionCapId}
          creationDigest={creationDigest}
          setVaultId={setVaultId}
          setOwnerCapId={setOwnerCapId}
          setSessionCapId={setSessionCapId}
          vaultBalance={vaultBalance}
          availableBalance={availableBalance}
          minReserve={minReserve}
          maxPerTx={maxPerTx}
          maxPerWindow={maxPerWindow}
          rules={rules}
          activity={activity}
          activityFilter={activityFilter}
          setActivityFilter={setActivityFilter}
          agentPlan={agentPlan}
          agentStatus={agentStatus}
          setAgentStatus={setAgentStatus}
          onDeposit={() => setDepositOpen(true)}
          onAddRule={() => setRuleOpen(true)}
          addActivity={addActivity}
          setAgentPlan={setAgentPlan}
        />
      )}

      <CreateVaultModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        accountAddress={account?.address}
        onCreated={(objects, digest, intent) => {
          const nextVaultId = pickObject(objects, 'AgentVault') ?? objects[0]?.objectId ?? '';
          const nextOwnerCapId = pickObject(objects, 'OwnerCap') ?? '';
          const nextSessionCapId = pickObject(objects, 'AgentSessionCap') ?? '';

          setVaultId(nextVaultId);
          setOwnerCapId(nextOwnerCapId);
          setSessionCapId(nextSessionCapId);
          setVaultPolicy(intent);
          setCreationDigest(digest);
          setVaultBalance(0);
          setAgentStatus('active');
          addActivity({
            type: 'system',
            tone: 'success',
            title: 'AgentVault created',
            description: `Agent ${shortAddress(intent.agentAddress)} received a scoped session cap.`,
            digest,
            raw: { objects, intent },
          });
        }}
      />

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        vaultId={vaultId}
        onDeposited={(amount, digest, raw) => {
          setVaultBalance((old) => old + Number(amount));
          addActivity({
            type: 'system',
            tone: 'success',
            title: 'Deposit confirmed',
            description: `${amount} SUI added to vault.`,
            amount: `+${Number(amount).toFixed(2)} SUI`,
            digest,
            raw,
          });
        }}
      />

      <RuleModal
        open={ruleOpen}
        onClose={() => setRuleOpen(false)}
        vaultId={vaultId}
        ownerCapId={ownerCapId}
        onRuleAdded={(rule, digest, raw) => {
          setRules((old) => [rule, ...old]);
          addActivity({
            type: 'system',
            tone: 'info',
            title: 'Payment rule added',
            description: `${rule.label} pays ${rule.amount} SUI every ${rule.periodSeconds}s.`,
            digest,
            raw,
          });
        }}
      />
    </div>
  );
}

function Topbar({ accountAddress }: { accountAddress?: string }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-cluster">
          <div className="logo-mark">
            <Shield size={18} />
          </div>
          <div className="brand-name">PolicyPay</div>
          <span className="network-pill">
            <span />
            Testnet
          </span>
        </div>
        <div className="topbar-actions">
          {accountAddress ? (
            <span className="wallet-pill">
              <span className="wallet-dot" />
              {shortAddress(accountAddress)}
            </span>
          ) : (
            <ConnectButton />
          )}
        </div>
      </div>
    </header>
  );
}

function Landing() {
  return (
    <main className="container landing-state fade-in">
      <section className="landing-hero">
        <h1>Autonomous payments, with onchain limits.</h1>
        <p className="subtitle">
          Set spending rules once. Your Sui payment agent executes only when your onchain policy allows it.
        </p>

        <div className="feature-grid">
          <FeatureCard
            icon={<ShieldCheck size={22} />}
            title="Policy-bound"
            description="The agent can never exceed the limits you set in the vault."
          />
          <FeatureCard
            icon={<FileText size={22} />}
            title="Onchain receipts"
            description="Every payment has a digest, events, and an execution record."
          />
          <FeatureCard
            icon={<Pause size={22} />}
            title="Pause anytime"
            description="Pause or revoke the session without moving treasury funds."
          />
        </div>

        <div className="explanation">
          <strong>PolicyPay</strong> uses Sui objects and Move-enforced policies. Funds sit in an{' '}
          <strong>AgentVault</strong>, the worker receives a scoped <strong>AgentSessionCap</strong>, and every
          execution is checked against limits, schedules, reserves, pause, and revoke controls.
        </div>

        <div className="hero-actions connect-slot">
          <ConnectButton />
          <span className="helper-text">Connect a Sui wallet to create your first policy-bound agent.</span>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function NoAgentState({ onCreate, accountAddress }: { onCreate: () => void; accountAddress: string }) {
  return (
    <main className="container fade-in">
      <section className="empty-state">
        <div className="empty-icon">
          <Database size={34} />
        </div>
        <h1>No agent yet</h1>
        <p>Create a shared vault and issue a scoped agent session. The dashboard opens after the vault objects exist.</p>
        <div className="summary-card compact">
          <div className="summary-row">
            <span>Connected wallet</span>
            <strong>{shortAddress(accountAddress, 8, 6)}</strong>
          </div>
          <div className="summary-row">
            <span>Package</span>
            <strong className={isPackageConfigured ? undefined : 'config-warning'}>
              {isPackageConfigured ? shortAddress(packageId, 8, 6) : 'Not configured'}
            </strong>
          </div>
          <div className="summary-row">
            <span>Agent API</span>
            <strong>{agentApiUrl}</strong>
          </div>
        </div>
        <div className="empty-buttons">
          <button className="btn btn-primary btn-lg" onClick={onCreate}>
            <Rocket size={18} />
            Create Agent
          </button>
        </div>
      </section>
    </main>
  );
}

function Dashboard(props: {
  accountAddress: string;
  status: { className: string; label: string };
  vaultId: string;
  ownerCapId: string;
  sessionCapId: string;
  creationDigest?: string;
  setVaultId: (value: string) => void;
  setOwnerCapId: (value: string) => void;
  setSessionCapId: (value: string) => void;
  vaultBalance: number;
  availableBalance: number;
  minReserve: number;
  maxPerTx: number;
  maxPerWindow: number;
  rules: RuleItem[];
  activity: ActivityItem[];
  activityFilter: 'all' | ActivityItem['type'];
  setActivityFilter: (value: 'all' | ActivityItem['type']) => void;
  agentPlan: any;
  agentStatus: 'active' | 'paused' | 'revoked';
  setAgentStatus: (value: 'active' | 'paused' | 'revoked') => void;
  onDeposit: () => void;
  onAddRule: () => void;
  addActivity: (item: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  setAgentPlan: (value: any) => void;
}) {
  const {
    accountAddress,
    status,
    vaultId,
    ownerCapId,
    sessionCapId,
    creationDigest,
    setVaultId,
    setOwnerCapId,
    setSessionCapId,
    vaultBalance,
    availableBalance,
    minReserve,
    maxPerTx,
    maxPerWindow,
    rules,
    activity,
    activityFilter,
    setActivityFilter,
    agentPlan,
    agentStatus,
    setAgentStatus,
    onDeposit,
    onAddRule,
    addActivity,
    setAgentPlan,
  } = props;

  const nextRule = rules
    .filter((rule) => rule.active)
    .sort((a, b) => a.nextDueMs - b.nextDueMs)[0];

  const filteredActivity = activityFilter === 'all' ? activity : activity.filter((item) => item.type === activityFilter);

  return (
    <main className="container fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title-block">
          <h1>
            PolicyPay Agent
            <span className={`status-badge ${status.className}`}>
              <span className="status-dot" />
              {status.label}
            </span>
          </h1>
          <p>Treasury agent for recurring payments on Sui. Owner: {shortAddress(accountAddress, 8, 6)}</p>
        </div>
      </div>

      <div className="dashboard-actions">
        <button className="btn btn-outline-primary" onClick={onDeposit}>
          <Banknote size={16} />
          Deposit
        </button>
        <button className="btn btn-outline-primary" onClick={onAddRule} disabled={!ownerCapId}>
          <Plus size={16} />
          Add Rule
        </button>
        <AgentActionButtons vaultId={vaultId} sessionCapId={sessionCapId} addActivity={addActivity} setAgentPlan={setAgentPlan} />
      </div>

      <div className="stat-grid">
        <StatCard
          icon={<Wallet size={16} />}
          title="Vault Balance"
          value={`${vaultBalance.toFixed(2)}`}
          unit="SUI"
          rows={[
            ['Min reserve', `${minReserve.toFixed(2)} SUI`],
            ['Available for agent', `${availableBalance.toFixed(2)} SUI`],
          ]}
          progress={Math.min(100, (vaultBalance / 1) * 100)}
          progressTone={vaultBalance <= minReserve ? 'warning' : 'success'}
        />
        <StatCard
          icon={<ShieldCheck size={16} />}
          title="Agent Policy"
          rows={[
            ['Max per payment', `${maxPerTx.toFixed(2)} SUI`],
            ['Window limit', `${maxPerWindow.toFixed(2)} SUI / 2 min`],
            ['Session', agentStatus],
          ]}
          progress={agentStatus === 'active' ? 100 : 35}
          progressTone={agentStatus === 'active' ? 'success' : 'warning'}
        />
        <StatCard
          icon={<Clock3 size={16} />}
          title="Next Payment"
          value={nextRule ? nextRule.amount : '--'}
          unit={nextRule ? 'SUI' : ''}
          rows={
            nextRule
              ? [
                  ['Rule', nextRule.label],
                  ['Recipient', shortAddress(nextRule.recipient)],
                  ['Due', formatDateMs(nextRule.nextDueMs)],
                ]
              : [['Status', 'No payment rules yet']]
          }
          progress={nextRule ? 60 : 0}
        />
        <StatCard
          icon={<Gauge size={16} />}
          title="Agent Health"
          rows={[
            ['Vault registered', vaultId ? 'ready' : 'missing'],
            ['OwnerCap', ownerCapId ? 'detected' : 'missing'],
            ['SessionCap', sessionCapId ? 'detected' : 'missing'],
            ['Policy checks', 'local preview ready'],
          ]}
          progress={vaultId && ownerCapId && sessionCapId ? 100 : 50}
          progressTone={vaultId && ownerCapId && sessionCapId ? 'success' : 'warning'}
        />
      </div>

      <section className="object-registry">
        <div>
          <h2>Onchain Registry</h2>
          <p>Objects captured from the confirmed Sui transaction. These IDs are required for vault operations.</p>
          <div className="chain-proof-list">
            <a href={objectUrl(packageId)} target="_blank" rel="noreferrer">
              Package
              <ExternalLink size={13} />
            </a>
            {creationDigest && (
              <a href={transactionUrl(creationDigest)} target="_blank" rel="noreferrer">
                Creation tx
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
        <div className="object-inputs">
          <label>
            Vault ID
            <input value={vaultId} onChange={(event) => setVaultId(event.target.value)} placeholder="0xvault..." />
          </label>
          <label>
            OwnerCap ID
            <input value={ownerCapId} onChange={(event) => setOwnerCapId(event.target.value)} placeholder="0xownerCap..." />
          </label>
          <label>
            SessionCap ID
            <input value={sessionCapId} onChange={(event) => setSessionCapId(event.target.value)} placeholder="0xsessionCap..." />
          </label>
        </div>
      </section>

      <div className="workspace">
        <section className="panel">
          <div className="panel-header">
            <h2>Payment Rules</h2>
            <span className="badge-pill">{rules.length} rules</span>
          </div>
          <RuleList rules={rules} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Agent Plan</h2>
          </div>
          <AgentPlan plan={agentPlan} />
        </section>
      </div>

      <section className="activity-section">
        <div className="activity-header">
          <h2>Activity</h2>
          <div className="filter-pills">
            {(['all', 'payment', 'system', 'agent', 'owner'] as const).map((filter) => (
              <button
                key={filter}
                className={`filter-pill ${activityFilter === filter ? 'active' : ''}`}
                onClick={() => setActivityFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <ActivityTimeline items={filteredActivity} />
      </section>

      <SafetyControls
        vaultId={vaultId}
        ownerCapId={ownerCapId}
        agentStatus={agentStatus}
        setAgentStatus={setAgentStatus}
        addActivity={addActivity}
      />
    </main>
  );
}

function StatCard(props: {
  icon: React.ReactNode;
  title: string;
  value?: string;
  unit?: string;
  rows: Array<[string, string]>;
  progress?: number;
  progressTone?: 'success' | 'warning' | 'danger';
}) {
  const { icon, title, value, unit, rows, progress = 0, progressTone = 'success' } = props;

  return (
    <section className="stat-card">
      <div className="stat-card-header">
        <div className="stat-icon">{icon}</div>
        <h3>{title}</h3>
      </div>
      {value && (
        <div className="stat-value">
          {value} {unit && <span className="unit">{unit}</span>}
        </div>
      )}
      <div className="stat-meta">
        {rows.map(([label, rowValue]) => (
          <div className="stat-meta-row" key={label}>
            <span>{label}</span>
            <strong>{rowValue}</strong>
          </div>
        ))}
        <div className="progress-bar">
          <div className={`progress-fill ${progressTone}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </section>
  );
}

function RuleList({ rules }: { rules: RuleItem[] }) {
  if (rules.length === 0) {
    return (
      <div className="empty-rules">
        <div className="empty-rules-icon">
          <ClipboardList size={22} />
        </div>
        No payment rules yet.
        <br />
        Add a rule to let the agent preview scheduled payments.
      </div>
    );
  }

  return (
    <div className="rule-list">
      {rules.map((rule) => (
        <article className={`rule-card ${rule.active ? '' : 'disabled'}`} key={rule.id}>
          <div className="rule-card-header">
            <div>
              <div className="rule-name">
                <CircleDollarSign size={16} />
                {rule.label}
              </div>
              <div className="rule-meta">
                <span>{shortAddress(rule.recipient, 8, 6)}</span>
                <span>Every {rule.periodSeconds}s - next due {formatDateMs(rule.nextDueMs)}</span>
              </div>
            </div>
            <div className="rule-amount">{Number(rule.amount).toFixed(2)} SUI</div>
          </div>
          {rule.digest && <div className="digest-line">Digest {shortAddress(rule.digest, 10, 8)}</div>}
        </article>
      ))}
    </div>
  );
}

function AgentPlan({ plan }: { plan: any }) {
  if (!plan) {
    return (
      <div className="plan-empty">
        The agent recommendation appears here after a dry-run plan.
        <br />
        Use "Preview Plan" once the vault is registered.
      </div>
    );
  }

  return (
    <div className="plan-block">
      <div className="plan-label">Latest dry run</div>
      <pre>{JSON.stringify(plan, null, 2)}</pre>
    </div>
  );
}

function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <div className="timeline timeline-empty">No activity yet.</div>;
  }

  return (
    <div className="timeline">
      {items.map((item) => (
        <article className="timeline-item" key={item.id}>
          <div className={`timeline-icon ${item.tone}`}>
            {item.tone === 'success' ? <Check size={16} /> : item.tone === 'danger' ? <TriangleAlert size={16} /> : <Sparkles size={16} />}
          </div>
          <div className="timeline-content">
            <div className="timeline-main">
              <div className="timeline-title">{item.title}</div>
              {item.description && <div className="timeline-desc">{item.description}</div>}
              {item.digest && <div className="timeline-tx">Digest {shortAddress(item.digest, 10, 8)}</div>}
            </div>
            <div className="timeline-meta">
              {item.amount && <span className="timeline-amount">{item.amount}</span>}
              <span>{nowLabel(item.timestamp)}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function AgentActionButtons({
  vaultId,
  sessionCapId,
  addActivity,
  setAgentPlan,
}: {
  vaultId: string;
  sessionCapId: string;
  addActivity: (item: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  setAgentPlan: (value: any) => void;
}) {
  const [busy, setBusy] = useState<'register' | 'plan' | 'execute' | null>(null);

  async function register() {
    setBusy('register');
    try {
      const res = await fetch(`${agentApiUrl}/vaults`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vaultId, sessionCapId, coinType: defaultCoinType, packageId, label: 'Web dashboard vault' }),
      });
      const json = await res.json();
      addActivity({
        type: 'agent',
        tone: res.ok ? 'success' : 'warning',
        title: res.ok ? 'Agent registered' : 'Agent registration failed',
        description: res.ok ? 'Local worker can now monitor this vault.' : 'Check the local agent service.',
        raw: json,
      });
    } finally {
      setBusy(null);
    }
  }

  async function plan() {
    setBusy('plan');
    try {
      const res = await fetch(`${agentApiUrl}/vaults/${vaultId}/plan`, { method: 'POST' });
      const json = await res.json();
      setAgentPlan(json);
      addActivity({
        type: 'agent',
        tone: res.ok ? 'info' : 'warning',
        title: res.ok ? 'Plan previewed' : 'Plan preview failed',
        description: 'Dry-run response received from the local agent API.',
        raw: json,
      });
    } finally {
      setBusy(null);
    }
  }

  async function execute() {
    setBusy('execute');
    try {
      const res = await fetch(`${agentApiUrl}/vaults/${vaultId}/execute`, { method: 'POST' });
      const json = await res.json();
      setAgentPlan(json);
      addActivity({
        type: 'payment',
        tone: res.ok ? 'success' : 'warning',
        title: res.ok ? 'Execution requested' : 'Execution failed',
        description: 'Manual execution response received from the local agent API.',
        raw: json,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button className="btn btn-outline-primary" disabled={busy !== null || !vaultId || !sessionCapId} onClick={register}>
        {busy === 'register' ? <Loader2 className="spin" size={16} /> : <BadgeCheck size={16} />}
        Register
      </button>
      <button className="btn btn-outline-primary" disabled={busy !== null || !vaultId} onClick={plan}>
        {busy === 'plan' ? <Loader2 className="spin" size={16} /> : <Clock3 size={16} />}
        Preview Plan
      </button>
      <button className="btn btn-primary" disabled={busy !== null || !vaultId} onClick={execute}>
        {busy === 'execute' ? <Loader2 className="spin" size={16} /> : <Zap size={16} />}
        Execute Now
      </button>
    </>
  );
}

function SafetyControls({
  vaultId,
  ownerCapId,
  agentStatus,
  setAgentStatus,
  addActivity,
}: {
  vaultId: string;
  ownerCapId: string;
  agentStatus: 'active' | 'paused' | 'revoked';
  setAgentStatus: (value: 'active' | 'paused' | 'revoked') => void;
  addActivity: (item: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
}) {
  const dapp = useDAppKit();
  const [withdrawAmount, setWithdrawAmount] = useState('0.1');
  const [busy, setBusy] = useState<'pause' | 'resume' | 'revoke' | 'withdraw' | null>(null);

  async function sign(label: 'pause' | 'resume' | 'revoke' | 'withdraw', tx: any) {
    setBusy(label);
    try {
      const res = await dapp.signAndExecuteTransaction({ transaction: tx });
      const digest = extractDigest(res);
      if (label === 'pause') setAgentStatus('paused');
      if (label === 'resume') setAgentStatus('active');
      if (label === 'revoke') setAgentStatus('revoked');
      addActivity({
        type: 'owner',
        tone: label === 'revoke' ? 'danger' : 'success',
        title: `Owner ${label}`,
        description: 'OwnerCap signed this safety operation.',
        digest,
        raw: res,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="safety-section">
      <div className="safety-header">
        <div className="safety-icon">
          <Shield size={18} />
        </div>
        <h2>Safety Controls</h2>
      </div>
      <div className="safety-grid">
        <article className="safety-card warning">
          <h3>{agentStatus === 'paused' ? 'Resume Agent' : 'Pause Agent'}</h3>
          <p>Temporarily stop or resume all agent executions. Funds remain in the vault.</p>
          {agentStatus === 'paused' ? (
            <button
              className="btn btn-warning"
              disabled={busy !== null || !vaultId || !ownerCapId}
              onClick={() => sign('resume', buildResumeTx({ packageId, coinType: defaultCoinType, vaultId, ownerCapId }))}
            >
              {busy === 'resume' ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
              Resume Agent
            </button>
          ) : (
            <button
              className="btn btn-warning"
              disabled={busy !== null || !vaultId || !ownerCapId || agentStatus === 'revoked'}
              onClick={() => sign('pause', buildPauseTx({ packageId, coinType: defaultCoinType, vaultId, ownerCapId }))}
            >
              {busy === 'pause' ? <Loader2 className="spin" size={16} /> : <Pause size={16} />}
              Pause Agent
            </button>
          )}
        </article>
        <article className="safety-card danger">
          <h3>Revoke Agent</h3>
          <p>Permanently disable this agent session. The agent can no longer execute payments.</p>
          <button
            className="btn btn-danger"
            disabled={busy !== null || !vaultId || !ownerCapId || agentStatus === 'revoked'}
            onClick={() => sign('revoke', buildRevokeAgentTx({ packageId, coinType: defaultCoinType, vaultId, ownerCapId }))}
          >
            {busy === 'revoke' ? <Loader2 className="spin" size={16} /> : <TriangleAlert size={16} />}
            Revoke Agent
          </button>
        </article>
        <article className="safety-card">
          <h3>Withdraw Funds</h3>
          <p>The owner can always withdraw from the vault. This transaction requires your wallet signature.</p>
          <label>
            Amount
            <input value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} />
          </label>
          <button
            className="btn"
            disabled={busy !== null || !vaultId || !ownerCapId}
            onClick={() =>
              sign('withdraw', buildWithdrawTx({ packageId, coinType: defaultCoinType, vaultId, ownerCapId, amount: suiToMist(withdrawAmount) }))
            }
          >
            {busy === 'withdraw' ? <Loader2 className="spin" size={16} /> : <Banknote size={16} />}
            Withdraw
          </button>
        </article>
      </div>
    </section>
  );
}

function CreateVaultModal({
  open,
  onClose,
  accountAddress,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  accountAddress?: string;
  onCreated: (objects: CreatedObject[], digest: string | undefined, intent: VaultPolicy) => void;
}) {
  const dapp = useDAppKit();
  const client = useCurrentClient();
  const [step, setStep] = useState(1);
  const [agentAddress, setAgentAddress] = useState('');
  const [maxPerTx, setMaxPerTx] = useState('0.2');
  const [maxPerWindow, setMaxPerWindow] = useState('0.3');
  const [windowMinutes, setWindowMinutes] = useState('2');
  const [minBalance, setMinBalance] = useState('0.1');
  const [expiresHours, setExpiresHours] = useState('24');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ digest?: string; objects: CreatedObject[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expiresAtMs = Date.now() + Number(expiresHours || '0') * 3600_000;
  const agentAddressIsValid = isValidAddress(agentAddress);
  const configError = isPackageConfigured
    ? null
    : 'Contract package id is not configured. Publish the Move package, then set NEXT_PUBLIC_PACKAGE_ID.';

  function close() {
    onClose();
    setStep(1);
    setBusy(false);
    setError(null);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (configError) throw new Error('Invalid package id: ' + packageId);
      if (!agentAddressIsValid) throw new Error('Invalid agent address: ' + agentAddress);

      const tx = buildCreateVaultTx({
        packageId,
        coinType: defaultCoinType,
        agentAddress,
        maxPerTx: suiToMist(maxPerTx),
        maxPerWindow: suiToMist(maxPerWindow),
        windowMs: BigInt(Number(windowMinutes) * 60_000),
        minBalance: suiToMist(minBalance),
        expiresAtMs: BigInt(expiresAtMs),
      });
      const res = await dapp.signAndExecuteTransaction({ transaction: tx });
      const digest = extractDigest(res);
      let indexedResult: any = res;
      if (digest) {
        try {
          indexedResult = await client.waitForTransaction({
            digest,
            include: { effects: true, objectTypes: true },
            timeout: 30_000,
          });
        } catch {
          indexedResult = res;
        }
      }
      const indexedObjects = findCreatedObjects(indexedResult);
      const objects = indexedObjects.length > 0 ? indexedObjects : findCreatedObjects(res);
      setResult({ digest, objects });
      onCreated(objects, digest, {
        agentAddress,
        maxPerTx: Number(maxPerTx),
        maxPerWindow: Number(maxPerWindow),
        windowMinutes: Number(windowMinutes),
        minReserve: Number(minBalance),
        expiresAtMs,
      });
      setStep(4);
    } catch (submitError) {
      setError(formatTransactionError(submitError));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop active" role="dialog" aria-modal="true" aria-labelledby="create-vault-title">
      <div className="modal">
        <div className="wizard-progress">
          {[1, 2, 3].map((item) => (
            <div key={item} className={`wizard-step ${step > item ? 'complete' : step === item ? 'active' : ''}`} />
          ))}
        </div>
        <div className="wizard-label">{step === 4 ? 'Complete' : `Step ${step} of 3`}</div>
        <div className="modal-header">
          <h2 id="create-vault-title">
            {step === 1 && 'Choose Payment Profile'}
            {step === 2 && 'Set Safety Boundaries'}
            {step === 3 && 'Review & Create'}
            {step === 4 && 'Vault Created'}
          </h2>
          <button className="modal-close" onClick={close} aria-label="Close create vault dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {(configError || error) && (
            <div className="modal-alert danger">
              <TriangleAlert size={16} />
              <span>{error ?? configError}</span>
            </div>
          )}

          {step === 1 && (
            <div className="template-list">
              <button className="template-card selected" onClick={() => setStep(2)}>
                <div className="template-icon">
                  <Rocket size={22} />
                </div>
                <div className="template-content">
                  <h3>Recurring Operations</h3>
                  <p>Small SUI payments governed by amount, reserve, window, and expiry limits.</p>
                </div>
                <div className="template-radio" />
              </button>
              <button className="template-card" onClick={() => setStep(2)}>
                <div className="template-icon">
                  <ClipboardList size={22} />
                </div>
                <div className="template-content">
                  <h3>Team Payouts</h3>
                  <p>Contributor payments with owner-held recovery and pause controls.</p>
                </div>
                <div className="template-radio" />
              </button>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="form-grid">
                <label className="form-field full">
                  Agent address
                  <input value={agentAddress} onChange={(event) => setAgentAddress(event.target.value)} placeholder="0xagent..." />
                  <span className="hint">
                    Agent wallet address. It receives the permission object used to execute approved payments.
                  </span>
                  {agentAddress && !agentAddressIsValid && <span className="field-error">Enter a valid Sui address.</span>}
                </label>
                <label className="form-field">
                  Max per payment
                  <input value={maxPerTx} onChange={(event) => setMaxPerTx(event.target.value)} />
                </label>
                <label className="form-field">
                  Max per window
                  <input value={maxPerWindow} onChange={(event) => setMaxPerWindow(event.target.value)} />
                </label>
                <label className="form-field">
                  Window minutes
                  <input value={windowMinutes} onChange={(event) => setWindowMinutes(event.target.value)} />
                </label>
                <label className="form-field">
                  Min reserve
                  <input value={minBalance} onChange={(event) => setMinBalance(event.target.value)} />
                </label>
                <label className="form-field">
                  Expires in hours
                  <input value={expiresHours} onChange={(event) => setExpiresHours(event.target.value)} />
                </label>
              </div>
              <div className="permission-grid">
                <div className="permission-card allow">
                  <h4>Agent can:</h4>
                  <ul>
                    <li>Pay active rules</li>
                    <li>Spend within max per payment</li>
                    <li>Spend within rolling window</li>
                    <li>Execute until expiration</li>
                  </ul>
                </div>
                <div className="permission-card deny">
                  <h4>Agent cannot:</h4>
                  <ul>
                    <li>Add new recipients</li>
                    <li>Bypass minimum reserve</li>
                    <li>Withdraw arbitrary funds</li>
                    <li>Continue after revoke</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="summary-card">
              <div className="summary-title">You are creating a policy-bound AgentVault.</div>
              <div className="summary-row">
                <span>Owner</span>
                <strong>{accountAddress ? shortAddress(accountAddress, 8, 6) : 'unknown'}</strong>
              </div>
              <div className="summary-row">
                <span>Agent</span>
                <strong>{agentAddress ? shortAddress(agentAddress, 8, 6) : 'missing'}</strong>
              </div>
              <div className="summary-row">
                <span>Max per payment</span>
                <strong>{maxPerTx} SUI</strong>
              </div>
              <div className="summary-row">
                <span>Window limit</span>
                <strong>
                  {maxPerWindow} SUI / {windowMinutes} min
                </strong>
              </div>
              <div className="summary-row">
                <span>Min reserve</span>
                <strong>{minBalance} SUI</strong>
              </div>
              <div className="summary-row">
                <span>Expires</span>
                <strong>{formatDateMs(expiresAtMs)}</strong>
              </div>
              <div className="object-chip-row">
                <span className="object-chip">
                  <Database size={12} />
                  AgentVault
                </span>
                <span className="object-chip">
                  <KeyRound size={12} />
                  OwnerCap
                </span>
                <span className="object-chip">
                  <KeyRound size={12} />
                  AgentSessionCap
                </span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="success-content">
              <div className="success-checkmark">
                <Check size={40} />
              </div>
              <h2>Vault created successfully</h2>
              <p>Transaction confirmed on Sui. These objects now define the vault, owner controls, and agent scope.</p>
              {result?.digest && (
                <a className="proof-link" href={transactionUrl(result.digest)} target="_blank" rel="noreferrer">
                  View transaction
                  <ExternalLink size={14} />
                </a>
              )}
              <div className="object-list">
                {(result?.objects ?? []).length === 0 ? (
                  <div className="object-row warning">
                    <div className="obj-info">
                      <div className="obj-label">Object indexing pending</div>
                      <div className="obj-value">The transaction is confirmed, but object metadata was not returned yet. Open the transaction in Explorer.</div>
                    </div>
                  </div>
                ) : (
                  result?.objects.map((object) => (
                    <div className="object-row" key={object.objectId}>
                      <div className="obj-icon">
                        <Database size={14} />
                      </div>
                      <div className="obj-info">
                        <div className="obj-label">{objectLabel(object.objectType)}</div>
                        <div className="obj-value">{object.objectId}</div>
                      </div>
                      <a className="copy-btn" href={objectUrl(object.objectId)} target="_blank" rel="noreferrer" aria-label="Open object in Explorer">
                        <ExternalLink size={14} />
                      </a>
                      <button className="copy-btn" onClick={() => navigator.clipboard?.writeText(object.objectId)} aria-label="Copy object ID">
                        <Copy size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 1 && (
            <>
              <button className="btn" onClick={close}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                Next
                <ArrowRight size={16} />
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button className="btn" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!agentAddressIsValid}>
                Next
                <ArrowRight size={16} />
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button className="btn" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={busy || !agentAddressIsValid || !isPackageConfigured}>
                {busy ? <Loader2 className="spin" size={16} /> : <Rocket size={16} />}
                Create Agent Vault
              </button>
            </>
          )}
          {step === 4 && (
            <button className="btn btn-primary full-button" onClick={close}>
              Open Dashboard
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DepositModal({
  open,
  onClose,
  vaultId,
  onDeposited,
}: {
  open: boolean;
  onClose: () => void;
  vaultId: string;
  onDeposited: (amount: string, digest: string | undefined, raw: any) => void;
}) {
  const dapp = useDAppKit();
  const [amount, setAmount] = useState('0.8');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const tx = buildDepositTx({ packageId, coinType: defaultCoinType, vaultId, amount: suiToMist(amount) });
      const res = await dapp.signAndExecuteTransaction({ transaction: tx });
      onDeposited(amount, extractDigest(res), res);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <SimpleModal title="Deposit to Vault" onClose={onClose}>
      <div className="form-grid">
        <label className="form-field full">
          Amount (SUI)
          <input value={amount} onChange={(event) => setAmount(event.target.value)} />
          <span className="hint">Funds are locked in the AgentVault until the owner withdraws.</span>
        </label>
      </div>
      <div className="summary-card compact">
        <div className="summary-row">
          <span>To vault</span>
          <strong>{shortAddress(vaultId, 8, 6)}</strong>
        </div>
        <div className="summary-row">
          <span>Coin type</span>
          <strong>SUI</strong>
        </div>
      </div>
      <div className="modal-footer inline-footer">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !vaultId}>
          {busy ? <Loader2 className="spin" size={16} /> : <Banknote size={16} />}
          Confirm Deposit
        </button>
      </div>
    </SimpleModal>
  );
}

function RuleModal({
  open,
  onClose,
  vaultId,
  ownerCapId,
  onRuleAdded,
}: {
  open: boolean;
  onClose: () => void;
  vaultId: string;
  ownerCapId: string;
  onRuleAdded: (rule: RuleItem, digest: string | undefined, raw: any) => void;
}) {
  const dapp = useDAppKit();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [periodSeconds, setPeriodSeconds] = useState('300');
  const [firstDueSeconds, setFirstDueSeconds] = useState('30');
  const [label, setLabel] = useState('vendor payout');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const nextDueMs = Date.now() + Number(firstDueSeconds) * 1000;
      const tx = buildAddRuleTx({
        packageId,
        coinType: defaultCoinType,
        vaultId,
        ownerCapId,
        recipient,
        amount: suiToMist(amount),
        periodMs: BigInt(Number(periodSeconds) * 1000),
        firstDueMs: BigInt(nextDueMs),
        label,
      });
      const res = await dapp.signAndExecuteTransaction({ transaction: tx });
      onRuleAdded(
        {
          id: uid(),
          recipient,
          amount,
          periodSeconds,
          label,
          nextDueMs,
          digest: extractDigest(res),
          active: true,
        },
        extractDigest(res),
        res,
      );
      onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <SimpleModal title="Add Payment Rule" onClose={onClose}>
      <div className="form-grid">
        <label className="form-field full">
          Recipient address
          <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="0xrecipient..." />
        </label>
        <label className="form-field">
          Amount (SUI)
          <input value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="form-field">
          Period seconds
          <input value={periodSeconds} onChange={(event) => setPeriodSeconds(event.target.value)} />
        </label>
        <label className="form-field">
          First due seconds
          <input value={firstDueSeconds} onChange={(event) => setFirstDueSeconds(event.target.value)} />
        </label>
        <label className="form-field">
          Label
          <input value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
      </div>
      <div className="modal-footer inline-footer">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={busy || !recipient || !vaultId || !ownerCapId} onClick={submit}>
          {busy ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
          Add Rule
        </button>
      </div>
    </SimpleModal>
  );
}

function SimpleModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop active" role="dialog" aria-modal="true" aria-labelledby="simple-modal-title">
      <div className="modal narrow">
        <div className="modal-header">
          <h2 id="simple-modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label={`Close ${title}`}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
