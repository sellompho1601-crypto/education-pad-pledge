import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Search, Eye, FileText, Building2, User, Mail, Phone, Shield, TrendingUp, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Investor {
  id: string;
  investor_type: string;
  company_name: string | null;
  certificate_url: string | null;
  created_at: string;
  user_id: string;
}

interface InvestorWithProfile extends Investor {
  profiles: {
    email: string;
    full_name: string | null;
    phone: string | null;
    verification_status: string;
  };
}

export const InvestorsManagement = () => {
  const { toast } = useToast();
  const [investors, setInvestors] = useState<InvestorWithProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorWithProfile | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select(`
          *,
          profiles (
            email,
            full_name,
            phone,
            verification_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestors(data as InvestorWithProfile[] || []);
    } catch (error) {
      console.error('Error fetching investors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investors',
        variant: 'destructive',
      });
    }
  };

  const handleViewCertificate = async (certificateUrl: string) => {
    try {
      const { data } = await supabase.storage
        .from('certificates')
        .createSignedUrl(certificateUrl, 60);
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load certificate',
        variant: 'destructive',
      });
    }
  };

  const filteredInvestors = investors.filter(
    (inv) =>
      inv.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.investor_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'verified':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInvestorTypeColor = (type: string) => {
    switch (type) {
      case 'corporate':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'individual':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
          Investors Management
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage all registered investors, view details, and access verification documents
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Investors</p>
                <p className="text-2xl font-bold text-blue-900">{investors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Corporate</p>
                <p className="text-2xl font-bold text-green-900">
                  {investors.filter(inv => inv.investor_type === 'corporate').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Individual</p>
                <p className="text-2xl font-bold text-purple-900">
                  {investors.filter(inv => inv.investor_type === 'individual').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700">With Certificates</p>
                <p className="text-2xl font-bold text-amber-900">
                  {investors.filter(inv => inv.certificate_url).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investors Table Card */}
      <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            All Investors
          </CardTitle>
          <CardDescription>Manage and review all registered investor accounts</CardDescription>
          
          {/* Search Bar */}
          <div className="relative max-w-md mt-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search investors by name, email, company, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 text-lg border-2 border-slate-300 focus:border-purple-500 transition-colors"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="border-2 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Investor</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Contact</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Type</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Company</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestors.map((investor) => (
                  <TableRow key={investor.id} className="hover:bg-slate-50/80 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center group-hover:bg-slate-300 transition-colors">
                          <User className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{investor.profiles?.full_name || 'Unnamed Investor'}</p>
                          <p className="text-sm text-slate-500">
                            Joined {new Date(investor.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-700">{investor.profiles?.email}</span>
                        </div>
                        {investor.profiles?.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-700">{investor.profiles?.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-medium capitalize ${getInvestorTypeColor(investor.investor_type)}`}>
                        {investor.investor_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {investor.company_name && (
                          <>
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">{investor.company_name}</span>
                          </>
                        )}
                        {!investor.company_name && (
                          <span className="text-sm text-slate-500">N/A</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-medium ${getStatusColor(investor.profiles?.verification_status)}`}>
                        {investor.profiles?.verification_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInvestor(investor);
                            setIsDetailsDialogOpen(true);
                          }}
                          className="border-slate-300 hover:bg-slate-100 transition-colors group/btn"
                        >
                          <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                        </Button>
                        {investor.certificate_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewCertificate(investor.certificate_url!)}
                            className="border-blue-300 hover:bg-blue-50 text-blue-700 transition-colors group/btn"
                          >
                            <FileText className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredInvestors.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <div>
                <p className="text-lg font-semibold text-muted-foreground mb-2">No investors found</p>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'No investors registered yet'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investor Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl bg-gradient-to-b from-white to-slate-50/50 border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              Investor Details
            </DialogTitle>
            <DialogDescription className="text-lg">
              Complete information and verification status
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvestor && (
            <div className="space-y-6 py-4">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Full Name</span>
                      <span className="font-semibold text-slate-900">{selectedInvestor.profiles?.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Email</span>
                      <span className="font-semibold text-slate-900">{selectedInvestor.profiles?.email}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Phone</span>
                      <span className="font-semibold text-slate-900">{selectedInvestor.profiles?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Investor Information */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Investor Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Investor Type</span>
                      <Badge className={`capitalize ${getInvestorTypeColor(selectedInvestor.investor_type)}`}>
                        {selectedInvestor.investor_type}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Company Name</span>
                      <span className="font-semibold text-slate-900">{selectedInvestor.company_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Registration Date</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(selectedInvestor.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className="p-4 bg-slate-50 rounded-xl border-2">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4" />
                  Verification Status
                </h3>
                <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={`text-lg px-3 py-1 ${getStatusColor(selectedInvestor.profiles?.verification_status)}`}>
                      {selectedInvestor.profiles?.verification_status}
                    </Badge>
                    <span className="text-sm text-slate-600">
                      {selectedInvestor.profiles?.verification_status === 'verified' 
                        ? 'This investor has been verified and can access all platform features.'
                        : selectedInvestor.profiles?.verification_status === 'pending'
                        ? 'This investor is awaiting verification review.'
                        : 'This investor has been rejected and has limited access.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Certificate Section */}
              {selectedInvestor.certificate_url && (
                <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4" />
                    Certificate Available
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-800">
                      This investor has uploaded a verification certificate.
                    </p>
                    <Button
                      onClick={() => handleViewCertificate(selectedInvestor.certificate_url!)}
                      className="bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Certificate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};