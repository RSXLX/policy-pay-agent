module agent_treasury::vault;

use std::vector;

use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, ID, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

const E_NOT_OWNER: u64 = 1;
const E_BAD_CAP: u64 = 2;
const E_AGENT_REVOKED: u64 = 3;
const E_PAUSED: u64 = 4;
const E_EXPIRED: u64 = 5;
const E_RULE_NOT_FOUND: u64 = 6;
const E_RULE_INACTIVE: u64 = 7;
const E_NOT_DUE: u64 = 8;
const E_MAX_PER_TX: u64 = 9;
const E_WINDOW_LIMIT: u64 = 10;
const E_MIN_BALANCE: u64 = 11;
const E_BAD_NONCE: u64 = 12;
const E_NOT_AGENT: u64 = 13;
const E_BAD_LIMITS: u64 = 14;
const E_ZERO_AMOUNT: u64 = 15;
const E_RULE_LIMIT: u64 = 16;

const MAX_RULES: u64 = 64;

public struct OwnerCap has key, store {
    id: UID,
    vault_id: ID,
}

public struct AgentSessionCap has key, store {
    id: UID,
    vault_id: ID,
    agent: address,
}

public struct PaymentRule has copy, drop, store {
    id: u64,
    recipient: address,
    amount: u64,
    period_ms: u64,
    next_due_ms: u64,
    active: bool,
    label_hash: vector<u8>,
}

public struct AgentVault<phantom T> has key {
    id: UID,
    owner: address,
    agent: address,
    balance: Balance<T>,
    max_per_tx: u64,
    max_per_window: u64,
    window_ms: u64,
    window_start_ms: u64,
    spent_in_window: u64,
    min_balance: u64,
    expires_at_ms: u64,
    paused: bool,
    revoked: bool,
    last_nonce: u64,
    next_rule_id: u64,
    rules: vector<PaymentRule>,
}

public struct VaultCreated has copy, drop, store {
    vault_id: ID,
    owner: address,
    agent: address,
    created_at_ms: u64,
}

public struct FundsDeposited has copy, drop, store {
    vault_id: ID,
    sender: address,
    amount: u64,
}

public struct FundsWithdrawn has copy, drop, store {
    vault_id: ID,
    owner: address,
    amount: u64,
}

public struct RuleAdded has copy, drop, store {
    vault_id: ID,
    rule_id: u64,
    recipient: address,
    amount: u64,
    period_ms: u64,
    next_due_ms: u64,
}

public struct RuleDisabled has copy, drop, store {
    vault_id: ID,
    rule_id: u64,
}

public struct PaymentExecuted has copy, drop, store {
    vault_id: ID,
    rule_id: u64,
    recipient: address,
    amount: u64,
    nonce: u64,
    plan_hash: vector<u8>,
    timestamp_ms: u64,
}

public struct VaultPaused has copy, drop, store {
    vault_id: ID,
}

public struct VaultResumed has copy, drop, store {
    vault_id: ID,
}

public struct AgentRevoked has copy, drop, store {
    vault_id: ID,
    agent: address,
}

public struct AgentRotated has copy, drop, store {
    vault_id: ID,
    old_agent: address,
    new_agent: address,
}

public struct LimitsUpdated has copy, drop, store {
    vault_id: ID,
    max_per_tx: u64,
    max_per_window: u64,
    window_ms: u64,
    min_balance: u64,
    expires_at_ms: u64,
}

public entry fun create_vault<T>(
    agent: address,
    max_per_tx: u64,
    max_per_window: u64,
    window_ms: u64,
    min_balance: u64,
    expires_at_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(max_per_tx > 0, E_BAD_LIMITS);
    assert!(max_per_window >= max_per_tx, E_BAD_LIMITS);
    assert!(window_ms > 0, E_BAD_LIMITS);

    let owner = tx_context::sender(ctx);
    let now = clock::timestamp_ms(clock);
    assert!(expires_at_ms > now, E_EXPIRED);

    let vault = AgentVault<T> {
        id: object::new(ctx),
        owner,
        agent,
        balance: balance::zero<T>(),
        max_per_tx,
        max_per_window,
        window_ms,
        window_start_ms: now,
        spent_in_window: 0,
        min_balance,
        expires_at_ms,
        paused: false,
        revoked: false,
        last_nonce: 0,
        next_rule_id: 1,
        rules: vector::empty<PaymentRule>(),
    };

    let vault_id = object::id(&vault);

    let owner_cap = OwnerCap {
        id: object::new(ctx),
        vault_id,
    };

    let session_cap = AgentSessionCap {
        id: object::new(ctx),
        vault_id,
        agent,
    };

    event::emit(VaultCreated {
        vault_id,
        owner,
        agent,
        created_at_ms: now,
    });

    transfer::public_transfer(owner_cap, owner);
    transfer::public_transfer(session_cap, agent);
    transfer::share_object(vault);
}

