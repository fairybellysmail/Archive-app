import { EventEmitter } from 'events';
import crypto from 'crypto';
import {
  BaseDomainEvent,
  DocumentUploadedEvent,
  CaseStatusChangedEvent,
  CaseSealedEvent,
  ProceedingPublishedEvent,
  DocumentProcessingQueueInterface,
  DocumentProcessingQueueItem
} from '../src/types/judicial.js';

class JudicialDomainEventEmitter extends EventEmitter {
  private eventHistory: BaseDomainEvent[] = [];

  constructor() {
    super();
    this.setupListeners();
  }

  private setupListeners(): void {
    // Asynchronous event listener stubs for future microservice or message bus extensions
    this.on('DocumentUploadedEvent', (event: DocumentUploadedEvent) => {
      console.log(`[EVENT HOOK] DocumentUploadedEvent captured for Doc ID: ${event.payload.documentId} (Hash: ${event.payload.fileHash})`);
      this.recordHistory(event);
    });

    this.on('CaseStatusChangedEvent', (event: CaseStatusChangedEvent) => {
      console.log(`[EVENT HOOK] CaseStatusChangedEvent: Case ${event.payload.suitNumber} transitioned from ${event.payload.previousStatus} to ${event.payload.newStatus}`);
      this.recordHistory(event);
    });

    this.on('CaseSealedEvent', (event: CaseSealedEvent) => {
      console.log(`[EVENT HOOK] CaseSealedEvent: Case ${event.payload.suitNumber} sealed status changed to: ${event.payload.isSealed}`);
      this.recordHistory(event);
    });

    this.on('ProceedingPublishedEvent', (event: ProceedingPublishedEvent) => {
      console.log(`[EVENT HOOK] ProceedingPublishedEvent: Session date ${event.payload.sessionDate} published by Judge ${event.payload.presidingJudge}`);
      this.recordHistory(event);
    });
  }

  private recordHistory(event: BaseDomainEvent): void {
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 50) {
      this.eventHistory.pop();
    }
  }

  public getEventHistory(): BaseDomainEvent[] {
    return this.eventHistory;
  }

  public emitDocumentUploaded(payload: DocumentUploadedEvent['payload'], actorId: string): void {
    const event: DocumentUploadedEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'DocumentUploadedEvent',
      occurredAt: new Date().toISOString(),
      actorId,
      payload
    };
    this.emit('DocumentUploadedEvent', event);
  }

  public emitCaseStatusChanged(payload: CaseStatusChangedEvent['payload'], actorId: string): void {
    const event: CaseStatusChangedEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'CaseStatusChangedEvent',
      occurredAt: new Date().toISOString(),
      actorId,
      payload
    };
    this.emit('CaseStatusChangedEvent', event);
  }

  public emitCaseSealed(payload: CaseSealedEvent['payload'], actorId: string): void {
    const event: CaseSealedEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'CaseSealedEvent',
      occurredAt: new Date().toISOString(),
      actorId,
      payload
    };
    this.emit('CaseSealedEvent', event);
  }

  public emitProceedingPublished(payload: ProceedingPublishedEvent['payload'], actorId: string): void {
    const event: ProceedingPublishedEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'ProceedingPublishedEvent',
      occurredAt: new Date().toISOString(),
      actorId,
      payload
    };
    this.emit('ProceedingPublishedEvent', event);
  }

  public emitGenericEvent(eventType: string, payload: Record<string, any>, actorId: string): BaseDomainEvent {
    const event: BaseDomainEvent = {
      eventId: crypto.randomUUID(),
      eventType,
      occurredAt: new Date().toISOString(),
      actorId,
      payload
    };
    this.recordHistory(event);
    this.emit(eventType, event);
    return event;
  }
}

export const judicialEvents = new JudicialDomainEventEmitter();

/**
 * Pipeline Queue Interface implementation.
 * Policy Note: Per domain constraints, OCR and AI text extraction are strictly disabled
 * to preserve immutable forensic integrity of judicial records.
 */
class JudicialDocumentProcessingQueue implements DocumentProcessingQueueInterface {
  private queue: DocumentProcessingQueueItem[] = [];
  private processedCount = 0;

  public async enqueue(documentId: string, metadata: Record<string, any>): Promise<DocumentProcessingQueueItem> {
    const item: DocumentProcessingQueueItem = {
      id: crypto.randomUUID(),
      documentId,
      status: 'UNAVAILABLE_OCR_BYPASSED',
      enqueuedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      message: 'OCR/AI extraction strictly prohibited by Judicial Integrity Directives. File registered with deterministic SHA-256 integrity digest.'
    };
    this.queue.unshift(item);
    this.processedCount++;
    return item;
  }

  public getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processedCount: this.processedCount,
      recentItems: this.queue.slice(0, 10),
      policyStatement: 'Zero-AI/Zero-OCR Judicial Archive Integrity Policy Active. Cryptographic byte hashing enforced.',
      isAiOcrDisabled: true
    };
  }
}

export const documentProcessingQueue = new JudicialDocumentProcessingQueue();
