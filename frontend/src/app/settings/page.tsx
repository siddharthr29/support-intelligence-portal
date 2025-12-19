'use client';

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Settings, 
  Key, 
  RefreshCcw, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Database,
  Lock,
  Loader2
} from "lucide-react";

// Generate IST date-based passcode (DDMMYY format)
function generateTodayPasscode(): string {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = String(istDate.getFullYear()).slice(-2);
  
  return `${day}${month}${year}`;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ActivityLog {
  id: string;
  activityType: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

interface SyncResult {
  service: string;
  status: 'success' | 'error';
  message: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<Record<string, string>>({});
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  
  const [credentials, setCredentials] = useState({
    // Freshdesk
    freshdeskApiKey: '',
    freshdeskDomain: '',
    // Metabase
    metabaseUrl: '',
    metabaseUsername: '',
    metabasePassword: '',
    metabaseRftQuestionId: '',
    // Google Sheets
    googleSheetsUrl: '',
    googleSheetsApiKey: '',
    googleAppsScriptUrl: '',
    // AI Chatbot
    groqApiKey: '',
    // Firebase
    firebaseApiKey: '',
    firebaseAuthDomain: '',
    firebaseProjectId: '',
    // Discord
    discordWebhookUrl: '',
  });
  
  const [isTestingDiscord, setIsTestingDiscord] = useState(false);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const todayPasscode = generateTodayPasscode();
    
    if (passcode === todayPasscode) {
      setIsUnlocked(true);
      setPasscodeError('');
      toast.success('Settings unlocked');
    } else {
      setPasscodeError('Invalid passcode. Hint: DDMMYY in Bengaluru time.');
      setPasscode('');
    }
  };

  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/settings`);
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['activityLogs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/settings/logs?limit=20`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/settings/sync`, { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      const results = data.data as SyncResult[];
      const allSuccess = results.every(r => r.status === 'success');
      if (allSuccess) {
        toast.success('All services connected successfully');
      } else {
        toast.warning('Some services failed to connect');
      }
    },
    onError: () => {
      toast.error('Sync failed');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (creds: Record<string, string>) => {
      const res = await fetch(`${API_BASE_URL}/api/settings/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...creds, confirmUpdate: true }),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      toast.success(data.message || 'Credentials updated');
      setCredentials({
        freshdeskApiKey: '',
        freshdeskDomain: '',
        metabaseUrl: '',
        metabaseUsername: '',
        metabasePassword: '',
        metabaseRftQuestionId: '',
        googleSheetsUrl: '',
        googleSheetsApiKey: '',
        googleAppsScriptUrl: '',
        groqApiKey: '',
        firebaseApiKey: '',
        firebaseAuthDomain: '',
        firebaseProjectId: '',
        discordWebhookUrl: '',
      });
      setShowConfirmDialog(false);
    },
    onError: () => {
      toast.error('Failed to update credentials');
      setShowConfirmDialog(false);
    },
  });

  const handleSaveCredentials = () => {
    const updates: Record<string, string> = {};
    // Freshdesk
    if (credentials.freshdeskApiKey) updates.freshdeskApiKey = credentials.freshdeskApiKey;
    if (credentials.freshdeskDomain) updates.freshdeskDomain = credentials.freshdeskDomain;
    // Metabase
    if (credentials.metabaseUrl) updates.metabaseUrl = credentials.metabaseUrl;
    if (credentials.metabaseUsername) updates.metabaseUsername = credentials.metabaseUsername;
    if (credentials.metabasePassword) updates.metabasePassword = credentials.metabasePassword;
    if (credentials.metabaseRftQuestionId) updates.metabaseRftQuestionId = credentials.metabaseRftQuestionId;
    // Google Sheets
    if (credentials.googleSheetsUrl) updates.googleSheetsUrl = credentials.googleSheetsUrl;
    if (credentials.googleSheetsApiKey) updates.googleSheetsApiKey = credentials.googleSheetsApiKey;
    if (credentials.googleAppsScriptUrl) updates.googleAppsScriptUrl = credentials.googleAppsScriptUrl;
    // AI Chatbot
    if (credentials.groqApiKey) updates.groqApiKey = credentials.groqApiKey;
    // Firebase
    if (credentials.firebaseApiKey) updates.firebaseApiKey = credentials.firebaseApiKey;
    if (credentials.firebaseAuthDomain) updates.firebaseAuthDomain = credentials.firebaseAuthDomain;
    if (credentials.firebaseProjectId) updates.firebaseProjectId = credentials.firebaseProjectId;
    // Discord
    if (credentials.discordWebhookUrl) updates.discordWebhookUrl = credentials.discordWebhookUrl;

    if (Object.keys(updates).length === 0) {
      toast.error('No changes to save');
      return;
    }

    setPendingCredentials(updates);
    setShowConfirmDialog(true);
  };

  const confirmSave = () => {
    updateMutation.mutate(pendingCredentials);
  };

  const settings = settingsData?.data || {};
  const logs = (logsData?.data?.logs || []) as ActivityLog[];

  // Passcode lock screen
  if (!isUnlocked) {
    return (
      <ProtectedRoute>
        <Shell>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-orange-100 rounded-full w-fit">
                  <Lock className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Settings Protected</CardTitle>
                <CardDescription>
                  Enter today&apos;s passcode to access settings.
                  <br />
                  <span className="text-xs text-muted-foreground">Format: DDMMYY (Bengaluru date)</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="passcode">Passcode</Label>
                    <Input
                      id="passcode"
                      type="password"
                      placeholder="Enter 6-digit passcode"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest font-mono"
                      autoFocus
                    />
                  </div>
                  
                  {passcodeError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {passcodeError}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={passcode.length !== 6}>
                    <Lock className="h-4 w-4 mr-2" />
                    Unlock Settings
                  </Button>
                </form>

              </CardContent>
            </Card>
          </div>
        </Shell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Shell>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-7 w-7" />
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage API credentials and view system activity logs
            </p>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Test Connections
          </Button>
        </div>

        {/* Sync Results */}
        {syncMutation.data && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {(syncMutation.data.data as SyncResult[]).map((result) => (
                  <div
                    key={result.service}
                    className={`p-3 rounded-lg border ${
                      result.status === 'success' 
                        ? 'bg-green-500/10 border-green-500/20' 
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.service}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Credentials Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Credentials
              </CardTitle>
              <CardDescription>
                Update API keys and credentials. Values are encrypted at rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* Freshdesk Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  🎫 Freshdesk (Ticket System)
                  {settings.freshdeskConfigured && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">Connected</Badge>
                  )}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="freshdeskDomain">Domain</Label>
                  <Input
                    id="freshdeskDomain"
                    type="text"
                    placeholder={settings.freshdeskDomain || 'e.g., yourcompany.freshdesk.com'}
                    value={credentials.freshdeskDomain}
                    onChange={(e) => setCredentials({ ...credentials, freshdeskDomain: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freshdeskApiKey" className="flex items-center gap-2">
                    API Key
                    <Badge variant="outline" className="text-xs">Encrypted</Badge>
                  </Label>
                  <Input
                    id="freshdeskApiKey"
                    type="password"
                    placeholder={settings.freshdeskApiKey || 'Enter Freshdesk API key'}
                    value={credentials.freshdeskApiKey}
                    onChange={(e) => setCredentials({ ...credentials, freshdeskApiKey: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* Metabase Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  📊 Metabase (RFT Telemetry)
                  {settings.metabaseConfigured && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">Connected</Badge>
                  )}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="metabaseUrl">URL</Label>
                  <Input
                    id="metabaseUrl"
                    type="url"
                    placeholder={settings.metabaseUrl || 'e.g., https://metabase.yourcompany.com'}
                    value={credentials.metabaseUrl}
                    onChange={(e) => setCredentials({ ...credentials, metabaseUrl: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="metabaseUsername">Email</Label>
                    <Input
                      id="metabaseUsername"
                      type="email"
                      placeholder={settings.metabaseUsername || 'Enter email'}
                      value={credentials.metabaseUsername}
                      onChange={(e) => setCredentials({ ...credentials, metabaseUsername: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metabasePassword">Password</Label>
                    <Input
                      id="metabasePassword"
                      type="password"
                      placeholder="Enter password"
                      value={credentials.metabasePassword}
                      onChange={(e) => setCredentials({ ...credentials, metabasePassword: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metabaseRftQuestionId">RFT Question ID</Label>
                  <Input
                    id="metabaseRftQuestionId"
                    type="text"
                    placeholder={settings.metabaseRftQuestionId || 'e.g., 4848'}
                    value={credentials.metabaseRftQuestionId}
                    onChange={(e) => setCredentials({ ...credentials, metabaseRftQuestionId: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* Firebase Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  🔐 Firebase (Authentication)
                  {settings.firebaseConfigured && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">Connected</Badge>
                  )}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="firebaseProjectId">Project ID</Label>
                  <Input
                    id="firebaseProjectId"
                    type="text"
                    placeholder={settings.firebaseProjectId || 'e.g., my-project-id'}
                    value={credentials.firebaseProjectId}
                    onChange={(e) => setCredentials({ ...credentials, firebaseProjectId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firebaseAuthDomain">Auth Domain</Label>
                  <Input
                    id="firebaseAuthDomain"
                    type="text"
                    placeholder={settings.firebaseAuthDomain || 'e.g., my-project.firebaseapp.com'}
                    value={credentials.firebaseAuthDomain}
                    onChange={(e) => setCredentials({ ...credentials, firebaseAuthDomain: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firebaseApiKey" className="flex items-center gap-2">
                    API Key
                    <Badge variant="outline" className="text-xs">Encrypted</Badge>
                  </Label>
                  <Input
                    id="firebaseApiKey"
                    type="password"
                    placeholder={settings.firebaseApiKey || 'Enter Firebase API key'}
                    value={credentials.firebaseApiKey}
                    onChange={(e) => setCredentials({ ...credentials, firebaseApiKey: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* Google Sheets Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  📋 Google Sheets (Export)
                  {settings.googleSheetsConfigured && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">Connected</Badge>
                  )}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="googleSheetsUrl">Spreadsheet URL</Label>
                  <Input
                    id="googleSheetsUrl"
                    type="url"
                    placeholder={settings.googleSheetsUrl || 'Enter Google Sheets URL'}
                    value={credentials.googleSheetsUrl}
                    onChange={(e) => setCredentials({ ...credentials, googleSheetsUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleSheetsApiKey" className="flex items-center gap-2">
                    API Key / Service Account
                    <Badge variant="outline" className="text-xs">Encrypted</Badge>
                  </Label>
                  <Input
                    id="googleSheetsApiKey"
                    type="password"
                    placeholder={settings.googleSheetsConfigured ? '********' : 'Enter API key or service account JSON'}
                    value={credentials.googleSheetsApiKey}
                    onChange={(e) => setCredentials({ ...credentials, googleSheetsApiKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleAppsScriptUrl">Apps Script Web App URL</Label>
                  <Input
                    id="googleAppsScriptUrl"
                    type="url"
                    placeholder={settings.googleAppsScriptUrl || 'e.g., https://script.google.com/macros/s/.../exec'}
                    value={credentials.googleAppsScriptUrl}
                    onChange={(e) => setCredentials({ ...credentials, googleAppsScriptUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    For pushing data to Google Sheets via Apps Script
                  </p>
                </div>
              </div>

              <Separator />

              {/* Database Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  🗄️ Database (Supabase)
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">Connected</Badge>
                </h4>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground">
                    <strong>Provider:</strong> Supabase (PostgreSQL)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Host:</strong> db.tvckhedkcosjvdyafzia.supabase.co
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Status:</strong> Active (Free tier - unlimited API calls)
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Data syncs automatically every Friday at 4:30 PM IST.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Groq AI Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  🤖 Groq AI (Chatbot)
                  {settings.groqConfigured && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">Connected</Badge>
                  )}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="groqApiKey" className="flex items-center gap-2">
                    API Key
                    <Badge variant="outline" className="text-xs">Encrypted</Badge>
                  </Label>
                  <Input
                    id="groqApiKey"
                    type="password"
                    placeholder={settings.groqApiKey || 'Enter Groq API key'}
                    value={credentials.groqApiKey}
                    onChange={(e) => setCredentials({ ...credentials, groqApiKey: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Free tier available at{' '}
                    <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      console.groq.com
                    </a>
                  </p>
                </div>
              </div>

              <Separator />

              {/* Discord Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  💬 Discord (Notifications)
                  {settings.discordConfigured && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">Connected</Badge>
                  )}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="discordWebhookUrl">Webhook URL</Label>
                  <Input
                    id="discordWebhookUrl"
                    type="url"
                    placeholder={settings.discordWebhookUrl || 'https://discord.com/api/webhooks/...'}
                    value={credentials.discordWebhookUrl}
                    onChange={(e) => setCredentials({ ...credentials, discordWebhookUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Weekly report notifications sent every Friday at 5pm IST.
                    Reminder to add engineer hours sent at 2pm IST.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsTestingDiscord(true);
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/discord/test`, { method: 'POST' });
                      const data = await res.json();
                      if (data.success) {
                        toast.success('Discord test message sent! Check your channel.');
                      } else {
                        toast.error(data.message || 'Discord test failed');
                      }
                    } catch {
                      toast.error('Failed to test Discord connection');
                    } finally {
                      setIsTestingDiscord(false);
                    }
                  }}
                  disabled={isTestingDiscord}
                  className="gap-2"
                >
                  {isTestingDiscord ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Test Discord Connection
                </Button>
              </div>

              <Button
                onClick={handleSaveCredentials}
                disabled={updateMutation.isPending}
                className="w-full mt-4"
              >
                <Shield className="h-4 w-4 mr-2" />
                Save Credentials Securely
              </Button>
            </CardContent>
          </Card>

          {/* Activity Logs Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Activity Logs
              </CardTitle>
              <CardDescription>
                Immutable audit trail of system activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse h-16 bg-muted rounded" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity logs yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {log.activityType}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1 truncate">{log.description}</p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-IN', { 
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        ID: {log.id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Credential Update
              </DialogTitle>
              <DialogDescription>
                You are about to update the following credentials. This action will be logged.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ul className="space-y-2">
                {Object.keys(pendingCredentials).map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </li>
                ))}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Confirm & Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
