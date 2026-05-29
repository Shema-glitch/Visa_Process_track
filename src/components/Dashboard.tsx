import React, { useEffect, useState } from 'react';
import { Cloud, LogOut, Plus, RefreshCw, Folder, CheckCircle2, Clock, AlertCircle, LayoutDashboard, Settings, HelpCircle } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo & Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl shadow-lg">
                <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  Visa Readiness Hub
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">
                  Document Tracker & Backup System
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {isConnected ? (
                <Badge variant="success" className="gap-1.5 px-3 py-1.5 text-sm hidden sm:flex">
                  <CheckCircle2 className="w-4 h-4" />
                  Drive Connected
                </Badge>
              ) : (
                <Button
                  onClick={() => initiateGoogleOAuth()}
                  size="sm"
                  variant="premium"
                  className="gap-2 shadow-md"
                >
                  <Cloud className="w-4 h-4" />
                  <span className="hidden sm:inline">Connect Drive</span>
                  <span className="sm:hidden">Drive</span>
                </Button>
              )}

              <Button
                onClick={handleSync}
                variant="ghost"
                size="sm"
                className="gap-2"
                disabled={syncing}
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                onClick={() => signOut()}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Progress Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Main Progress Card */}
          <Card className="sm:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl">
            <CardHeader>
              <CardDescription className="text-slate-300 text-sm sm:text-base">
                Overall Progress
              </CardDescription>
              <CardTitle className="text-3xl sm:text-4xl font-bold">
                {completedCount}/{totalCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercent} className="h-3 sm:h-4 bg-slate-700" />
              <p className="text-sm sm:text-base text-slate-300 mt-2">
                {progressPercent}% Complete
              </p>
            </CardContent>
          </Card>

          {/* Status Breakdown Cards */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{completedCount}</p>
                  <p className="text-xs sm:text-sm text-slate-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{inProgressCount}</p>
                  <p className="text-xs sm:text-sm text-slate-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <Button
            onClick={() => setShowAddDialog(true)}
            variant="premium"
            size="lg"
            className="gap-2 w-full sm:w-auto shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add New Document
          </Button>
        </div>

        {/* Roadmap Pipeline */}
        {requirements.length > 0 ? (
          <RoadmapPipeline
            requirements={requirements}
            onStatusChange={handleStatusChange}
            onNameChange={handleNameChange}
            onDelete={handleDelete}
          />
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 sm:py-16 text-center">
              <div className="max-w-md mx-auto">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Documents Yet</h3>
                <p className="text-slate-600 mb-4">
                  Start tracking your visa requirements by adding your first document.
                </p>
                <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Your First Document
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Add Requirement Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Document</DialogTitle>
            <DialogDescription>
              Add a new requirement to track for your visa application
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRequirement} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                value={newReqName}
                onChange={(e) => setNewReqName(e.target.value)}
                placeholder="e.g., Passport Copy"
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Document</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
