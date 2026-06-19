#[test_only]
module agent_treasury::vault_tests;

use agent_treasury::vault;
use sui::sui::SUI;
use sui::test_scenario;

const OWNER: address = @0xA;
const AGENT: address = @0xB;
const RECIPIENT: address = @0xC;
const INTRUDER: address = @0xD;

const E_BAD_CAP: u64 = 2;
const E_AGENT_REVOKED: u64 = 3;
const E_PAUSED: u64 = 4;
const E_EXPIRED: u64 = 5;
const E_NOT_DUE: u64 = 8;
const E_MAX_PER_TX: u64 = 9;
const E_WINDOW_LIMIT: u64 = 10;
const E_MIN_BALANCE: u64 = 11;
const E_BAD_NONCE: u64 = 12;
const E_NOT_AGENT: u64 = 13;

#[test]
fun execute_policy_updates_nonce_window_and_due_time() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = vault::new_vault_for_testing<SUI>(
        OWNER,
        AGENT,
        100,
        150,
        1_000,
        10,
        10_000,
        0,
        test_scenario::ctx(&mut scenario),
    );

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        100,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );

    let _ = test_scenario::next_tx(&mut scenario, AGENT);
    let (recipient, amount) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        1,
        100,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    assert!(recipient == RECIPIENT, 100);
    assert!(amount == 50, 101);
    assert!(vault::last_nonce_for_testing(&vault) == 1, 102);
    assert!(vault::spent_in_window_for_testing(&vault) == 50, 103);
    assert!(vault::rule_next_due_for_testing(&vault, 1) == 1_100, 104);

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_NOT_DUE, location = agent_treasury::vault)]
fun execute_before_due_time_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = default_fixture(&mut scenario);

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        500,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );

    let _ = test_scenario::next_tx(&mut scenario, AGENT);
    let (_recipient, _amount) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        1,
        499,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_NOT_AGENT, location = agent_treasury::vault)]
fun wrong_agent_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = default_fixture(&mut scenario);

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        100,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );

    let _ = test_scenario::next_tx(&mut scenario, INTRUDER);
    let (_recipient, _amount) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        1,
        100,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_BAD_CAP, location = agent_treasury::vault)]
fun wrong_session_cap_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = default_fixture(&mut scenario);
    let (other_vault, other_owner_cap, other_session_cap) = vault::new_vault_for_testing<SUI>(
        OWNER,
        AGENT,
        100,
        150,
        1_000,
        10,
        10_000,
        0,
        test_scenario::ctx(&mut scenario),
    );

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        100,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );

    let _ = test_scenario::next_tx(&mut scenario, AGENT);
    let (_recipient, _amount) = vault::execute_policy_for_testing(
        &mut vault,
        &other_session_cap,
        1,
        1,
        100,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    vault::destroy_for_testing(other_vault, other_owner_cap, other_session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_MAX_PER_TX, location = agent_treasury::vault)]
fun add_rule_over_max_per_tx_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = default_fixture(&mut scenario);

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        101,
        1_000,
        100,
        b"too-large",
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_WINDOW_LIMIT, location = agent_treasury::vault)]
fun rolling_window_limit_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = vault::new_vault_for_testing<SUI>(
        OWNER,
        AGENT,
        100,
        80,
        10_000,
        0,
        20_000,
        0,
        test_scenario::ctx(&mut scenario),
    );

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        100,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );

    let _ = test_scenario::next_tx(&mut scenario, AGENT);
    let (_recipient_1, _amount_1) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        1,
        100,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    let (_recipient_2, _amount_2) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        2,
        1_100,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_MIN_BALANCE, location = agent_treasury::vault)]
fun min_balance_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = default_fixture(&mut scenario);

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        100,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );

    let _ = test_scenario::next_tx(&mut scenario, AGENT);
    let (_recipient, _amount) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        1,
        100,
        59,
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_BAD_NONCE, location = agent_treasury::vault)]
fun bad_nonce_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = default_fixture(&mut scenario);

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        100,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );

    let _ = test_scenario::next_tx(&mut scenario, AGENT);
    let (_recipient, _amount) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        2,
        100,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_PAUSED, location = agent_treasury::vault)]
fun paused_vault_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = default_fixture(&mut scenario);

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        100,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );
    vault::pause(&mut vault, &owner_cap, test_scenario::ctx(&mut scenario));

    let _ = test_scenario::next_tx(&mut scenario, AGENT);
    let (_recipient, _amount) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        1,
        100,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_AGENT_REVOKED, location = agent_treasury::vault)]
fun revoked_agent_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = default_fixture(&mut scenario);

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        100,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );
    vault::revoke_agent(&mut vault, &owner_cap, test_scenario::ctx(&mut scenario));

    let _ = test_scenario::next_tx(&mut scenario, AGENT);
    let (_recipient, _amount) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        1,
        100,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_EXPIRED, location = agent_treasury::vault)]
fun expired_session_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut vault, owner_cap, session_cap) = default_fixture(&mut scenario);

    vault::add_rule(
        &mut vault,
        &owner_cap,
        RECIPIENT,
        50,
        1_000,
        100,
        b"rent",
        test_scenario::ctx(&mut scenario),
    );

    let _ = test_scenario::next_tx(&mut scenario, AGENT);
    let (_recipient, _amount) = vault::execute_policy_for_testing(
        &mut vault,
        &session_cap,
        1,
        1,
        10_001,
        1_000,
        test_scenario::ctx(&mut scenario),
    );

    vault::destroy_for_testing(vault, owner_cap, session_cap);
    let _ = test_scenario::end(scenario);
}

fun default_fixture(
    scenario: &mut test_scenario::Scenario,
): (vault::AgentVault<SUI>, vault::OwnerCap, vault::AgentSessionCap) {
    vault::new_vault_for_testing<SUI>(
        OWNER,
        AGENT,
        100,
        150,
        1_000,
        10,
        10_000,
        0,
        test_scenario::ctx(scenario),
    )
}
