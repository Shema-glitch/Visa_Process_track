import { useState, useCallback, useEffect } from 'react';
import { requirementService } from '@/infrastructure/config/services';
import { Attachment, LanguageTag } from '@/domain/entities';

export function useAttachments(requirementId: string, userId: string | undefined, initialAttachments?: Attachment[]) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments || []);
  const [loading, setLoading] = useState(false);
  const [uploadingLanguage, setUploadingLanguage] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (loading) return; // Prevent concurrent fetches
    setLoading(true);
    try {
      const data = await requirementService.getAttachments(requirementId);
      setAttachments(data);
    } catch (err) {
      console.error('Error fetching attachments:', err);
    } finally {
      setLoading(false);
    }
  }, [requirementId, loading]);

  useEffect(() => {
    // Only fetch if we don't have initial attachments
    if (!initialAttachments) {
      fetchAttachments();
    }
  }, [fetchAttachments, initialAttachments]);

  useEffect(() => {
    // Update internal state if initialAttachments change from above
    if (initialAttachments) {
      setAttachments(initialAttachments);
    }
  }, [initialAttachments]);

  const uploadFile = async (file: File, languageTag: LanguageTag) => {
    if (!userId) return;
    setUploadingLanguage(languageTag);
    try {
      await requirementService.uploadAttachment(userId, requirementId, file, languageTag);
      await fetchAttachments();
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    } finally {
      setUploadingLanguage(null);
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    try {
      await requirementService.removeAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error('Removal error:', err);
      throw err;
    }
  };

  const getDownloadUrl = async (fileId: string) => {
    return requirementService.getDownloadUrl(fileId);
  };

  return {
    attachments,
    loading,
    uploadingLanguage,
    uploadFile,
    removeAttachment,
    getDownloadUrl,
  };
}
