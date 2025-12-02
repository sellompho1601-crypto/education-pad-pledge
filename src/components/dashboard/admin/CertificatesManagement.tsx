import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { FileCheck, FileX, Eye, Building2, TrendingUp, Loader2 } from 'lucide-react';

interface CertificateRecord {
  id: string;
  user_id: string;
  type: 'institution' | 'investor';
  name: string;
  email: string;
  certificate_url: string | null;
  verification_status: string;
}

export const CertificatesManagement = () => {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      
      // Fetch institutions with certificates
      const { data: institutions, error: instError } = await supabase
        .from('institutions')
        .select(`
          id,
          user_id,
          institution_name,
          certificate_url
        `);

      if (instError) throw instError;

      // Fetch investors with certificates
      const { data: investors, error: invError } = await supabase
        .from('investors')
        .select(`
          id,
          user_id,
          company_name,
          certificate_url
        `);

      if (invError) throw invError;

      // Get all user_ids to fetch profiles
      const userIds = [
        ...(institutions?.map(i => i.user_id) || []),
        ...(investors?.map(i => i.user_id) || [])
      ];

      // Fetch profiles for these users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, verification_status')
        .in('id', userIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      // Combine data
      const combinedCertificates: CertificateRecord[] = [];

      institutions?.forEach(inst => {
        const profile = profileMap.get(inst.user_id);
        if (inst.certificate_url) {
          combinedCertificates.push({
            id: inst.id,
            user_id: inst.user_id,
            type: 'institution',
            name: inst.institution_name,
            email: profile?.email || 'N/A',
            certificate_url: inst.certificate_url,
            verification_status: profile?.verification_status || 'pending'
          });
        }
      });

      investors?.forEach(inv => {
        const profile = profileMap.get(inv.user_id);
        if (inv.certificate_url) {
          combinedCertificates.push({
            id: inv.id,
            user_id: inv.user_id,
            type: 'investor',
            name: inv.company_name || profile?.full_name || 'N/A',
            email: profile?.email || 'N/A',
            certificate_url: inv.certificate_url,
            verification_status: profile?.verification_status || 'pending'
          });
        }
      });

      setCertificates(combinedCertificates);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch certificates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (cert: CertificateRecord) => {
    if (!cert.certificate_url) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('certificates')
        .createSignedUrl(cert.certificate_url, 300); // 5 min expiry

      if (error) throw error;
      
      setPreviewUrl(data.signedUrl);
      setSelectedCertificate(cert);
      setShowPreview(true);
    } catch (error) {
      console.error('Error getting certificate URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to load certificate preview',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (cert: CertificateRecord) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', cert.user_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${cert.name} has been verified successfully`,
      });

      fetchCertificates();
    } catch (error) {
      console.error('Error approving certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve certificate',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (cert: CertificateRecord) => {
    setSelectedCertificate(cert);
    setRejectReason('');
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selectedCertificate) return;
    
    setProcessing(true);
    try {
      // Update verification status to rejected
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('id', selectedCertificate.user_id);

      if (error) throw error;

      // Note: In a production app, you'd want to store the rejection reason
      // in a separate table or send it via email to the user
      console.log('Rejection reason:', rejectReason);

      toast({
        title: 'Certificate Rejected',
        description: `${selectedCertificate.name}'s certificate has been rejected`,
      });

      setShowRejectDialog(false);
      setSelectedCertificate(null);
      setRejectReason('');
      fetchCertificates();
    } catch (error) {
      console.error('Error rejecting certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject certificate',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Certificate Review</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve or reject uploaded verification certificates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Certificates</CardTitle>
          <CardDescription>
            {certificates.length} certificate(s) uploaded for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certificates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No certificates uploaded yet</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={`${cert.type}-${cert.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cert.type === 'institution' ? (
                            <Building2 className="h-4 w-4 text-blue-600" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="capitalize">{cert.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{cert.name}</TableCell>
                      <TableCell className="text-muted-foreground">{cert.email}</TableCell>
                      <TableCell>{getStatusBadge(cert.verification_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreview(cert)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {cert.verification_status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(cert)}
                                disabled={processing}
                              >
                                <FileCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRejectDialog(cert)}
                                disabled={processing}
                              >
                                <FileX className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
            <DialogDescription>
              {selectedCertificate?.name} - {selectedCertificate?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-[500px] border rounded-lg"
                title="Certificate Preview"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            {previewUrl && (
              <Button asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  Open in New Tab
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Certificate</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedCertificate?.name}'s certificate.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason.trim() || processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileX className="h-4 w-4 mr-2" />
              )}
              Reject Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
