import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Award, ExternalLink } from 'lucide-react';

export default function Certificates() {
  const [ctaUrl, setCtaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCertificateCtaUrl();
  }, []);

  const fetchCertificateCtaUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'certificate_cta_url')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCtaUrl(data?.value || null);
    } catch (error) {
      console.error('Error fetching certificate CTA URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Award className="h-8 w-8 text-accent" />
            Your Certificate
          </h1>
          <p className="text-muted-foreground">
            Earn your professional certificate through our mentorship program.
          </p>
        </div>

        {/* Info Card */}
        <Card className="card-elevated">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Award className="h-16 w-16 text-accent mb-6" />
            <h3 className="text-2xl font-heading font-semibold mb-4">
              Earn Your Certificate
            </h3>
            <p className="text-muted-foreground max-w-lg mb-8">
              Certificates are issued only through our professional mentorship programs 
              after completing required projects. Join our mentorship to get personalized 
              guidance and earn your certification.
            </p>
            
            {!isLoading && ctaUrl && (
              <Button
                size="lg"
                className="gap-2"
                onClick={() => window.open(ctaUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4" />
                Join Mentorship
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
