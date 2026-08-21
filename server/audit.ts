import crypto from 'crypto';
import { AuditLog, AuditVerificationResult, AuditAction } from '../src/types/judicial.js';

export interface AuditRecordPayload {
  userId: string | null;
  action: AuditAction | string;
  targetType: string;
  targetId: string;
  ipAddress: string;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: string;
}

class CryptographicAuditService {
  private static instance: CryptographicAuditService;
  private logs: AuditLog[] = [];
  private originalLogsBackup: AuditLog[] | null = null;
  private isTamperedState = false;

  private constructor() {}

  public static getInstance(): CryptographicAuditService {
    if (!CryptographicAuditService.instance) {
      CryptographicAuditService.instance = new CryptographicAuditService();
    }
    return CryptographicAuditService.instance;
  }

  /**
   * Deterministic canonical string formatting for SHA-256 hash calculation:
   * ${id}|${user_id || ''}|${action}|${target_id}|${created_at}|${previous_hash || ''}
   */
  public computeCanonicalHash(
    id: string,
    userId: string | null,
    action: string,
    targetId: string,
    createdAt: string,
    previousHash: string | null
  ): string {
    const canonicalString = `${id}|${userId || ''}|${action}|${targetId}|${createdAt}|${previousHash || ''}`;
    return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
  }

  /**
   * Append a new immutable audit log entry to the cryptographic chain.
   */
  public recordLog(payload: AuditRecordPayload): AuditLog {
    const id = crypto.randomUUID();
    const createdAt = payload.createdAt || new Date().toISOString();
    
    // Retrieve head of chain for previous_hash
    const previousEntry = this.logs.length > 0 ? this.logs[this.logs.length - 1] : null;
    const previousHash = previousEntry ? previousEntry.current_hash : null;

    const currentHash = this.computeCanonicalHash(
      id,
      payload.userId,
      payload.action,
      payload.targetId,
      createdAt,
      previousHash
    );

    const logEntry: AuditLog = {
      id,
      user_id: payload.userId,
      action: payload.action,
      target_type: payload.targetType,
      target_id: payload.targetId,
      ip_address: payload.ipAddress || '127.0.0.1',
      user_agent: payload.userAgent || null,
      metadata: payload.metadata || null,
      previous_hash: previousHash,
      current_hash: currentHash,
      created_at: createdAt
    };

    this.logs.push(logEntry);
    return logEntry;
  }

