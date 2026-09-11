import * as React from "react"
import { FileText, Eye, Download, X, Loader2, CloudOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Attachment } from "@/domain/entities"

interface DocumentAttachmentProps {
  attachment: Attachment
  onView: (attachment: Attachment) => void
  onDownload: (attachment: Attachment) => void
  onRemove: (attachment: Attachment) => void
  className?: string
}

function DocumentAttachment({
  attachment,
  onView,
  onDownload,
  onRemove,
  className,
}: DocumentAttachmentProps) {
  const [isRemoving, setIsRemoving] = React.useState(false)
  const isPendingSync = attachment.gDriveFileId === 'pending_sync'

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await onRemove(attachment)
    } finally {
      setIsRemoving(false)
    }
  }

  const languageLabel = {
    English: "🇬🇧 English",
    Kinyarwanda: "🇷🇼 Kinyarwanda",
    Universal: "Universal",
  }[attachment.languageTag]

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-sm",
        isPendingSync && "border-amber-500/20 bg-amber-500/[0.02]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary",
            isPendingSync && "bg-amber-500/10 text-amber-500"
          )}>
            {isPendingSync ? <CloudOff className="size-5" /> : <FileText className="size-5" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-semibold text-foreground">
              {attachment.filename}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className="w-fit border-border/50 bg-muted/50 text-xs font-medium"
              >
                {languageLabel}
              </Badge>
              {isPendingSync && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-none text-[10px] h-4 px-1.5 font-bold">
                  Sync pending
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="iconSm"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={handleRemove}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          <span className="sr-only">Remove attachment</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <Button
          variant="outline"
          size="action"
          className="text-xs"
          onClick={() => onView(attachment)}
          disabled={isPendingSync}
        >
          <Eye className="size-3.5" />
          {isPendingSync ? "Unlock Sync" : "View"}
        </Button>
        <Button
          variant="outline"
          size="action"
          className="text-xs"
          onClick={() => onDownload(attachment)}
          disabled={isPendingSync}
        >
          <Download className="size-3.5" />
          {isPendingSync ? "Cloud only" : "Download"}
        </Button>
      </div>
    </div>
  )
}

export { DocumentAttachment }
