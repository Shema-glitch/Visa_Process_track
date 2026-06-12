import * as React from "react"
import { FileText, Eye, Download, X, Loader2 } from "lucide-react"

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
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <FileText className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-semibold text-foreground">
              {attachment.filename}
            </span>
            <Badge
              variant="outline"
              className="mt-1 w-fit border-border/50 bg-muted/50 text-xs font-medium"
            >
              {languageLabel}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
          size="sm"
          className="h-9 gap-2 text-xs"
          onClick={() => onView(attachment)}
        >
          <Eye className="size-3.5" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-xs"
          onClick={() => onDownload(attachment)}
        >
          <Download className="size-3.5" />
          Download
        </Button>
      </div>
    </div>
  )
}

export { DocumentAttachment }