  /**
   * Retrieve all audit logs in reverse chronological or chronological order.
   */
  public getLogs(filters?: {
    userId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    startDate?: string;
    endDate?: string;
  }): AuditLog[] {
    let result = [...this.logs];

    if (filters) {
      if (filters.userId) {
        result = result.filter(l => l.user_id === filters.userId);
      }
      if (filters.action) {
        result = result.filter(l => l.action.toLowerCase().includes(filters.action!.toLowerCase()));
      }
      if (filters.targetType) {
        result = result.filter(l => l.target_type === filters.targetType);
      }
      if (filters.targetId) {
        result = result.filter(l => l.target_id === filters.targetId);
      }
      if (filters.startDate) {
        result = result.filter(l => new Date(l.created_at) >= new Date(filters.startDate!));
      }
      if (filters.endDate) {
        result = result.filter(l => new Date(l.created_at) <= new Date(filters.endDate!));
      }
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Cryptographically verify the integrity of the entire audit chain from genesis to head.
   */
  public verifyChainIntegrity(): AuditVerificationResult {
    const startTime = performance.now();

    if (this.logs.length === 0) {
      return {
        is_valid: true,
        total_blocks: 0,
        verified_at: new Date().toISOString(),
        genesis_hash: null,
        head_hash: null,
        broken_block_index: null,
        broken_block_id: null,
        failure_reason: null,
        verification_time_ms: Number((performance.now() - startTime).toFixed(2)),
        is_tampered_simulation: this.isTamperedState
      };
    }

    let previousHash: string | null = null;

    for (let i = 0; i < this.logs.length; i++) {
      const currentBlock = this.logs[i];

      // 1. Verify previous_hash link
      if (currentBlock.previous_hash !== previousHash) {
        return {
          is_valid: false,
          total_blocks: this.logs.length,
          verified_at: new Date().toISOString(),
          genesis_hash: this.logs[0].current_hash,
          head_hash: this.logs[this.logs.length - 1].current_hash,
          broken_block_index: i,
          broken_block_id: currentBlock.id,
          failure_reason: `Broken chain link at Block #${i + 1} (${currentBlock.id.substring(0, 8)}...). Expected previous_hash '${previousHash || 'NULL'}', but found '${currentBlock.previous_hash || 'NULL'}'.`,
          verification_time_ms: Number((performance.now() - startTime).toFixed(2)),
          is_tampered_simulation: this.isTamperedState
        };
      }

      // 2. Re-compute canonical hash for current block
      const calculatedHash = this.computeCanonicalHash(
        currentBlock.id,
        currentBlock.user_id,
        currentBlock.action,
        currentBlock.target_id,
        currentBlock.created_at,
        currentBlock.previous_hash
      );

      if (calculatedHash !== currentBlock.current_hash) {
        return {
          is_valid: false,
          total_blocks: this.logs.length,
          verified_at: new Date().toISOString(),
          genesis_hash: this.logs[0].current_hash,
          head_hash: this.logs[this.logs.length - 1].current_hash,
          broken_block_index: i,
          broken_block_id: currentBlock.id,
          failure_reason: `Hash mismatch at Block #${i + 1} (${currentBlock.id.substring(0, 8)}...). Stored hash '${currentBlock.current_hash}' does not match computed SHA-256 '${calculatedHash}'. Payload or timestamp was modified!`,
          verification_time_ms: Number((performance.now() - startTime).toFixed(2)),
          is_tampered_simulation: this.isTamperedState
        };
      }

      previousHash = currentBlock.current_hash;
    }

    return {
      is_valid: true,
      total_blocks: this.logs.length,
      verified_at: new Date().toISOString(),
      genesis_hash: this.logs[0].current_hash,
      head_hash: this.logs[this.logs.length - 1].current_hash,
      broken_block_index: null,
      broken_block_id: null,
      failure_reason: null,
      verification_time_ms: Number((performance.now() - startTime).toFixed(2)),
      is_tampered_simulation: this.isTamperedState
    };
  }

  /**
   * Tamper Simulation: Deliberately alter an historical audit record in memory
   * to prove that verifyChainIntegrity detects tampering instantly!
   */
  public simulateTamper(blockIndex?: number, fieldToAlter = 'action', newValue = 'TAMPERED_UNAUTHORIZED_MUTATION'): {
    success: boolean;
    tamperedBlockIndex: number;
    tamperedBlockId: string;
    originalValue: any;
    newValue: any;
  } {
    if (this.logs.length === 0) {
      throw new Error('Audit chain is empty. Cannot simulate tamper.');
    }

    if (!this.originalLogsBackup) {
      this.originalLogsBackup = JSON.parse(JSON.stringify(this.logs));
    }

    const targetIdx = blockIndex !== undefined && blockIndex >= 0 && blockIndex < this.logs.length
      ? blockIndex
      : Math.floor(this.logs.length / 2);

    const targetBlock = this.logs[targetIdx];
    const originalValue = (targetBlock as any)[fieldToAlter];
    (targetBlock as any)[fieldToAlter] = newValue;

    this.isTamperedState = true;

    return {
      success: true,
      tamperedBlockIndex: targetIdx,
      tamperedBlockId: targetBlock.id,
      originalValue,
      newValue
    };
  }

  /**
   * Restore original audit logs after tamper simulation.
   */
  public restoreOriginalChain(): { restored: boolean; blockCount: number } {
    if (this.originalLogsBackup) {
      this.logs = JSON.parse(JSON.stringify(this.originalLogsBackup));
      this.originalLogsBackup = null;
      this.isTamperedState = false;
      return { restored: true, blockCount: this.logs.length };
    }
    this.isTamperedState = false;
    return { restored: false, blockCount: this.logs.length };
  }

  public getRawChain(): AuditLog[] {
    return this.logs;
  }

  public setInitialSeed(seedLogs: AuditLog[]): void {
    this.logs = seedLogs;
  }
}

export const auditService = CryptographicAuditService.getInstance();
