import React from 'react';
import { ChecklistItem } from './ChecklistItem';

interface Requirement {
  id: string;
  name: string;
  phase: number;
  status: 'pending' | 'in_progress' | 'completed';
  dependency_id?: string;
  gdrive_file_id?: string;
}

interface RoadmapPipelineProps {
  requirements: Requirement[];
  onStatusChange: (id: string, status: 'pending' | 'in_progress' | 'completed') => void;
  onFileUpload: (id: string, fileId: string) => void;
  onNameChange?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
}

const PHASE_INFO = {
  1: { title: 'Phase 1: DIY Documents', color: 'bg-blue-100 text-blue-900' },
  2: { title: 'Phase 2: Bank & Notary', color: 'bg-purple-100 text-purple-900' },
  3: { title: 'Phase 3: University', color: 'bg-amber-100 text-amber-900' },
  4: { title: 'Phase 4: Embassy', color: 'bg-green-100 text-green-900' },
};

export function RoadmapPipeline({
  requirements,
  onStatusChange,
  onFileUpload,
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
          <div className={`px-4 py-2 rounded-lg font-semibold mb-4 inline-block ${PHASE_INFO[phase as keyof typeof PHASE_INFO].color}`}>
            {PHASE_INFO[phase as keyof typeof PHASE_INFO].title}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {groupedByPhase[phase]?.map((req) => (
              <ChecklistItem
                key={req.id}
                id={req.id}
                name={req.name}
                phase={req.phase}
                status={req.status}
                isLocked={isRequirementLocked(req)}
                dependencyName={getDependencyName(req)}
                gdriveFileId={req.gdrive_file_id}
                onStatusChange={onStatusChange}
                onFileUpload={onFileUpload}
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
