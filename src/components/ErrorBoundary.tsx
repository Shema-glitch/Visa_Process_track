import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Send, Monitor, Info } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reportSent: boolean;
  reportText: string;
  showReportForm: boolean;
}

// Maps known technical error messages to user-friendly guidance.
const getErrorGuidance = (error: Error | null) => {
  if (!error) return null;
  const msg = error.message.toLowerCase();

  if (msg.includes('handlefileselect') || msg.includes('is not defined') || msg.includes('is not a function')) {
    return {
      title: 'A feature failed to load correctly.',
      steps: [
        'Reload the page — this usually fixes the issue instantly.',
        'Clear your browser cache (Ctrl+Shift+R / Cmd+Shift+R) and try again.',
        'If you are on mobile, try opening the app in a fresh browser tab.',
      ],
    };
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return {
      title: 'A network request failed.',
      steps: [
        'Check your internet connection.',
        'Reload the page and try again.',
        'If this keeps happening, you can try logging in from another device.',
      ],
    };
  }
  if (msg.includes('supabase') || msg.includes('auth') || msg.includes('session')) {
    return {
      title: 'There was a problem with your session.',
      steps: [
        'Try signing out and signing back in.',
        'You can also log in from a different browser or device.',
        'Your documents are safe and will still be there when you log back in.',
      ],
    };
  }
  return {
    title: 'An unexpected error occurred.',
    steps: [
      'Reload the page to try again.',
      'If the problem continues, use the "Report Issue" button below to let us know.',
      'You can also try logging in from another device in the meantime.',
    ],
  };
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    reportSent: false,
    reportText: '',
    showReportForm: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Send to Sentry with full context
    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setContext('errorInfo', { componentStack: errorInfo.componentStack });
      scope.setTag('source', 'ErrorBoundary');
      Sentry.captureException(error);
    });
    console.error('🛡️ ErrorBoundary caught:', error, errorInfo);
  }

  private handleSubmitReport = () => {
    const { error, errorInfo, reportText } = this.state;

    // Send detailed user report to Sentry as a breadcrumb + new event
    Sentry.withScope((scope) => {
      scope.setLevel('info');
      scope.setTag('source', 'UserReport');
      scope.setContext('userReport', {
        description: reportText,
        error: error?.message,
        componentStack: errorInfo?.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
      Sentry.captureMessage(`User Report: ${reportText.slice(0, 80)}`, 'info');
    });

    this.setState({ reportSent: true, showReportForm: false });
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, reportSent, reportText, showReportForm } = this.state;
    const guidance = getErrorGuidance(error);
    const eventId = Sentry.lastEventId();

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-destructive/20 shadow-2xl">
          <CardHeader className="text-center pb-3">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-destructive/10 text-destructive ring-4 ring-destructive/5">
                <AlertCircle className="size-10" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Something went wrong</CardTitle>
            <CardDescription className="text-base">
              {guidance?.title ?? "An unexpected error occurred."} Your data is safe.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Step-by-step user guidance */}
            {guidance && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                  <Info className="size-4 flex-shrink-0" />
                  What you can do:
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  {guidance.steps.map((step, i) => (
                    <li key={i} className="text-sm text-blue-800 dark:text-blue-300">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Technical error detail (collapsible) */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none flex items-center gap-1.5">
                <Monitor className="size-3" />
                Technical details (for support)
              </summary>
              <div className="mt-2 p-3 rounded-lg bg-muted/50 font-mono text-xs overflow-auto max-h-28 text-muted-foreground border border-border/50 break-all">
                {error?.message || 'Unknown error'}
                {eventId && (
                  <div className="mt-1 text-muted-foreground/60">
                    Event ID: {eventId}
                  </div>
                )}
              </div>
            </details>

            {/* Report form */}
            {showReportForm && !reportSent && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-sm font-medium">
                  What were you doing when this happened?
                </p>
                <Textarea
                  placeholder="e.g. I was trying to upload my passport PDF when the screen went blank..."
                  value={reportText}
                  onChange={(e) => this.setState({ reportText: e.target.value })}
                  className="resize-none text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="action"
                    onClick={this.handleSubmitReport}
                    disabled={!reportText.trim()}
                    className="flex-1"
                  >
                    <Send className="size-3.5" />
                    Submit Report
                  </Button>
                  <Button
                    size="action"
                    variant="ghost"
                    onClick={() => this.setState({ showReportForm: false })}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {reportSent && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  ✅ Report received — thank you!
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                  We'll investigate and reach out via your registered email.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2.5 pt-2">
            <Button
              size="cta"
              onClick={() => window.location.reload()}
              className="w-full shadow-lg shadow-primary/20"
            >
              <RefreshCw className="size-4" />
              Reload Application
            </Button>

            {!reportSent && !showReportForm && (
              <Button
                variant="outline"
                size="cta"
                onClick={() => this.setState({ showReportForm: true })}
                className="w-full"
              >
                <Send className="size-4" />
                Report this Issue
              </Button>
            )}

            <Button
              variant="ghost"
              size="action"
              onClick={() => (window.location.href = '/')}
              className="w-full text-muted-foreground"
            >
              Go to Homepage
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              You can also{' '}
              <span className="font-medium text-foreground">
                log in from another device
              </span>{' '}
              while we resolve this on your end.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }
}
