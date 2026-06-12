import { supabase } from '../../lib/supabase';
import { IRequirementRepository, RequirementTemplate } from '../../domain/repositories';
import { Requirement, RequirementStatus } from '../../domain/entities';

export class SupabaseRequirementRepository implements IRequirementRepository {
  async fetchByUserId(userId: string): Promise<Requirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select('*, requirement_attachments(*)')
      .eq('user_id', userId)
      .order('phase', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => this.mapToDomain(row));
  }

  async fetchTemplates(): Promise<RequirementTemplate[]> {
    const { data, error } = await supabase
      .from('requirement_templates')
      .select('*')
      .order('phase', { ascending: true });

    if (error) throw error;
    return (data || []) as RequirementTemplate[];
  }

  async updateStatus(id: string, status: RequirementStatus): Promise<void> {
    const { error } = await supabase
      .from('requirements')
      .update({ status, updated_at: new Date() })
      .eq('id', id);

    if (error) throw error;
  }

  async updateName(id: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('requirements')
      .update({ name, updated_at: new Date() })
      .eq('id', id);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async create(req: Omit<Requirement, 'id'>): Promise<Requirement> {
    const { data, error } = await supabase
      .from('requirements')
      .insert({
        user_id: req.userId,
        name: req.name,
        phase: req.phase,
        status: req.status,
        dependency_id: req.dependencyId,
        requires_dual_language: req.requiresDualLanguage,
      })
      .select('*, requirement_attachments(*)')
      .single();

    if (error) throw error;
    return this.mapToDomain(data);
  }

  async bulkCreate(requirements: Omit<Requirement, 'id'>[]): Promise<void> {
    const { error } = await supabase
      .from('requirements')
      .insert(requirements.map(req => ({
        user_id: req.userId,
        name: req.name,
        phase: req.phase,
        status: req.status,
        dependency_id: req.dependencyId,
        requires_dual_language: req.requiresDualLanguage,
      })));

    if (error) throw error;
  }

  async resetAll(userId: string): Promise<void> {
    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  private mapToDomain(row: Record<string, any>): Requirement {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      phase: row.phase,
      status: row.status as RequirementStatus,
      dependencyId: row.dependency_id,
      requiresDualLanguage: row.requires_dual_language,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attachments: row.requirement_attachments ? (row.requirement_attachments as any[]).map(att => ({
        id: att.id,
        requirementId: att.requirement_id,
        userId: att.user_id,
        gDriveFileId: att.gdrive_file_id,
        filename: att.filename,
        languageTag: att.language_tag,
      })) : [],
    };
  }
}
