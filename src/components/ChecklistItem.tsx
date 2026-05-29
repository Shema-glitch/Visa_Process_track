import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, Clock, Upload, AlertCircle, Edit2, Trash2, X, Check, FileText, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadFileToGoogleDrive } from '../lib/googleDrive';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { PDFViewer } from './PDFViewer';
import { useOnMobile } from '../hooks/useOnMobile';
import { cn } from '../lib/utils';

interface FileAttachment {
  id: string;
  gdrive_file_id: string;
  filename: string;
  language_tag: 'English' | 'Kinyarwanda' | 'Universal';
}

interface ChecklistItemProps {
  id: string;
  name: string;
  phase: number;
  status: 'pending' | 'in_progress' | 'completed';
  isLocked: boolean;
  dependencyName?: string;
  requiresDualLanguage: boolean;
  onStatusChange: (id: string, status: 'pending' | 'in_progress' | 'completed') => void;
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
  requiresDualLanguage,
  onStatusChange,
  onNameChange,
  onDelete,
  isMandatory = false,
}: ChecklistItemProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploadingLanguage, setUploadingLanguage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [pdfViewer, setPdfViewer] = useState<{ isOpen: boolean; fileId: string; fileName: string; languageTag?: 'English' | 'Kinyarwanda' | 'Universal' }>({
    isOpen: false,
    fileId: '',
    fileName: '',
  });
  const isMobile = useOnMobile();

  useEffect(() => {
    fetchAttachments();
  }, [id]);

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from('requirement_attachments')
      .select('*')
      .eq('requirement_id', id);

    if (!error && data) {
      setAttachments(data);
    }
  };

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

  const handleFileSelect = async (files: FileList | null, languageTag: 'English' | 'Kinyarwanda' | 'Universal') => {
    if (!files || files.length === 0) return;

    setUploadingLanguage(languageTag);
    try {
      const file = files[0];
      const result = await uploadFileToGoogleDrive(file, languageTag);

      const { error } = await supabase
        .from('requirement_attachments')
        .upsert({
          requirement_id: id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          gdrive_file_id: result.fileId,
          filename: file.name,
          language_tag: languageTag,
        }, {
          onConflict: 'requirement_id,language_tag'
        });

      if (error) throw error;
      await fetchAttachments();
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setUploadingLanguage(null);
    }
  };

  const handleDrag = (e: React.DragEvent, languageTag: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(languageTag);
    } else if (e.type === 'dragleave') {
      setDragActive(null);
    }
  };

  const handleDrop = (e: React.DragEvent, languageTag: 'English' | 'Kinyarwanda' | 'Universal') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    handleFileSelect(e.dataTransfer.files, languageTag);
  };

  const handleRemoveFile = async (attachment: FileAttachment) => {
    if (!confirm('Are you sure you want to remove this file?')) return;

    try {
      const { error } = await supabase
        .from('requirement_attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;
      await fetchAttachments();
    } catch (error) {
      console.error('File removal error:', error);
    }
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

  const getAttachment = (languageTag: string) => {
    return attachments.find(a => a.language_tag === languageTag);
  };

  const UploadZone = ({ languageTag, label }: { languageTag: 'English' | 'Kinyarwanda' | 'Universal'; label: string }) => {
    const attachment = getAttachment(languageTag);
    const isUploading = uploadingLanguage === languageTag;
    const isDragActive = dragActive === languageTag;

    if (attachment) {
      return (
        <div className="border rounded-lg p-3 bg-muted">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{attachment.filename}</span>
            </div>
            <Badge variant={languageTag === 'English' ? 'default' : languageTag === 'Kinyarwanda' ? 'secondary' : 'outline'} className="ml-2">
              {languageTag === 'English' ? '🇬🇧 English' : languageTag === 'Kinyarwanda' ? '🇷🇼 Kinyarwanda' : 'Universal'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPdfViewer({
                isOpen: true,
                fileId: attachment.gdrive_file_id,
                fileName: attachment.filename,
                languageTag: attachment.language_tag,
              })}
              className="flex-1"
            >
              <Eye className="w-3 h-3 mr-2" />
              View
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemoveFile(attachment)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <label
        onDragEnter={(e) => handleDrag(e, languageTag)}
        onDragLeave={(e) => handleDrag(e, languageTag)}
        onDragOver={(e) => handleDrag(e, languageTag)}
        onDrop={(e) => handleDrop(e, languageTag)}
        className={cn(
          "block border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-accent"
            : "border-border bg-background hover:border-muted-foreground hover:bg-muted/50"
        )}
      >
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => handleFileSelect(e.target.files, languageTag)}
          disabled={isUploading}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center py-3 px-3">
          <Upload className={cn("w-4 h-4 mb-1", isUploading && "animate-pulse")} />
          <span className="text-xs font-medium text-center">
            {isUploading ? 'Uploading...' : label}
          </span>
        </div>
      </label>
    );
  };

  if (isLocked) {
    return (
      <Card className="opacity-50 pointer-events-none">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <AlertCircle className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
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
    <>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 flex-shrink-0">
                {(attachments.length > 0 || status === 'completed') && (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                )}
                {status === 'in_progress' && (
                  <Clock className="w-5 h-5 text-muted-foreground animate-pulse" />
                )}
                {status === 'pending' && attachments.length === 0 && (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      className="flex-1"
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
                      <CardTitle className="text-sm sm:text-base font-medium text-foreground truncate">
                        {name}
                      </CardTitle>
                      {isMandatory && (
                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Phase {phase}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {attachments.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="w-3 h-3" />
                  {!isMobile && <span>{attachments.length} file{attachments.length > 1 ? 's' : ''}</span>}
                </Badge>
              )}

              {!isEditing && onNameChange && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8"
                >
                  <Edit2 className="w-4 h-4" />
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
                  className="h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
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
                  variant={status === 'completed' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('completed')}
                  className="flex-1 min-w-[80px]"
                >
                  Done
                </Button>
              </div>

              {requiresDualLanguage ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UploadZone languageTag="English" label="🇬🇧 English Version" />
                  <UploadZone languageTag="Kinyarwanda" label="🇷🇼 Kinyarwanda Version" />
                </div>
              ) : (
                <UploadZone languageTag="Universal" label={isMobile ? "Tap to upload file" : "Drop file or click to upload"} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PDFViewer
        isOpen={pdfViewer.isOpen}
        onClose={() => setPdfViewer({ ...pdfViewer, isOpen: false })}
        fileId={pdfViewer.fileId}
        fileName={pdfViewer.fileName}
        languageTag={pdfViewer.languageTag}
      />
    </>
  );
}
