import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Award, Download, Eye, Calendar, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  program: {
    id: string;
    title: string;
    description: string | null;
  };
}

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [userName, setUserName] = useState('Student');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          issued_at,
          program:programs(id, title, description)
        `)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      const formattedCerts = (data || []).map((c: any) => ({
        ...c,
        program: Array.isArray(c.program) ? c.program[0] : c.program,
      }));

      setCertificates(formattedCerts);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCertificate = async (cert: Certificate) => {
    setIsDownloading(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const recipientName = userName;
      const programTitle = cert.program?.title || 'Training Program';
      const issueDate = format(new Date(cert.issued_at), 'MMMM d, yyyy');

      // Background
      pdf.setFillColor(250, 250, 252);
      pdf.rect(0, 0, 297, 210, 'F');

      // Border
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(2);
      pdf.rect(10, 10, 277, 190);
      
      // Inner border
      pdf.setDrawColor(44, 62, 80);
      pdf.setLineWidth(0.5);
      pdf.rect(15, 15, 267, 180);

      // Header decoration
      pdf.setFillColor(44, 62, 80);
      pdf.rect(15, 15, 267, 8, 'F');

      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(36);
      pdf.setTextColor(44, 62, 80);
      pdf.text('Certificate of Completion', 148.5, 55, { align: 'center' });

      // Decorative line
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(1);
      pdf.line(70, 62, 227, 62);

      // Presented to
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text('This is to certify that', 148.5, 80, { align: 'center' });

      // Recipient name
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.setTextColor(44, 62, 80);
      pdf.text(recipientName, 148.5, 100, { align: 'center' });

      // Underline for name
      const nameWidth = pdf.getTextWidth(recipientName);
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.5);
      pdf.line(148.5 - nameWidth / 2, 104, 148.5 + nameWidth / 2, 104);

      // Description
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text('has successfully completed the training program', 148.5, 120, { align: 'center' });

      // Program title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(44, 62, 80);
      pdf.text(programTitle, 148.5, 138, { align: 'center' });

      // Date and certificate number
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Issued on ${issueDate}`, 148.5, 160, { align: 'center' });
      pdf.text(`Certificate No: ${cert.certificate_number}`, 148.5, 168, { align: 'center' });

      // Footer
      pdf.setFontSize(10);
      pdf.text('BoldPeaks Communication', 148.5, 185, { align: 'center' });

      // Save PDF
      pdf.save(`certificate-${cert.certificate_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Award className="h-8 w-8 text-accent" />
            Your Certificates
          </h1>
          <p className="text-muted-foreground">
            Download and share your earned certificates.
          </p>
        </div>

        {/* Certificates Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="card-elevated">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Award className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No certificates yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Complete a training program to earn your certificate. Keep learning and
                you&apos;ll get there soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert) => (
              <Card key={cert.id} className="card-elevated overflow-hidden">
                {/* Certificate Preview */}
                <div className="relative h-40 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border-b">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <Award className="h-10 w-10 text-accent mb-2" />
                    <p className="text-sm font-semibold text-center line-clamp-2">
                      {cert.program?.title}
                    </p>
                  </div>
                  <div className="absolute inset-0 border-4 border-dashed border-accent/20 m-2 rounded" />
                </div>

                <CardHeader>
                  <CardTitle className="line-clamp-1">{cert.program?.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(cert.issued_at), 'MMM d, yyyy')}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Badge variant="outline" className="font-mono text-xs">
                    {cert.certificate_number}
                  </Badge>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedCertificate(cert)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => downloadCertificate(cert)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Certificate Preview</DialogTitle>
            </DialogHeader>
            
            {selectedCertificate && (
              <div 
                ref={certificateRef}
                className="aspect-[1.414/1] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-4 border-amber-500/50 p-8 relative"
              >
                {/* Inner border */}
                <div className="absolute inset-4 border border-slate-700/20 rounded" />
                
                {/* Top decoration */}
                <div className="absolute top-4 left-4 right-4 h-2 bg-slate-700" />
                
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-800">
                    Certificate of Completion
                  </h2>
                  
                  <div className="w-40 h-0.5 bg-amber-500" />
                  
                  <p className="text-slate-600">This is to certify that</p>
                  
                  <p className="text-2xl md:text-3xl font-heading font-bold text-slate-800 border-b-2 border-amber-500 pb-2">
                    {userName}
                  </p>
                  
                  <p className="text-slate-600">has successfully completed the training program</p>
                  
                  <p className="text-xl md:text-2xl font-semibold text-slate-800">
                    {selectedCertificate.program?.title}
                  </p>
                  
                  <div className="space-y-1 text-sm text-slate-500 mt-4">
                    <p>Issued on {format(new Date(selectedCertificate.issued_at), 'MMMM d, yyyy')}</p>
                    <p className="font-mono">{selectedCertificate.certificate_number}</p>
                  </div>
                  
                  <p className="text-sm font-semibold text-slate-700 mt-4">
                    BoldPeaks Communication
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setSelectedCertificate(null)}>
                Close
              </Button>
              <Button 
                onClick={() => selectedCertificate && downloadCertificate(selectedCertificate)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}