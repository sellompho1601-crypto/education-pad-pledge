import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Search, Eye, FileText, Building2, MapPin, User, Mail, Shield, Users, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Institution {
  id: string;
  institution_name: string;
  country: string;
  city: string;
  address: string;
  contact_person: string;
  contact_position: string | null;
  certificate_url: string | null;
  created_at: string;
  user_id: string;
}

interface InstitutionWithProfile extends Institution {
  profiles: {
    email: string;
    full_name: string | null;
    verification_status: string;
  };
}

export const InstitutionsManagement = () => {
  const { toast } = useToast();
  const [institutions, setInstitutions] = useState<InstitutionWithProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionWithProfile | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchInstitutions();

    const channel = supabase
      .channel('admin-institutions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => fetchInstitutions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchInstitutions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select(`
          *,
          profiles (
            email,
            full_name,
            verification_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstitutions(data as InstitutionWithProfile[] || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load institutions',
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

  const filteredInstitutions = institutions.filter(
    (inst) =>
      inst.institution_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
          Institutions Management
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage all registered educational institutions and review their verification status
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Institutions</p>
                <p className="text-2xl font-bold text-blue-900">{institutions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Verified</p>
                <p className="text-2xl font-bold text-green-900">
                  {institutions.filter(inst => inst.profiles?.verification_status === 'verified').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {institutions.filter(inst => inst.profiles?.verification_status === 'pending').length}
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
                  {institutions.filter(inst => inst.certificate_url).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Institutions Table Card */}
      <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            All Institutions
          </CardTitle>
          <CardDescription>Manage and review all registered educational institutions</CardDescription>
          
          {/* Search Bar */}
          <div className="relative max-w-md mt-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search institutions by name, city, or country..."
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
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Institution</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Location</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Contact</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Email</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstitutions.map((institution) => (
                  <TableRow key={institution.id} className="hover:bg-slate-50/80 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{institution.institution_name}</p>
                          <p className="text-sm text-slate-500">
                            Joined {new Date(institution.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{institution.city}</p>
                          <p className="text-xs text-slate-500">{institution.country}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-700">{institution.contact_person}</span>
                        </div>
                        {institution.contact_position && (
                          <p className="text-xs text-slate-500">{institution.contact_position}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-700">{institution.profiles?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-medium capitalize ${getStatusColor(institution.profiles?.verification_status)}`}>
                        {institution.profiles?.verification_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInstitution(institution);
                            setIsDetailsDialogOpen(true);
                          }}
                          className="border-slate-300 hover:bg-slate-100 transition-colors group/btn"
                        >
                          <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                        </Button>
                        {institution.certificate_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewCertificate(institution.certificate_url!)}
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

          {filteredInstitutions.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <div>
                <p className="text-lg font-semibold text-muted-foreground mb-2">No institutions found</p>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'No institutions registered yet'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Institution Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl bg-gradient-to-b from-white to-slate-50/50 border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              Institution Details
            </DialogTitle>
            <DialogDescription className="text-lg">
              Complete institution information and contact details
            </DialogDescription>
          </DialogHeader>
          
          {selectedInstitution && (
            <div className="space-y-6 py-4">
              {/* Institution Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Institution Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Institution Name</span>
                      <span className="font-semibold text-slate-900">{selectedInstitution.institution_name}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Registration Date</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(selectedInstitution.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Verification Status</span>
                      <Badge className={`capitalize ${getStatusColor(selectedInstitution.profiles?.verification_status)}`}>
                        {selectedInstitution.profiles?.verification_status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Country</span>
                      <span className="font-semibold text-slate-900">{selectedInstitution.country}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">City</span>
                      <span className="font-semibold text-slate-900">{selectedInstitution.city}</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700 block mb-2">Address</span>
                      <p className="text-sm text-slate-900">{selectedInstitution.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 bg-slate-50 rounded-xl border-2">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                  <User className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Contact Person</span>
                    <span className="font-semibold text-slate-900">{selectedInstitution.contact_person}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Position</span>
                    <span className="font-semibold text-slate-900">{selectedInstitution.contact_position || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Email</span>
                    <span className="font-semibold text-slate-900">{selectedInstitution.profiles?.email}</span>
                  </div>
                </div>
              </div>

              {/* Certificate Section */}
              {selectedInstitution.certificate_url && (
                <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4" />
                    Certificate Available
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-800">
                      This institution has uploaded a verification certificate.
                    </p>
                    <Button
                      onClick={() => handleViewCertificate(selectedInstitution.certificate_url!)}
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