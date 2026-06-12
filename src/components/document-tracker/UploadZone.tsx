import * as React from "react"
import { Upload, CloudOff, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { LanguageTag } from "@/domain/entities"

interface UploadZoneProps {
  languageTag: LanguageTag
  label: string
  isDriveConnected: boolean
  isUploading: boolean
  onFileSelect: (files: FileList | null, languageTag: LanguageTag) => void
  className?: string
}

function UploadZone({
  languageTag,
  label,
  isDriveConnected,
  isUploading,
  onFileSelect,
  className,
}: UploadZoneProps) {
  const [dragActive, setDragActive] = React.useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files, languageTag)
    }
  }

  return (
    <label
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all cursor-pointer",
        dragActive
          ? "border-primary bg-primary/5 shadow-inner scale-[0.98]"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
        isUploading && "pointer-events-none opacity-60",
        !isDriveConnected && "border-amber-500/30 bg-amber-500/[0.02] hover:border-amber-500/50 hover:bg-amber-500/[0.05]",
        className
      )}
    >
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files, languageTag)}
        disabled={isUploading}
      />
      
      <div className={cn(
        "flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all duration-300",
        dragActive ? "bg-primary text-primary-foreground scale-110 rotate-3" : "group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105",
        !isDriveConnected && "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20"
      )}>
        {isUploading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : !isDriveConnected ? (
          <CloudOff className="size-6" />
        ) : (
          <Upload className="size-6" />
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground tracking-tight">
          {isUploading ? "Uploading..." : !isDriveConnected ? "Save locally" : label}
        </p>
        <p className="text-xs text-muted-foreground">
          {!isDriveConnected ? "Sync to Drive later" : "PDF, JPG, PNG or DOC"}
        </p>
      </div>

      <div className="absolute inset-0 rounded-xl bg-primary/0 transition-colors group-focus-within:bg-primary/5 ring-offset-background group-focus-within:ring-2 group-focus-within:ring-ring group-focus-within:ring-offset-2" />
    </label>
  )
}

export { UploadZone }
