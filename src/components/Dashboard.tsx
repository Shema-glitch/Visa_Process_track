import React, { useEffect, useState, useCallback } from 'react';
import { Cloud, LogOut, Plus, RefreshCw, Folder, CheckCircle2, AlertTriangle, Moon, Sun, Settings, FileSearch, Info, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useTheme } from '@/components/useTheme';
import { RoadmapPipeline } from './RoadmapPipeline';
import { DashboardSkeleton } from './skeletons';
import { useRequirements } from '@/hooks/useRequirements';
import { driveRepo } from '@/infrastructure/config/services';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RequirementStatus } from '@/domain/entities';
import { LoginActivityBanner } from '@/components/LoginActivityBanner';
import { supabase } from '@/lib/supabase';

import * as Sentry from "@sentry/react";

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const {
    requirements,
    loading,
    fetchRequirements,
    updateStatus,
    updateName,
    deleteRequirement,
    addRequirement,
    resetAll
  } = useRequirements(user?.id);
  
  const [isConnected, setIsConnected] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newReqName, setNewReqName] = useState('');
  const [newReqPhase, setNewReqPhase] = useState('1');
  const [syncing, setSyncing] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const checkGoogleDriveConnection = useCallback(async () => {
    if (!user) return;
    
    // Step 1: Optimistic Check (Fast)
    // We check if a record exists in the database. If it does, we assume connection 
    // for immediate UI feedback while we verify the token in the background.
    try {
      const exists = await driveRepo.isConnected(user.id);
      if (exists) {
        setIsConnected(true);
        // We don't set checkingConnection to false yet if we want to show a spinner,
        // but the user wants it to "immediately react", so let's show connected right away.
        setCheckingConnection(false);
      }
    } catch (err) {
      console.warn('Optimistic check failed:', err);
    }

    // Step 2: Thorough Verification (Background)
    // This calls the Edge Function to verify the actual token validity and refresh it if needed.
    try {
      const result = await driveRepo.verifyConnection();
      setIsConnected(result.connected);
      setFolderId(result.folderId || null);
    } catch (err) {
      // If verification fails because the function itself is missing or errors out,
      // we don't want to "crash" back to disconnected if Step 1 (DB check) passed.
      console.warn('Background verification skipped or failed:', err);
      // We only force disconnected if we are sure there is no record (Step 1 would have caught this)
      // or if we want to be strict. Let's be resilient for now.
    } finally {
      setCheckingConnection(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequirements();
    checkGoogleDriveConnection();
  }, [user, fetchRequirements, checkGoogleDriveConnection]);

  const handleStatusChange = async (id: string, newStatus: RequirementStatus) => {
    await updateStatus(id, newStatus);
  };

  const handleNameChange = async (id: string, newName: string) => {
    await updateName(id, newName);
  };

  const handleDelete = async (id: string) => {
    await deleteRequirement(id);
  };

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReqName.trim()) return;

    try {
      await addRequirement(newReqName, parseInt(newReqPhase));
      Sentry.metrics.count('requirement_created', 1);
      setNewReqName('');
      setNewReqPhase('1');
      setShowAddDialog(false);
    } catch (err) {
      console.error('Add requirement error:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetchRequirements();
    await checkGoogleDriveConnection();
    setSyncing(false);
  };

  const handleDebugReset = async () => {
    if (!window.confirm('Are you sure you want to delete all your requirements and restart onboarding?')) return;
    
    setSyncing(true);
    try {
      await resetAll();
      window.location.reload();
    } catch (err) {
      console.error('Reset error:', err);
      alert('Failed to reset onboarding');
    } finally {
      setSyncing(false);
    }
  };

  const completedCount = requirements.filter((r) => r.status === 'completed').length;
  const inProgressCount = requirements.filter((r) => r.status === 'in_progress').length;
  const pendingCount = requirements.filter((r) => r.status === 'pending').length;
  const totalCount = requirements.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* New device login alert banner */}
      <LoginActivityBanner />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Folder className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Visa Vault</h1>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground hidden sm:block">
                Secure document tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-muted" title="Settings">
                  <Settings className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                <DropdownMenuItem onClick={handleSync} disabled={syncing} className="rounded-lg gap-2">
                  <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
                  <span>Sync Requirements</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-lg gap-2">
                  {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  <span>Toggle Theme</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDebugReset} className="rounded-lg gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                  <AlertTriangle className="size-4" />
                  <span>Reset Onboarding</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="rounded-lg gap-2">
                  <LogOut className="size-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8 max-w-7xl mx-auto space-y-10">
        <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
          <CollapsibleTrigger
            aria-expanded={infoOpen}
            aria-controls="chrono-info"
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-0.5"
          >
            <Info className="size-3.5" />
            <span>Strict chronological processing</span>
            <ChevronDown
              className={cn('size-3.5 transition-transform duration-200', infoOpen && 'rotate-180')}
            />
          </CollapsibleTrigger>
          <CollapsibleContent id="chrono-info">
            <p className="text-sm text-muted-foreground font-medium mt-2 pl-5 border-l-2 border-border">
              Documents must be collected in strict chronological order. Locked documents will automatically unlock as you complete the previous steps.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Info Grid: Stats + Storage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-sm border-border/50 bg-gradient-to-br from-primary/[0.02] to-transparent flex flex-col justify-center">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-semibold text-muted-foreground">Overall progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3">
                <Progress value={progressPercent} className="h-2.5 flex-1 [&>[data-slot=progress-indicator]]:bg-[var(--status-complete)]" />
                <span className="text-sm font-black tabular-nums text-[var(--status-complete)] w-10 text-right">
                  {progressPercent}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-semibold text-muted-foreground">Status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 divide-x divide-border/50">
                <div className="pr-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Completed</p>
                  <p className="text-3xl font-black" style={{ color: 'var(--status-complete)' }}>{completedCount}</p>
                </div>
                <div className="px-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">In progress</p>
                  <p className="text-3xl font-black" style={{ color: 'var(--status-progress)' }}>{inProgressCount}</p>
                </div>
                <div className="pl-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Pending</p>
                  <p className="text-3xl font-black" style={{ color: 'var(--status-pending)' }}>{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 relative overflow-hidden group">
            <div className={cn(
              "absolute inset-0 transition-opacity duration-500",
              isConnected ? "bg-emerald-500/5 opacity-100" : "bg-primary/5 opacity-50"
            )} />
            <CardHeader className="pb-3 relative">
              <CardDescription className="text-sm font-semibold text-muted-foreground">Cloud storage</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl transition-colors duration-500",
                    isConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                  )}>
                    <Cloud className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{isConnected ? 'Connected to Drive' : 'Cloud sync paused'}</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {isConnected ? 'Your files are securely backed up' : 'Roadmap progress is saved locally'}
                    </p>
                  </div>
                </div>
                {isConnected && (
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              
              <div className="flex gap-2">
                {checkingConnection ? (
                  <Button disabled size="sm" className="w-full font-bold h-9 rounded-lg gap-2">
                    <Loader2 className="size-3.5 animate-spin" />
                    Checking Connection
                  </Button>
                ) : isConnected ? (
                  <>
                    {folderId && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 font-bold h-9 rounded-lg gap-2"
                        onClick={() => window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank')}
                      >
                        <Folder className="size-3.5" />
                        View Archive
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-bold h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => driveRepo.initiateAuth()}
                      title="Reconnect Drive"
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => driveRepo.initiateAuth()} 
                    size="sm" 
                    className="w-full font-bold h-9 rounded-lg gap-2 shadow-lg shadow-primary/10"
                  >
                    <Cloud className="size-3.5" />
                    Connect Google Drive
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Requirement */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
            <p className="text-sm font-medium text-muted-foreground">
              Tracking <span className="text-foreground font-bold">{totalCount}</span> total items
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm" variant="outline" className="gap-2 rounded-full font-bold border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
            <Plus className="size-4" />
            Add document
          </Button>
        </div>

        {/* Roadmap */}
        {requirements.length > 0 ? (
          <RoadmapPipeline
            requirements={requirements}
            isDriveConnected={isConnected}
            onStatusChange={handleStatusChange}
            onNameChange={handleNameChange}
            onDelete={handleDelete}
          />
        ) : (
          <EmptyState
            icon={FileSearch}
            title="No documents yet"
            description="Start tracking your visa requirements by adding your first document. We'll help you through every step of the process."
            action={{
              label: "Add first document",
              onClick: () => setShowAddDialog(true),
              icon: Plus
            }}
          />
        )}
      </main>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Add document</DialogTitle>
            <DialogDescription className="font-medium">
              Add a new document requirement to track in your roadmap.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddRequirement} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-bold text-muted-foreground">Document name</Label>
              <Input
                id="name"
                value={newReqName}
                onChange={(e) => setNewReqName(e.target.value)}
                placeholder="e.g., Birth certificate"
                className="h-11 font-medium focus-visible:ring-primary/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase" className="text-sm font-bold text-muted-foreground">Phase</Label>
              <Select value={newReqPhase} onValueChange={setNewReqPhase}>
                <SelectTrigger className="h-11 font-medium focus-visible:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="font-medium">Phase 1: DIY documents</SelectItem>
                  <SelectItem value="2" className="font-medium">Phase 2: Bank & notary</SelectItem>
                  <SelectItem value="3" className="font-medium">Phase 3: University</SelectItem>
                  <SelectItem value="4" className="font-medium">Phase 4: Embassy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowAddDialog(false)} className="font-bold">
              Cancel
            </Button>
            <Button onClick={handleAddRequirement} className="font-bold shadow-lg shadow-primary/20">
              Create document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

