'use client';

import { useState, useEffect } from 'react';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet, apiPost } from '@/lib/api-client';
import { Loader2, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnvironmentVariables {
  FRESHDESK_DOMAIN?: string;
  FRESHDESK_API_KEY?: string;
  METABASE_URL?: string;
  METABASE_USERNAME?: string;
  METABASE_PASSWORD?: string;
  METABASE_SECRET_KEY?: string;
  CONFIG_ENCRYPTION_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
  DATABASE_URL?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY_BASE64?: string;
}

export default function LeadershipSettingsPage() {
  const [envVars, setEnvVars] = useState<EnvironmentVariables>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await apiGet('/api/settings/environment');
      setEnvVars(response.data || {});
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load environment settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPost('/api/settings/environment', envVars);
      toast({
        title: 'Success',
        description: 'Environment variables updated successfully',
      });
      loadSettings();
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderInput = (key: keyof EnvironmentVariables, label: string, isSecret = false, placeholder = '') => {
    const value = envVars[key] || '';
    const isShown = showSecrets[key];

    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <div className="flex gap-2">
          <Input
            id={key}
            type={isSecret && !isShown ? 'password' : 'text'}
            value={value}
            onChange={(e) => setEnvVars({ ...envVars, [key]: e.target.value })}
            placeholder={placeholder}
            className="flex-1"
          />
          {isSecret && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => toggleShowSecret(key)}
            >
              {isShown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Settings</h1>
          <p className="text-gray-600">
            Manage environment variables and system configuration. Changes require backend restart to take effect.
          </p>
        </div>

        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Important Security Notice</h3>
                <p className="text-sm text-yellow-800">
                  These settings contain sensitive credentials. Only authorized personnel should access this page.
                  All changes are logged and require backend restart to take effect.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="freshdesk" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="freshdesk">Freshdesk</TabsTrigger>
            <TabsTrigger value="metabase">Metabase</TabsTrigger>
            <TabsTrigger value="firebase">Firebase</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value="freshdesk">
            <Card>
              <CardHeader>
                <CardTitle>Freshdesk Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderInput('FRESHDESK_DOMAIN', 'Freshdesk Domain', false, 'your-domain.freshdesk.com')}
                {renderInput('FRESHDESK_API_KEY', 'Freshdesk API Key', true, 'Enter your Freshdesk API key')}
                <div className="pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metabase">
            <Card>
              <CardHeader>
                <CardTitle>Metabase Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderInput('METABASE_URL', 'Metabase URL', false, 'https://reporting.avniproject.org')}
                {renderInput('METABASE_USERNAME', 'Metabase Username', false, 'your-email@example.com')}
                {renderInput('METABASE_PASSWORD', 'Metabase Password', true, 'Enter your Metabase password')}
                {renderInput('METABASE_SECRET_KEY', 'Metabase Secret Key (for embedding)', true, 'Enter embedding secret key from Metabase settings')}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-900 mb-2">How to get Metabase Secret Key:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to Metabase Admin → Settings → Embedding</li>
                    <li>Enable "Embedded analytics"</li>
                    <li>Copy the "Embedding secret key"</li>
                    <li>Paste it here</li>
                  </ol>
                </div>
                <div className="pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firebase">
            <Card>
              <CardHeader>
                <CardTitle>Firebase Authentication Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderInput('FIREBASE_PROJECT_ID', 'Firebase Project ID', false, 'your-project-id')}
                {renderInput('FIREBASE_CLIENT_EMAIL', 'Firebase Client Email', false, 'firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com')}
                {renderInput('FIREBASE_PRIVATE_KEY_BASE64', 'Firebase Private Key (Base64)', true, 'Base64 encoded private key')}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-900 mb-2">How to get Firebase credentials:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to Firebase Console → Project Settings → Service Accounts</li>
                    <li>Click "Generate new private key"</li>
                    <li>Download the JSON file</li>
                    <li>Extract project_id, client_email, and private_key</li>
                    <li>Encode private_key to Base64: <code className="bg-blue-100 px-1 rounded">echo "YOUR_KEY" | base64</code></li>
                  </ol>
                </div>
                <div className="pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>Database Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderInput('DATABASE_URL', 'Database URL', true, 'postgresql://user:password@host:port/database')}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Warning:</h4>
                  <p className="text-sm text-yellow-800">
                    Changing the database URL will affect all data access. Ensure the new database is properly configured and migrated before changing this value.
                  </p>
                </div>
                <div className="pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="other">
            <Card>
              <CardHeader>
                <CardTitle>Other Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderInput('CONFIG_ENCRYPTION_KEY', 'Config Encryption Key', true, '32-character encryption key')}
                {renderInput('DISCORD_WEBHOOK_URL', 'Discord Webhook URL (Optional)', true, 'https://discord.com/api/webhooks/...')}
                <div className="pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6 bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">After Saving Changes</h3>
                <p className="text-sm text-green-800">
                  Environment variables are saved to the database. To apply changes, you must restart the backend server.
                  Contact your system administrator or redeploy the backend application.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