public entry fun deposit<T>(vault: &mut AgentVault<T>, coin: Coin<T>, ctx: &mut TxContext) {
    let amount = coin::value(&coin);
    let incoming = coin::into_balance(coin);
    let _new_total = balance::join(&mut vault.balance, incoming);

    event::emit(FundsDeposited {
        vault_id: object::id(vault),
        sender: tx_context::sender(ctx),
        amount,
    });
}

public entry fun owner_withdraw<T>(
    vault: &mut AgentVault<T>,
    cap: &OwnerCap,
    amount: u64,
    ctx: &mut TxContext,
) {
    assert_owner(vault, cap, ctx);
    assert!(amount > 0, E_ZERO_AMOUNT);

    let b = balance::split(&mut vault.balance, amount);
    let c = coin::from_balance(b, ctx);
    transfer::public_transfer(c, vault.owner);

    event::emit(FundsWithdrawn {
        vault_id: object::id(vault),
        owner: vault.owner,
        amount,
    });
}

public entry fun add_rule<T>(
    vault: &mut AgentVault<T>,
    cap: &OwnerCap,
    recipient: address,
    amount: u64,
    period_ms: u64,
    first_due_ms: u64,
    label_hash: vector<u8>,
    ctx: &mut TxContext,
) {
    assert_owner(vault, cap, ctx);
    assert!(amount > 0, E_ZERO_AMOUNT);
    assert!(amount <= vault.max_per_tx, E_MAX_PER_TX);
    assert!(vector::length(&vault.rules) < MAX_RULES, E_RULE_LIMIT);
    assert!(period_ms > 0, E_BAD_LIMITS);

    let rule_id = vault.next_rule_id;
    vault.next_rule_id = rule_id + 1;

    vector::push_back(&mut vault.rules, PaymentRule {
        id: rule_id,
        recipient,
        amount,
        period_ms,
        next_due_ms: first_due_ms,
        active: true,
        label_hash,
    });

    event::emit(RuleAdded {
        vault_id: object::id(vault),
        rule_id,
        recipient,
        amount,
        period_ms,
        next_due_ms: first_due_ms,
    });
}

public entry fun disable_rule<T>(
    vault: &mut AgentVault<T>,
    cap: &OwnerCap,
    rule_id: u64,
    ctx: &mut TxContext,
) {
    assert_owner(vault, cap, ctx);
    let idx = rule_index(&vault.rules, rule_id);
    let rule = vector::borrow_mut(&mut vault.rules, idx);
    rule.active = false;

    event::emit(RuleDisabled {
        vault_id: object::id(vault),
        rule_id,
    });
}

public entry fun pause<T>(vault: &mut AgentVault<T>, cap: &OwnerCap, ctx: &mut TxContext) {
    assert_owner(vault, cap, ctx);
    vault.paused = true;

    event::emit(VaultPaused {
        vault_id: object::id(vault),
    });
}

public entry fun resume<T>(vault: &mut AgentVault<T>, cap: &OwnerCap, ctx: &mut TxContext) {
    assert_owner(vault, cap, ctx);
    vault.paused = false;

    event::emit(VaultResumed {
        vault_id: object::id(vault),
    });
}

public entry fun revoke_agent<T>(vault: &mut AgentVault<T>, cap: &OwnerCap, ctx: &mut TxContext) {
    assert_owner(vault, cap, ctx);
    vault.revoked = true;

    event::emit(AgentRevoked {
        vault_id: object::id(vault),
        agent: vault.agent,
    });
}

