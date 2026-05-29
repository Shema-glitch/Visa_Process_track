import React, { useState } from 'react';
import { Lock, CheckCircle2, Clock, Upload, AlertCircle, Edit2, Trash2, X, Check, FileText, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadFileToGoogleDrive } from '../lib/googleDrive';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useOnMobile } from '../hooks/useOnMobile';

interface ChecklistItemProps {
  id: string;
  name: string;
  phase: number;
  status: 'pending' | 'in_progress' | 'completed';
  isLocked: boolean;
  dependencyName?: string;
  gdriveFileId?: string;
  onStatusChange: (id: string, status: 'pending' | 'in_progress' | 'completed') => void;
  onFileUpload: (id: string, fileId: string) => void;
  onNameChange?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
  isMandatory?: boolean;
}

export function ChecklistItem({
  id,
  name,
  phase,
  status,
  isLocked,
  dependencyName,
  gdriveFileId,
  onStatusChange,
  onFileUpload,
  onNameChange,
  onDelete,
  isMandatory = false,
}: ChecklistItemProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const isMobile = useOnMobile();

  const handleStatusChange = async (newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const { error } = await supabase
        .from('requirements')
        .update({ status: newStatus, updated_at: new Date() })
        .eq('id', id);

      if (error) throw error;
      onStatusChange(id, newStatus);
    } catch (error) {
      console.error('Status update error:', error);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const result = await uploadFileToGoogleDrive(file);
      onFileUpload(id, result.fileId);

      const { error } = await supabase
        .from('requirements')
        .update({ gdrive_file_id: result.fileId, updated_at: new Date() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSaveEdit = () => {
    if (editedName.trim() && editedName !== name && onNameChange) {
      onNameChange(id, editedName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedName(name);
    setIsEditing(false);
  };

  const phaseConfig = {
    1: { label: 'Phase 1: DIY Documents', color: 'bg-blue-50 border-blue-300' },
    2: { label: 'Phase 2: Bank & Notary', color: 'bg-amber-50 border-amber-300' },
    3: { label: 'Phase 3: University', color: 'bg-emerald-50 border-emerald-300' },
    4: { label: 'Phase 4: Embassy', color: 'bg-purple-50 border-purple-300' },
  };

  const statusConfig = {
    pending: { icon: null, color: 'text-slate-400', badge: 'secondary' as const },
    in_progress: { icon: Clock, color: 'text-blue-600', badge: 'default' as const },
    completed: { icon: CheckCircle2, color: 'text-green-600', badge: 'success' as const },
  };

  if (isLocked) {
    return (
      <Card className="opacity-60 bg-slate-50 border-slate-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-600 truncate">{name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <p className="text-xs text-amber-700">
                  Locked until "{dependencyName}" is completed
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all hover:shadow-md ${phaseConfig[phase as keyof typeof phaseConfig].color}`}>
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 flex-shrink-0">
              {status === 'completed' && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              {status === 'in_progress' && (
                <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
              )}
              {status === 'pending' && (
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveEdit} className="px-2">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit} className="px-2">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base sm:text-lg text-slate-900 truncate">
                      {name}
                    </CardTitle>
                    {isMandatory && (
                      <Badge variant="destructive" className="text-xs flex-shrink-0">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {phaseConfig[phase as keyof typeof phaseConfig].label}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {gdriveFileId && (
              <Badge variant="success" className="gap-1">
                <Check className="w-3 h-3" />
                {!isMobile && <span>Backed up</span>}
              </Badge>
            )}

            {!isEditing && onNameChange && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8"
              >
                <Edit2 className="w-4 h-4 text-slate-600" />
              </Button>
            )}

            {!isEditing && onDelete && !isMandatory && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this requirement?')) {
                    onDelete(id);
                  }
                }}
                className="h-8 w-8 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!isEditing && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={status === 'pending' ? 'secondary' : 'outline'}
                onClick={() => handleStatusChange('pending')}
                className="flex-1 min-w-[80px]"
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={status === 'in_progress' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('in_progress')}
                className="flex-1 min-w-[80px]"
              >
                In Progress
              </Button>
              <Button
                size="sm"
                variant={status === 'completed' ? 'success' : 'outline'}
                onClick={() => handleStatusChange('completed')}
                className="flex-1 min-w-[80px]"
              >
                Done
              </Button>
            </div>

            <label
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`block border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                  : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <input
                type="file"
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={isUploading}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 py-4 sm:py-5 px-3">
                <Upload className={`w-4 h-4 ${isUploading ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-medium text-slate-700">
                  {isUploading ? 'Uploading...' : isMobile ? 'Tap to upload' : 'Drop file or click to upload'}
                </span>
              </div>
            </label>
          </>
        )}
      </CardContent>
    </Card>
  );
}
