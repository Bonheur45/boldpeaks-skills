import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [certificateCtaUrl, setCertificateCtaUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['certificate_cta_url']);

      if (error) throw error;

      data?.forEach((setting) => {
        if (setting.key === 'certificate_cta_url') {
          setCertificateCtaUrl(setting.value || '');
        }
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: value || null })
        .eq('key', key);

      if (error) throw error;
      toast.success('Setting saved successfully');
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-accent" />
            App Settings
          </h1>
          <p className="text-muted-foreground">
            Manage application-wide settings and configurations.
          </p>
        </div>

        {/* Certificate CTA Setting */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Certificate Mentorship Link
            </CardTitle>
            <CardDescription>
              Set the external URL for the certificate mentorship program. 
              Users will be redirected to this link to earn their certificate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="certificate-cta-url">Mentorship Program URL</Label>
              <Input
                id="certificate-cta-url"
                type="url"
                placeholder="https://discord.gg/... or https://yoursite.com/mentorship"
                value={certificateCtaUrl}
                onChange={(e) => setCertificateCtaUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to hide the CTA button on the Certificates page.
              </p>
            </div>
            <Button
              onClick={() => saveSetting('certificate_cta_url', certificateCtaUrl)}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Setting
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