public entry fun rotate_agent<T>(
    vault: &mut AgentVault<T>,
    cap: &OwnerCap,
    new_agent: address,
    ctx: &mut TxContext,
) {
    assert_owner(vault, cap, ctx);

    let old_agent = vault.agent;
    vault.agent = new_agent;
    vault.revoked = false;

    let session_cap = AgentSessionCap {
        id: object::new(ctx),
        vault_id: object::id(vault),
        agent: new_agent,
    };

    transfer::public_transfer(session_cap, new_agent);

    event::emit(AgentRotated {
        vault_id: object::id(vault),
        old_agent,
        new_agent,
    });
}

public entry fun update_limits<T>(
    vault: &mut AgentVault<T>,
    cap: &OwnerCap,
    max_per_tx: u64,
    max_per_window: u64,
    window_ms: u64,
    min_balance: u64,
    expires_at_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert_owner(vault, cap, ctx);
    assert!(max_per_tx > 0, E_BAD_LIMITS);
    assert!(max_per_window >= max_per_tx, E_BAD_LIMITS);
    assert!(window_ms > 0, E_BAD_LIMITS);
    assert!(expires_at_ms > clock::timestamp_ms(clock), E_EXPIRED);

    vault.max_per_tx = max_per_tx;
    vault.max_per_window = max_per_window;
    vault.window_ms = window_ms;
    vault.min_balance = min_balance;
    vault.expires_at_ms = expires_at_ms;

    event::emit(LimitsUpdated {
        vault_id: object::id(vault),
        max_per_tx,
        max_per_window,
        window_ms,
        min_balance,
        expires_at_ms,
    });
}

public entry fun execute_rule_payment<T>(
    vault: &mut AgentVault<T>,
    session_cap: &AgentSessionCap,
    rule_id: u64,
    nonce: u64,
    plan_hash: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let now = clock::timestamp_ms(clock);
    let available_balance = balance::value(&vault.balance);

    let (recipient, amount) = apply_payment_policy(
        vault,
        session_cap,
        rule_id,
        nonce,
        now,
        available_balance,
        sender,
    );

    let b = balance::split(&mut vault.balance, amount);
    let c = coin::from_balance(b, ctx);
    transfer::public_transfer(c, recipient);

    event::emit(PaymentExecuted {
        vault_id: object::id(vault),
        rule_id,
        recipient,
        amount,
        nonce,
        plan_hash,
        timestamp_ms: now,
    });
}

public fun vault_balance<T>(vault: &AgentVault<T>): u64 {
    balance::value(&vault.balance)
}

public fun rule_count<T>(vault: &AgentVault<T>): u64 {
    vector::length(&vault.rules)
}

fun apply_payment_policy<T>(
    vault: &mut AgentVault<T>,
    session_cap: &AgentSessionCap,
    rule_id: u64,
    nonce: u64,
    now: u64,
    available_balance: u64,
    sender: address,
): (address, u64) {
    assert!(session_cap.vault_id == object::id(vault), E_BAD_CAP);
    assert!(session_cap.agent == sender, E_NOT_AGENT);
    assert!(vault.agent == sender, E_NOT_AGENT);
    assert!(!vault.revoked, E_AGENT_REVOKED);
    assert!(!vault.paused, E_PAUSED);
    assert!(now <= vault.expires_at_ms, E_EXPIRED);
    assert!(nonce == vault.last_nonce + 1, E_BAD_NONCE);

    refresh_window(vault, now);

    let idx = rule_index(&vault.rules, rule_id);
    let (active, next_due_ms, amount, recipient, period_ms) = {
        let rule_view = vector::borrow(&vault.rules, idx);
        (
            rule_view.active,
            rule_view.next_due_ms,
            rule_view.amount,
            rule_view.recipient,
            rule_view.period_ms,
        )
    };

    assert!(active, E_RULE_INACTIVE);
    assert!(now >= next_due_ms, E_NOT_DUE);
    assert!(amount <= vault.max_per_tx, E_MAX_PER_TX);
    assert!(vault.spent_in_window + amount <= vault.max_per_window, E_WINDOW_LIMIT);
    assert!(available_balance >= amount + vault.min_balance, E_MIN_BALANCE);

    vault.spent_in_window = vault.spent_in_window + amount;
    vault.last_nonce = nonce;

    {
        let rule_mut = vector::borrow_mut(&mut vault.rules, idx);
        rule_mut.next_due_ms = now + period_ms;
    };

    (recipient, amount)
}

