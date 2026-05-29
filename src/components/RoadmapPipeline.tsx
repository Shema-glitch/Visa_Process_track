import React from 'react';
import { ChecklistItem } from './ChecklistItem';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface Requirement {
  id: string;
  name: string;
  phase: number;
  status: 'pending' | 'in_progress' | 'completed';
  dependency_id?: string;
  requires_dual_language: boolean;
}

interface RoadmapPipelineProps {
  requirements: Requirement[];
  onStatusChange: (id: string, status: 'pending' | 'in_progress' | 'completed') => void;
  onNameChange?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
}

const PHASE_INFO = {
  1: { title: 'Phase 1: DIY Documents', variant: 'default' as const },
  2: { title: 'Phase 2: Bank & Notary', variant: 'secondary' as const },
  3: { title: 'Phase 3: University', variant: 'warning' as const },
  4: { title: 'Phase 4: Embassy', variant: 'success' as const },
};

export function RoadmapPipeline({
  requirements,
  onStatusChange,
  onNameChange,
  onDelete,
}: RoadmapPipelineProps) {
  const buildDependencyMap = () => {
    const map = new Map<string, Requirement>();
    requirements.forEach((req) => {
      map.set(req.id, req);
    });
    return map;
  };

  const isRequirementLocked = (req: Requirement): boolean => {
    if (!req.dependency_id) return false;
    const depMap = buildDependencyMap();
    const dependency = depMap.get(req.dependency_id);
    return dependency ? dependency.status !== 'completed' : false;
  };

  const getDependencyName = (req: Requirement): string | undefined => {
    if (!req.dependency_id) return undefined;
    const depMap = buildDependencyMap();
    return depMap.get(req.dependency_id)?.name;
  };

  const groupedByPhase = requirements.reduce(
    (acc, req) => {
      const phase = req.phase;
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(req);
      return acc;
    },
    {} as Record<number, Requirement[]>
  );

  return (
    <div className="space-y-8">
      {[1, 2, 3, 4].map((phase) => (
        <div key={phase}>
          <div className="flex items-center gap-3 mb-4">
            <Badge
              variant={PHASE_INFO[phase as keyof typeof PHASE_INFO].variant}
              className="text-base px-4 py-2"
            >
              {PHASE_INFO[phase as keyof typeof PHASE_INFO].title}
            </Badge>
            <Separator className="flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedByPhase[phase]?.map((req) => (
              <ChecklistItem
                key={req.id}
                id={req.id}
                name={req.name}
                phase={req.phase}
                status={req.status}
                isLocked={isRequirementLocked(req)}
                dependencyName={getDependencyName(req)}
                requiresDualLanguage={req.requires_dual_language}
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
