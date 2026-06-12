import { IRequirementRepository, IAttachmentRepository, IDriveRepository, RequirementTemplate } from '../domain/repositories';
import { Requirement, Attachment, RequirementStatus, LanguageTag } from '../domain/entities';

export class RequirementService {
  constructor(
    private requirementRepo: IRequirementRepository,
    private attachmentRepo: IAttachmentRepository,
    private driveRepo: IDriveRepository
  ) {}

  async getRequirements(userId: string): Promise<Requirement[]> {
    return this.requirementRepo.fetchByUserId(userId);
  }

  /**
   * Adds a single requirement from the Dashboard "Add Requirement" dialog.
   * Does NOT query requirement_templates — the caller passes phase directly.
   * The requiresDualLanguage flag defaults to false for manually added items.
   */
  async addRequirement(userId: string, name: string, phase: number): Promise<Requirement> {
    return this.requirementRepo.create({
      userId,
      name: name.trim(),
      phase,
      status: 'pending',
      dependencyId: null,
      requiresDualLanguage: false,
    });
  }

  async updateRequirementStatus(id: string, status: RequirementStatus): Promise<void> {
    await this.requirementRepo.updateStatus(id, status);
  }

  async updateRequirementName(id: string, name: string): Promise<void> {
    await this.requirementRepo.updateName(id, name);
  }

  async deleteRequirement(id: string): Promise<void> {
    await this.requirementRepo.delete(id);
  }

  async getAttachments(requirementId: string): Promise<Attachment[]> {
    return this.attachmentRepo.fetchByRequirementId(requirementId);
  }

  async uploadAttachment(
    userId: string,
    requirementId: string,
    file: File,
    languageTag: LanguageTag
  ): Promise<void> {
    const isConnected = await this.driveRepo.isConnected(userId);
    let fileId = 'pending_sync';

    if (isConnected) {
      try {
        const driveName = `${languageTag}_${file.name}`;
        const result = await this.driveRepo.uploadFile(file, driveName);
        fileId = result.fileId;
      } catch (err) {
        console.warn('Drive upload failed, falling back to local-first metadata:', err);
        // We still proceed to save metadata so the user doesn't lose progress
      }
    }

    await this.attachmentRepo.add({
      requirementId,
      userId,
      gDriveFileId: fileId,
      filename: file.name,
      languageTag,
    });
  }

  async removeAttachment(attachmentId: string): Promise<void> {
    await this.attachmentRepo.remove(attachmentId);
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    return this.driveRepo.getFileUrl(fileId);
  }

  async isDriveConnected(userId: string): Promise<boolean> {
    return this.driveRepo.isConnected(userId);
  }

  async resetUser(userId: string): Promise<void> {
    await this.requirementRepo.resetAll(userId);
  }

  /**
   * Bulk-saves requirements selected during the onboarding flow.
   * The onboarding flow already provides phase, category, and mandatory from
   * the VISA_DATA constant — no need to query requirement_templates at all.
   * Each selected requirement is mapped directly to a DB row.
   */
  async setupInitialRequirements(
    userId: string,
    selectedReqs: Array<{ name: string; category?: string; mandatory?: boolean }>,
    _country?: string   // reserved for future per-country logic; unused for now
  ): Promise<void> {
    // Phase mapping derived from the onboarding STANDARD_REQUIREMENTS categories.
    // This avoids any DB lookup while preserving the correct phase assignment.
    const CATEGORY_TO_PHASE: Record<string, number> = {
      Identity:    1,
      Application: 1,
      Background:  2,
      Health:      2,
      Financial:   3,
      Education:   3,
      Travel:      4,
      Logistics:   4,
      Custom:      4,
    };

    const requirementsData = selectedReqs.map((selected) => {
      const phase = CATEGORY_TO_PHASE[selected.category ?? 'Custom'] ?? 4;
      return {
        userId,
        name: selected.name,
        phase,
        status: 'pending' as RequirementStatus,
        dependencyId: null,
        requiresDualLanguage: false,
      };
    });

    await this.requirementRepo.bulkCreate(requirementsData);
  }

  /**
   * Kept for API compatibility — returns an empty array since requirement_templates
   * is not available in the current DB schema. The onboarding flow provides its
   * own template data via the VISA_DATA constant in OnboardingFlow.tsx.
   */
  async getRequirementTemplates(): Promise<RequirementTemplate[]> {
    return [];
  }
}
