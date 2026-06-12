import { useState, useCallback } from 'react';
import { requirementService } from '@/infrastructure/config/services';
import { Requirement, RequirementStatus } from '@/domain/entities';
import { supabase } from '@/lib/supabase';
import { sendPhaseCompletedEmail, sendAllCompleteEmail, sendDocumentUploadedEmail } from '@/lib/resend';

export function useRequirements(userId: string | undefined) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequirements = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const data = await requirementService.getRequirements(userId);
      setRequirements(data);
      setError(null);
    } catch (err) {
      console.error('Error loading requirements:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateStatus = async (id: string, newStatus: RequirementStatus) => {
    try {
      await requirementService.updateRequirementStatus(id, newStatus);
      const updated = requirements.map((req) =>
        req.id === id ? { ...req, status: newStatus } : req
      );
      setRequirements(updated);

      // ── Email triggers on status → 'completed' ──────────────────────────
      if (newStatus === 'completed') {
        const changedReq = updated.find((r) => r.id === id);
        if (!changedReq) return;

        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email;
        const firstName = session?.user?.user_metadata?.full_name?.split(' ')[0];
        if (!email) return;

        const PHASE_NAMES: Record<number, string> = {
          1: 'DIY Documents',
          2: 'Bank & Notary',
          3: 'University Documents',
          4: 'Embassy Submission',
        };
        const NEXT_PHASE_NAMES: Record<number, string> = {
          1: 'Bank & Notary',
          2: 'University Documents',
          3: 'Embassy Submission',
        };

        const phaseReqs = updated.filter((r) => r.phase === changedReq.phase);
        const phaseAllDone = phaseReqs.every((r) => r.status === 'completed');
        const totalAllDone = updated.every((r) => r.status === 'completed');

        // Fire all-done email first (highest priority); skip phase email to avoid double send
        if (totalAllDone) {
          const flag = `vrh_email_alldone`;
          if (!sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, '1');
            sendAllCompleteEmail({ to: email, firstName, totalDocuments: updated.length }).catch(console.warn);
          }
        } else if (phaseAllDone) {
          const flag = `vrh_email_phase_${changedReq.phase}`;
          if (!sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, '1');
            sendPhaseCompletedEmail({
              to: email,
              firstName,
              phaseNumber: changedReq.phase,
              phaseName: PHASE_NAMES[changedReq.phase] ?? `Phase ${changedReq.phase}`,
              nextPhaseName: NEXT_PHASE_NAMES[changedReq.phase],
              completedCount: updated.filter((r) => r.status === 'completed').length,
              totalCount: updated.length,
            }).catch(console.warn);
          }
        }
      }
    } catch (err) {
      console.error('Status update error:', err);
      throw err;
    }
  };

  // Separate helper — call this from DocumentCard after a successful upload
  const notifyDocumentUploaded = async (params: {
    documentName: string;
    fileName: string;
    phase: number;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;
    const firstName = session?.user?.user_metadata?.full_name?.split(' ')[0];
    if (!email) return;
    sendDocumentUploadedEmail({ to: email, firstName, ...params }).catch(console.warn);
  };

  const updateName = async (id: string, newName: string) => {
    try {
      await requirementService.updateRequirementName(id, newName);
      setRequirements((prev) =>
        prev.map((req) => (req.id === id ? { ...req, name: newName } : req))
      );
    } catch (err) {
      console.error('Name change error:', err);
      throw err;
    }
  };

  const deleteRequirement = async (id: string) => {
    try {
      await requirementService.deleteRequirement(id);
      setRequirements((prev) => prev.filter((req) => req.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      throw err;
    }
  };

  const addRequirement = async (name: string, phase: number) => {
    if (!userId || !name.trim()) return;

    try {
      const data = await requirementService.addRequirement(userId, name, phase);
      setRequirements((prev) => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Add requirement error:', err);
      throw err;
    }
  };

  const resetAll = async () => {
    if (!userId) return;
    try {
      await requirementService.resetUser(userId);
      setRequirements([]);
    } catch (err) {
      console.error('Error resetting:', err);
      throw err;
    }
  };

  const getDownloadUrl = async (fileId: string) => {
    return requirementService.getDownloadUrl(fileId);
  };

  return {
    requirements,
    loading,
    error,
    fetchRequirements,
    updateStatus,
    updateName,
    deleteRequirement,
    addRequirement,
    resetAll,
    getDownloadUrl,
    notifyDocumentUploaded,
  };
}
