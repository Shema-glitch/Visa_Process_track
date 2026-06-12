export type RequirementStatus = 'pending' | 'in_progress' | 'completed';
export type LanguageTag = 'English' | 'Kinyarwanda' | 'Universal';

export interface Requirement {
  id: string;
  name: string;
  phase: number;
  status: RequirementStatus;
  dependencyId: string | null;
  requiresDualLanguage: boolean;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  requirementId: string;
  userId: string;
  gDriveFileId: string;
  filename: string;
  languageTag: LanguageTag;
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}
