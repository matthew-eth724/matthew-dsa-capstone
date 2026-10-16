// Booking state machine for Event Ticketing capstone
import { DomainError } from './errors.js';

// Booking states
const PENDING = 'pending';
const PAID = 'paid';
const CANCELLED = 'cancelled';
const REFUNDED = 'refunded';
const CHECKED_IN = 'checked_in';

// Allowed transitions: source -> [targets]
const TRANSITIONS = {
  [PENDING]: [PAID, CANCELLED],
  [PAID]: [CHECKED_IN, REFUNDED, CANCELLED],
  [CANCELLED]: [], // final state
  [REFUNDED]: [], // final state
  [CHECKED_IN]: [], // final state
};

// Check if a transition is allowed
export function canTransition(source, target) {
  if (!TRANSITIONS[source]) {
    return false;
  }
  return TRANSITIONS[source].includes(target);
}

// Assert a transition is allowed, throw DomainError if not
export function assertTransition(source, target) {
  if (!canTransition(source, target)) {
    throw new DomainError(
      'INVALID_TRANSITION',
      `Cannot transition from ${source} to ${target}`,
      {
        source,
        target,
        allowed: TRANSITIONS[source] || [],
      }
    );
  }
}

// Get all possible target states for a source state
export function getPossibleTargets(source) {
  return TRANSITIONS[source] || [];
}

// Get all source states that can transition to a target
export function getPossibleSources(target) {
  const sources = [];
  for (const [source, targets] of Object.entries(TRANSITIONS)) {
    if (targets.includes(target)) {
      sources.push(source);
    }
  }
  return sources;
}

// Check if a state is final (no outgoing transitions)
export function isFinalState(state) {
  return !TRANSITIONS[state] || TRANSITIONS[state].length === 0;
}

// Get all states
export function getAllStates() {
  return [PENDING, PAID, CANCELLED, REFUNDED, CHECKED_IN];
}

// Get state transitions as a readable format
export function getTransitions() {
  return Object.entries(TRANSITIONS)
    .filter(([source, targets]) => targets.length > 0)
    .map(([source, targets]) => ({ source, targets }));
}

// Validate state value
export function isValidState(state) {
  return getAllStates().includes(state);
}