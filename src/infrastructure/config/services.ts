import { SupabaseRequirementRepository } from '../api/SupabaseRequirementRepository';
import { SupabaseAttachmentRepository } from '../api/SupabaseAttachmentRepository';
import { GoogleDriveRepository } from '../api/GoogleDriveRepository';
import { RequirementService } from '../../services/RequirementService';

const requirementRepo = new SupabaseRequirementRepository();
const attachmentRepo = new SupabaseAttachmentRepository();
const driveRepo = new GoogleDriveRepository();

export const requirementService = new RequirementService(
  requirementRepo,
  attachmentRepo,
  driveRepo
);

export const driveRepository = driveRepo; // Export for auth callback handling
export { requirementRepo, attachmentRepo, driveRepo };
