import { Requirement, Attachment, RequirementStatus } from '../domain/entities';

export interface RequirementTemplate {
  id: string;
  name: string;
  phase: number;
  requires_dual_language: boolean;
  category: string;
  created_at: string;
}

export interface IRequirementRepository {
  fetchByUserId(userId: string): Promise<Requirement[]>;
  fetchTemplates(): Promise<RequirementTemplate[]>;
  updateStatus(id: string, status: RequirementStatus): Promise<void>;
  updateName(id: string, name: string): Promise<void>;
  delete(id: string): Promise<void>;
  create(requirement: Omit<Requirement, 'id'>): Promise<Requirement>;
  bulkCreate(requirements: Omit<Requirement, 'id'>[]): Promise<void>;
  resetAll(userId: string): Promise<void>;
}

export interface IAttachmentRepository {
  fetchByRequirementId(requirementId: string): Promise<Attachment[]>;
  add(attachment: Omit<Attachment, 'id'>): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface IDriveRepository {
  initiateAuth(): void;
  handleCallback(code: string): Promise<void>;
  uploadFile(file: File, name: string, phase?: number): Promise<{ fileId: string }>;
  getFileUrl(fileId: string): Promise<string>;
  isConnected(userId: string): Promise<boolean>;
  verifyConnection(): Promise<{ connected: boolean; folderId?: string }>;
}
