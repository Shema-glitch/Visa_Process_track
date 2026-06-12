import { supabase } from '../../lib/supabase';
import { IAttachmentRepository } from '../../domain/repositories';
import { Attachment } from '../../domain/entities';

export class SupabaseAttachmentRepository implements IAttachmentRepository {
  async fetchByRequirementId(requirementId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from('requirement_attachments')
      .select('*')
      .eq('requirement_id', requirementId);

    if (error) throw error;
    return (data || []).map(this.mapToDomain);
  }

  async add(attachment: Omit<Attachment, 'id'>): Promise<void> {
    const { error } = await supabase
      .from('requirement_attachments')
      .upsert({
        requirement_id: attachment.requirementId,
        user_id: attachment.userId,
        gdrive_file_id: attachment.gDriveFileId,
        filename: attachment.filename,
        language_tag: attachment.languageTag,
      }, {
        onConflict: 'requirement_id,language_tag'
      });

    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('requirement_attachments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private mapToDomain(row: Record<string, unknown>): Attachment {
    return {
      id: row.id as string,
      requirementId: row.requirement_id as string,
      userId: row.user_id as string,
      gDriveFileId: row.gdrive_file_id as string,
      filename: row.filename as string,
      languageTag: row.language_tag as Attachment['languageTag'],
    };
  }
}
