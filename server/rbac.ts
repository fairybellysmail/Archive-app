import { Request, Response, NextFunction } from 'express';
import { User, UserRole, Case } from '../src/types/judicial.js';
import { db } from './db.js';
import { auditService } from './audit.js';

// Extend Express Request to carry authenticated user
declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

// Current active session tracking
let currentActiveUserId = '22222222-2222-4222-8222-222222222222'; // Default: Barr. Folasade Craig (Chief Registrar)

export function getActiveUserId(): string {
  return currentActiveUserId;
}

export function setActiveUserId(userId: string): User {
  const user = db.users.get(userId);
  if (!user) {
    throw new Error(`User with ID '${userId}' not found.`);
  }
  currentActiveUserId = userId;
  return user;
}

/**
 * Authentication Middleware: attaches current simulated authenticated user.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestedUserId = (req.headers['x-judicial-user-id'] as string) || currentActiveUserId;
  const user = db.users.get(requestedUserId);

  if (!user || !user.is_active) {
    return res.status(401).json({
      error: 'UNAUTHORIZED_JUDICIAL_SESSION',
      message: 'Invalid or deactivated judicial officer credential session.'
    });
  }

  req.currentUser = user;
  next();
}

/**
 * Role-Based Access Control Guard
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }

    if (!allowedRoles.includes(req.currentUser.role)) {
      // Record security violation to immutable audit ledger
      auditService.recordLog({
        userId: req.currentUser.id,
        action: 'ACCESS_DENIED_VIOLATION',
        targetType: 'EndpointSecurity',
        targetId: '00000000-0000-0000-0000-000000000000',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'],
        metadata: {
          attemptedPath: req.path,
          method: req.method,
          userRole: req.currentUser.role,
          requiredRoles: allowedRoles
        }
      });

      return res.status(403).json({
        error: 'FORBIDDEN_JUDICIAL_PRIVILEGE',
        message: `Your current role '${req.currentUser.role}' does not possess required privilege (${allowedRoles.join(', ')}).`,
        currentRole: req.currentUser.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

/**
 * Verify if current user can view a specific case (considering Sealed Status)
 */
export function checkCaseAccess(user: User, caseRecord: Case): { allowed: boolean; reason?: string } {
  if (!caseRecord.is_sealed) {
    return { allowed: true };
  }

  // Sealed Case Rules: Chief Registrar, Judge, and System Admin have authorization.
  // Standard Clerks and general Auditors without security clearance are denied access.
  if (user.role === 'chief_registrar' || user.role === 'system_admin' || user.role === 'judge') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Case #${caseRecord.suit_number} is a SEALED Judicial Docket pursuant to In-Camera Protective Order. Access restricted to Presiding Judges and the Chief Registrar.`
  };
}
