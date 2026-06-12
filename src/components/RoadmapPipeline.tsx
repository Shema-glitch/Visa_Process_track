import React, { useMemo, useCallback } from 'react';
import { DocumentCard } from './document-tracker/DocumentCard';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Requirement, RequirementStatus } from '@/domain/entities';

interface RoadmapPipelineProps {
  requirements: Requirement[];
  isDriveConnected: boolean;
  onStatusChange: (id: string, status: RequirementStatus) => void;
  onNameChange?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
}

const PHASE_INFO = {
  1: { title: 'Phase 1: DIY Documents' },
  2: { title: 'Phase 2: Bank & Notary' },
  3: { title: 'Phase 3: University' },
  4: { title: 'Phase 4: Embassy' },
};

export function RoadmapPipeline({
  requirements,
  isDriveConnected,
  onStatusChange,
  onNameChange,
  onDelete,
}: RoadmapPipelineProps) {
  
  const getLockReason = useCallback((req: Requirement): string | undefined => {
    const isPhaseCompleted = (phaseNum: number) => {
      const phaseReqs = requirements.filter(r => r.phase === phaseNum);
      if (phaseReqs.length === 0) return true;
      return phaseReqs.every(r => r.status === 'completed');
    };

    if (req.name.toLowerCase().includes('acceptance letter') && req.phase === 3) {
      const paymentReceipt = requirements.find(r => 
        r.name.toLowerCase().includes('payment receipt')
      );
      if (paymentReceipt && paymentReceipt.status !== 'completed') {
        return `🔒 Locked: Requires Payment Receipt to be marked as Done first`;
      }
    }

    if (req.phase === 2 && !isPhaseCompleted(1)) {
      return `🔒 This document is locked. You must complete all items in Phase 1 before you can upload your ${req.name}.`;
    }
    if (req.phase === 3 && !isPhaseCompleted(2)) {
      return `🔒 This document is locked. You must complete all items in Phase 2 before you can upload your ${req.name}.`;
    }
    if (req.phase === 4 && !isPhaseCompleted(3)) {
      return `🔒 This document is locked. You must complete all items in Phase 3 before you can upload your ${req.name}.`;
    }

    if (req.dependencyId) {
      const dependency = requirements.find(r => r.id === req.dependencyId);
      if (dependency && dependency.status !== 'completed') {
        return `🔒 Locked: You must complete ${dependency.name} first.`;
      }
    }

    return undefined;
  }, [requirements]);

  const groupedByPhase = useMemo(() => {
    return requirements.reduce(
      (acc, req) => {
        const phase = req.phase;
        if (!acc[phase]) acc[phase] = [];
        acc[phase].push(req);
        return acc;
      },
      {} as Record<number, Requirement[]>
    );
  }, [requirements]);

  return (
    <div className="space-y-12">
      {[1, 2, 3, 4].map((phase) => (
        <div key={phase} className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${(phase - 1) * 150}ms` }}>
          <div className="flex items-center gap-4 mb-6">
            <Badge variant="secondary" className="px-3 py-1 text-sm font-bold tracking-tight bg-primary/10 text-primary border-primary/20">
              {PHASE_INFO[phase as keyof typeof PHASE_INFO].title}
            </Badge>
            <Separator className="flex-1 opacity-50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedByPhase[phase]?.map((req) => (
              <DocumentCard
                key={req.id}
                id={req.id}
                name={req.name}
                phase={req.phase}
                status={req.status}
                lockReason={getLockReason(req)}
                requiresDualLanguage={req.requiresDualLanguage}
                isDriveConnected={isDriveConnected}
                attachments={req.attachments}
                onStatusChange={onStatusChange}
                onNameChange={onNameChange}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
