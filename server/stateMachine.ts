import { CaseStatus, ProceedingStatus, UserRole } from '../src/types/judicial.js';

export interface StateTransitionValidationResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  allowedTransitions?: string[];
  requiredRoles?: UserRole[];
}

/**
 * State Transition Engine for Cases:
 * DRAFT -> PENDING_REVIEW -> PUBLISHED -> ARCHIVED
 * (and PENDING_REVIEW -> DRAFT for corrections)
 */
export function validateCaseTransition(
  currentStatus: CaseStatus,
  targetStatus: CaseStatus,
  userRole: UserRole
): StateTransitionValidationResult {
  if (currentStatus === targetStatus) {
    return {
      valid: false,
      errorCode: 'NOOP_TRANSITION',
      errorMessage: `Case is already in '${currentStatus}' status.`,
      allowedTransitions: getAvailableCaseTransitions(currentStatus)
    };
  }

  // Define graph of valid transitions
  const validTransitionsMap: Record<CaseStatus, { next: CaseStatus[]; roles: UserRole[] }[]> = {
    draft: [
      { next: ['pending_review'], roles: ['clerk', 'judge', 'chief_registrar', 'system_admin'] }
    ],
    pending_review: [
      { next: ['published'], roles: ['judge', 'chief_registrar', 'system_admin'] },
      { next: ['draft'], roles: ['judge', 'chief_registrar', 'system_admin'] } // return for correction
    ],
    published: [
      { next: ['archived'], roles: ['chief_registrar', 'system_admin'] }
    ],
    archived: [] // Terminal state, no further transitions allowed
  };

  const possibleTransitionRules = validTransitionsMap[currentStatus] || [];
  const matchedRule = possibleTransitionRules.find(rule => rule.next.includes(targetStatus));

  if (!matchedRule) {
    return {
      valid: false,
      errorCode: 'ILLEGAL_STATE_TRANSITION',
      errorMessage: `Illegal status jump from '${currentStatus}' to '${targetStatus}'. Workflow policy strictly requires sequential review progression.`,
      allowedTransitions: getAvailableCaseTransitions(currentStatus)
    };
  }

  if (!matchedRule.roles.includes(userRole)) {
    return {
      valid: false,
      errorCode: 'UNAUTHORIZED_TRANSITION_ROLE',
      errorMessage: `Your role '${userRole}' is not authorized to transition cases from '${currentStatus}' to '${targetStatus}'. Required role(s): ${matchedRule.roles.join(', ')}.`,
      allowedTransitions: getAvailableCaseTransitions(currentStatus),
      requiredRoles: matchedRule.roles
    };
  }

  return { valid: true };
}

export function getAvailableCaseTransitions(currentStatus: CaseStatus): string[] {
  switch (currentStatus) {
    case 'draft':
      return ['pending_review'];
    case 'pending_review':
      return ['published', 'draft'];
    case 'published':
      return ['archived'];
    case 'archived':
      return [];
    default:
      return [];
  }
}

/**
 * State Transition Engine for Proceedings:
 * DRAFT -> PUBLISHED
 */
export function validateProceedingTransition(
  currentStatus: ProceedingStatus,
  targetStatus: ProceedingStatus,
  userRole: UserRole
): StateTransitionValidationResult {
  if (currentStatus === targetStatus) {
    return {
      valid: false,
      errorCode: 'NOOP_TRANSITION',
      errorMessage: `Proceeding is already in '${currentStatus}' status.`,
      allowedTransitions: []
    };
  }

  if (currentStatus === 'draft' && targetStatus === 'published') {
    if (userRole === 'judge' || userRole === 'chief_registrar' || userRole === 'system_admin') {
      return { valid: true };
    }
    return {
      valid: false,
      errorCode: 'UNAUTHORIZED_PROCEEDING_PUBLISH',
      errorMessage: `Only Presiding Judges or the Chief Registrar can publish official court transcripts and session notes. Current role: '${userRole}'.`,
      allowedTransitions: ['published'],
      requiredRoles: ['judge', 'chief_registrar', 'system_admin']
    };
  }

  return {
    valid: false,
    errorCode: 'ILLEGAL_PROCEEDING_TRANSITION',
    errorMessage: `Illegal proceeding transition from '${currentStatus}' to '${targetStatus}'.`,
    allowedTransitions: currentStatus === 'draft' ? ['published'] : []
  };
}
