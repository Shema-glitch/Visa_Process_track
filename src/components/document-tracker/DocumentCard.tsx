import * as React from "react"
import { Lock, Edit2, Trash2, X, Check, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { DocumentAttachment } from "./DocumentAttachment"
import { UploadZone } from "./UploadZone"
import { PDFViewer } from "../PDFViewer"
import { useAttachments } from "@/hooks/useAttachments"
import { useAuth } from "@/contexts/useAuth"
import { RequirementStatus, LanguageTag, Attachment } from "@/domain/entities"

interface DocumentCardProps {
  id: string
  name: string
  phase: number
  status: RequirementStatus
  lockReason?: string
  isDriveConnected: boolean
  requiresDualLanguage: boolean
  attachments?: Attachment[]
  onStatusChange: (id: string, status: RequirementStatus) => void
  onNameChange?: (id: string, newName: string) => void
  onDelete?: (id: string) => void
  isMandatory?: boolean
  className?: string
}

function DocumentCard({
  id,
  name,
  phase,
  status,
  lockReason,
  isDriveConnected,
  requiresDualLanguage,
  attachments: initialAttachments,
  onStatusChange,
  onNameChange,
  onDelete,
  isMandatory = false,
  className,
}: DocumentCardProps) {
  const { user } = useAuth()
  const {
    attachments,
    uploadingLanguage,
    uploadFile,
    removeAttachment,
    getDownloadUrl,
  } = useAttachments(id, user?.id, initialAttachments)

  // Bridges the UploadZone's (files, languageTag) signature to the hook's uploadFile(file, lang)
  const handleFileSelect = async (files: FileList | null, languageTag: LanguageTag) => {
    if (!files || files.length === 0) return
    try {
      await uploadFile(files[0], languageTag)
    } catch (err) {
      console.error('handleFileSelect: Upload failed:', err)
    }
  }

  const [isEditing, setIsEditing] = React.useState(false)
  const [editedName, setEditedName] = React.useState(name)
  const [pdfViewer, setPdfViewer] = React.useState<{
    isOpen: boolean
    fileId: string
    fileName: string
    languageTag?: LanguageTag
  }>({
    isOpen: false,
    fileId: "",
    fileName: "",
  })

  const isCompleted = status === "completed" || attachments.length > 0
  const isLocked = !!lockReason

  const handleSaveEdit = () => {
    if (editedName.trim() && editedName !== name && onNameChange) {
      onNameChange(id, editedName.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedName(name)
    setIsEditing(false)
  }

  if (isLocked) {
    return (
      <Card
        className={cn(
          "relative overflow-hidden border-amber-500/10 bg-muted/30 opacity-80 transition-all",
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400/60 shadow-inner">
              <Lock className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-muted-foreground truncate">
                {name}
              </CardTitle>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-medium border-amber-500/20 text-amber-400/70">
                  Phase {phase}
                </Badge>
                <StatusBadge status="locked" className="scale-90 origin-left" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertCircle className="size-4 mt-0.5 text-amber-400" />
            <p className="text-xs font-medium leading-relaxed text-amber-300/90">
              {lockReason}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card
        className={cn(
          "group relative overflow-hidden border-zinc-700/60 transition-all duration-300 hover:border-zinc-500/50 hover:shadow-md active:scale-[0.99]",
          isCompleted && "border-emerald-500/20 bg-emerald-500/[0.02]",
          className
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl transition-all duration-500",
                  isCompleted
                    ? "bg-emerald-500/10 text-emerald-500 scale-110 shadow-emerald-500/10"
                    : "bg-muted text-muted-foreground shadow-inner"
                )}
              >
                <Check className={cn("size-5 transition-transform duration-500", isCompleted ? "scale-100 rotate-0" : "scale-0 rotate-90")} />
                {!isCompleted && <div className="absolute size-5 rounded-full border-2 border-muted-foreground/20" />}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                {isEditing ? (
                  <div className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-200">
                    <Input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      className="h-8 py-0 focus-visible:ring-primary/50"
                      autoFocus
                    />
                    <Button size="iconSm" variant="ghost" className="text-emerald-500 hover:bg-emerald-500/10" onClick={handleSaveEdit}>
                      <Check className="size-4" />
                    </Button>
                    <Button size="iconSm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleCancelEdit}>
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {name}
                      </CardTitle>
                      {isMandatory && (
                        <Badge variant="destructive" className="text-xs h-5 px-2 font-semibold">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-medium bg-muted/50 border-border/50">
                        Phase {phase}
                      </Badge>
                      <StatusBadge status={status} className="scale-90 origin-left" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 -mr-1">
              {!isEditing && onNameChange && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setIsEditing(true)}
                  className="hover:bg-primary/5 hover:text-primary"
                >
                  <Edit2 className="size-4" />
                </Button>
              )}
              {!isEditing && onDelete && !isMandatory && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => {
                    if (confirm("Delete this requirement?")) {
                      onDelete(id)
                    }
                  }}
                  className="hover:bg-destructive/5 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-0">
          {!isEditing && (
            <>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1 border border-border/50">
                {(["pending", "in_progress", "completed"] as RequirementStatus[]).map((s) => (
                  <Button
                    key={s}
                    size="action"
                    variant="ghost"
                    onClick={() => onStatusChange(id, s)}
                    className={cn(
                      "text-xs capitalize",
                      status === s
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                  >
                    {s.replace("_", " ")}
                  </Button>
                ))}
              </div>

              <div className="space-y-4">
                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {attachments.map((attachment) => (
                      <DocumentAttachment
                        key={attachment.id}
                        attachment={attachment}
                        onView={(a) => setPdfViewer({ isOpen: true, fileId: a.gDriveFileId, fileName: a.filename, languageTag: a.languageTag })}
                        onDownload={async (a) => {
                          const url = await getDownloadUrl(a.gDriveFileId)
                          const link = document.createElement("a")
                          link.href = url
                          link.download = a.filename
                          link.click()
                        }}
                        onRemove={handleRemoveFile}
                      />
                    ))}
                  </div>
                )}

                {requiresDualLanguage ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {["English", "Kinyarwanda"].map((lang) => {
                      const attachment = attachments.find((a) => a.languageTag === lang)
                      if (attachment) return null
                      return (
                        <UploadZone
                          key={lang}
                          languageTag={lang as LanguageTag}
                          label={`${lang === "English" ? "🇬🇧" : "🇷🇼"} ${lang} Version`}
                          isDriveConnected={isDriveConnected}
                          isUploading={uploadingLanguage === lang}
                          onFileSelect={handleFileSelect}
                        />
                      )
                    })}
                  </div>
                ) : (
                  attachments.length === 0 && (
                    <UploadZone
                      languageTag="Universal"
                      label="Upload Document"
                      isDriveConnected={isDriveConnected}
                      isUploading={uploadingLanguage === "Universal"}
                      onFileSelect={handleFileSelect}
                    />
                  )
                )}
              </div>
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
  )

  async function handleRemoveFile(attachment: Attachment) {
    if (!confirm("Are you sure you want to remove this file?")) return
    try {
      await removeAttachment(attachment.id)
    } catch (error) {
      console.error("File removal error:", error)
    }
  }
}

export { DocumentCard }