fun assert_owner<T>(vault: &AgentVault<T>, cap: &OwnerCap, ctx: &TxContext) {
    assert!(cap.vault_id == object::id(vault), E_BAD_CAP);
    assert!(tx_context::sender(ctx) == vault.owner, E_NOT_OWNER);
}

fun refresh_window<T>(vault: &mut AgentVault<T>, now: u64) {
    if (now >= vault.window_start_ms + vault.window_ms) {
        vault.window_start_ms = now;
        vault.spent_in_window = 0;
    };
}

fun rule_index(rules: &vector<PaymentRule>, rule_id: u64): u64 {
    let mut i = 0;
    let len = vector::length(rules);

    while (i < len) {
        let rule = vector::borrow(rules, i);
        if (rule.id == rule_id) {
            return i
        };
        i = i + 1;
    };

    abort E_RULE_NOT_FOUND
}

#[test_only]
public fun new_vault_for_testing<T>(
    owner: address,
    agent: address,
    max_per_tx: u64,
    max_per_window: u64,
    window_ms: u64,
    min_balance: u64,
    expires_at_ms: u64,
    now: u64,
    ctx: &mut TxContext,
): (AgentVault<T>, OwnerCap, AgentSessionCap) {
    let vault = AgentVault<T> {
        id: object::new(ctx),
        owner,
        agent,
        balance: balance::zero<T>(),
        max_per_tx,
        max_per_window,
        window_ms,
        window_start_ms: now,
        spent_in_window: 0,
        min_balance,
        expires_at_ms,
        paused: false,
        revoked: false,
        last_nonce: 0,
        next_rule_id: 1,
        rules: vector::empty<PaymentRule>(),
    };

    let vault_id = object::id(&vault);

    let owner_cap = OwnerCap {
        id: object::new(ctx),
        vault_id,
    };

    let session_cap = AgentSessionCap {
        id: object::new(ctx),
        vault_id,
        agent,
    };

    (vault, owner_cap, session_cap)
}

#[test_only]
public fun execute_policy_for_testing<T>(
    vault: &mut AgentVault<T>,
    session_cap: &AgentSessionCap,
    rule_id: u64,
    nonce: u64,
    now: u64,
    available_balance: u64,
    ctx: &mut TxContext,
): (address, u64) {
    apply_payment_policy(
        vault,
        session_cap,
        rule_id,
        nonce,
        now,
        available_balance,
        tx_context::sender(ctx),
    )
}

#[test_only]
public fun spent_in_window_for_testing<T>(vault: &AgentVault<T>): u64 {
    vault.spent_in_window
}

#[test_only]
public fun last_nonce_for_testing<T>(vault: &AgentVault<T>): u64 {
    vault.last_nonce
}

#[test_only]
public fun rule_next_due_for_testing<T>(vault: &AgentVault<T>, rule_id: u64): u64 {
    let idx = rule_index(&vault.rules, rule_id);
    vector::borrow(&vault.rules, idx).next_due_ms
}

#[test_only]
public fun destroy_for_testing<T>(
    vault: AgentVault<T>,
    owner_cap: OwnerCap,
    session_cap: AgentSessionCap,
) {
    let AgentVault {
        id,
        owner: _,
        agent: _,
        balance,
        max_per_tx: _,
        max_per_window: _,
        window_ms: _,
        window_start_ms: _,
        spent_in_window: _,
        min_balance: _,
        expires_at_ms: _,
        paused: _,
        revoked: _,
        last_nonce: _,
        next_rule_id: _,
        rules: _,
    } = vault;
    balance::destroy_zero(balance);
    object::delete(id);

    let OwnerCap { id, vault_id: _ } = owner_cap;
    object::delete(id);

    let AgentSessionCap {
        id,
        vault_id: _,
        agent: _,
    } = session_cap;
    object::delete(id);
}
