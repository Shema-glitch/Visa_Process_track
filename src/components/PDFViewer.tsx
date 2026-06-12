import React, { useState, useEffect, useCallback } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { requirementService } from '@/infrastructure/config/services';

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  languageTag?: 'English' | 'Kinyarwanda' | 'Universal';
}

export function PDFViewer({ isOpen, onClose, fileId, fileName, languageTag }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPDFUrl = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = await requirementService.getDownloadUrl(fileId);
      setPdfUrl(url);
    } catch (err) {
      console.error('PDF fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    if (isOpen && fileId) {
      fetchPDFUrl();
    }
  }, [isOpen, fileId, fetchPDFUrl]);

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleOpenExternal = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{fileName}</DialogTitle>
              {languageTag && (
                <Badge variant={languageTag === 'English' ? 'default' : languageTag === 'Kinyarwanda' ? 'secondary' : 'outline'}>
                  {languageTag}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenExternal}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Drive
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted rounded-lg overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={fetchPDFUrl}>Try Again</Button>
              </div>
            </div>
          )}

          {pdfUrl && !isLoading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={fileName}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
