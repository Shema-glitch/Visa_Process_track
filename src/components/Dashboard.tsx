import React, { useEffect, useState } from 'react';
import { Cloud, LogOut, Plus, RefreshCw, Folder, CheckCircle2, Clock, AlertCircle, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { initiateGoogleOAuth, isGoogleDriveConnected } from '../lib/googleDrive';
import { RoadmapPipeline } from './RoadmapPipeline';
import { DashboardSkeleton } from './skeletons';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface Requirement {
  id: string;
  name: string;
  phase: number;
  status: 'pending' | 'in_progress' | 'completed';
  dependency_id: string | null;
  requires_dual_language: boolean;
  user_id: string;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newReqName, setNewReqName] = useState('');
  const [newReqPhase, setNewReqPhase] = useState('1');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadRequirements();
    checkGoogleDriveConnection();
  }, [user]);

  const loadRequirements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .eq('user_id', user.id)
        .order('phase', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRequirements(data || []);
    } catch (error) {
      console.error('Error loading requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkGoogleDriveConnection = async () => {
    const connected = await isGoogleDriveConnected();
    setIsConnected(connected);
  };

  const handleStatusChange = async (id: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    setRequirements((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
    );
  };

  const handleNameChange = async (id: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('requirements')
        .update({ name: newName, updated_at: new Date() })
        .eq('id', id);

      if (error) throw error;
      setRequirements((prev) =>
        prev.map((req) => (req.id === id ? { ...req, name: newName } : req))
      );
    } catch (error) {
      console.error('Name change error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;

    try {
      const { error } = await supabase
        .from('requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRequirements((prev) => prev.filter((req) => req.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReqName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('requirements')
        .insert({
          user_id: user.id,
          name: newReqName.trim(),
          phase: parseInt(newReqPhase),
          status: 'pending',
          dependency_id: null,
          requires_dual_language: newReqName.toLowerCase().includes('birth certificate') ||
                                    newReqName.toLowerCase().includes('criminal record'),
        })
        .select()
        .single();

      if (error) throw error;
      setRequirements((prev) => [...prev, data]);
      setNewReqName('');
      setNewReqPhase('1');
      setShowAddDialog(false);
    } catch (error) {
      console.error('Add requirement error:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await loadRequirements();
    await checkGoogleDriveConnection();
    setSyncing(false);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Visa Readiness Hub</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Document Tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="secondary" className="gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">Connected</span>
              </Badge>
            ) : (
              <Button
                onClick={() => initiateGoogleOAuth()}
                size="sm"
                className="gap-2"
              >
                <Cloud className="w-4 h-4" />
                <span className="hidden sm:inline">Connect Drive</span>
                <span className="sm:hidden">Drive</span>
              </Button>
            )}

            <Button
              onClick={handleSync}
              variant="ghost"
              size="icon"
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              onClick={() => signOut()}
              variant="ghost"
              size="icon"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardDescription>Overall Progress</CardDescription>
              <CardTitle className="text-3xl">{progressPercent}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercent} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl">{completedCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-2xl">{inProgressCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Add Requirement */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Requirements</h2>
                <p className="text-sm text-muted-foreground">
                  {totalCount} total requirements
                </p>
              </div>
              <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Requirement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Roadmap */}
        {requirements.length > 0 ? (
          <RoadmapPipeline
            requirements={requirements}
            onStatusChange={handleStatusChange}
            onNameChange={handleNameChange}
            onDelete={handleDelete}
          />
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Start tracking your visa requirements by adding your first document.
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Requirement
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Requirement</DialogTitle>
            <DialogDescription>
              Add a new document requirement to track
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddRequirement} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                value={newReqName}
                onChange={(e) => setNewReqName(e.target.value)}
                placeholder="e.g., Birth Certificate"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase">Phase</Label>
              <Select value={newReqPhase} onValueChange={setNewReqPhase}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Phase 1: DIY Documents</SelectItem>
                  <SelectItem value="2">Phase 2: Bank & Notary</SelectItem>
                  <SelectItem value="3">Phase 3: University</SelectItem>
                  <SelectItem value="4">Phase 4: Embassy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRequirement}>
              Add Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
