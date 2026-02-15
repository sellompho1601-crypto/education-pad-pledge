import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Building2, 
  MapPin, 
  Package, 
  Search, 
  Filter,
  CheckCircle,
  Send,
  TrendingUp,
  Users,
  Heart,
  AlertCircle,
  Clock,
  Calendar,
  Sparkles,
  Target,
  BarChart3,
  MessageSquare,
  Eye,
  DollarSign,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Type definitions to handle Supabase types sync issues
type DbInvestor = {
  id: string;
  user_id: string;
  investor_type: string;
  company_name: string | null;
  certificate_url: string | null;
  created_at: string;
};

type DbProfile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  user_type: string;
  verification_status: string;
};

type DbDonation = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  message: string | null;
  donation_date: string;
  created_at: string;
  investor_id: string;
  institution_id: string;
};

interface InvestorWithProfile extends DbInvestor {
  profile: DbProfile;
  donations_count: number;
  total_pads_donated: number;
}

interface DonationStats {
  total: number;
  pending: number;
  completed: number;
  totalPads: number;
}

interface DonationDetails extends DbDonation {
  investor?: {
    company_name: string | null;
    investor_type: string;
    user_id: string;
  };
  investor_profile?: {
    full_name: string | null;
    email: string;
  };
}

export function InstitutionDonations() {
  const [investors, setInvestors] = useState<InvestorWithProfile[]>([]);
  const [donations, setDonations] = useState<DbDonation[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<DonationDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [stats, setStats] = useState<DonationStats>({
    total: 0,
    pending: 0,
    completed: 0,
    totalPads: 0,
  });
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = investors.filter(investor =>
        (investor.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (investor.company_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (investor.investor_type.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredInvestors(filtered);
    } else {
      setFilteredInvestors(investors);
    }
  }, [searchQuery, investors]);

  // Realtime subscription for donations updates
  useEffect(() => {
    const channel = supabase
      .channel('institution-donations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch institution data
      const { data: institution } = await supabase
        .from('institutions')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: any };

      if (!institution) return;

      // Fetch donations for this institution
      const { data: donationsData } = await supabase
        .from('donations')
        .select('*')
        .eq('institution_id', institution.id)
        .order('created_at', { ascending: false }) as { data: DbDonation[] | null };

      setDonations(donationsData || []);

      // Calculate stats (treating amount as number of pads)
      const total = donationsData?.length || 0;
      const pending = donationsData?.filter(d => d.status === 'pending').length || 0;
      const completed = donationsData?.filter(d => d.status === 'completed').length || 0;
      const totalPads = donationsData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      setStats({ total, pending, completed, totalPads });

      // Fetch verified investors with their profiles
      const { data: investorsData } = await supabase
        .from('investors')
        .select(`
          *,
          profile:profiles!investors_user_id_fkey(*)
        `)
        .order('created_at', { ascending: false }) as { data: any[] | null };

      if (investorsData) {
        // Filter verified investors and calculate their donation stats
        const verifiedInvestors = await Promise.all(
          investorsData
            .filter(inv => inv.profile?.verification_status === 'verified')
            .map(async (inv) => {
              // Get donation stats for this investor
              const { data: invDonations } = await supabase
                .from('donations')
                .select('amount, status')
                .eq('investor_id', inv.id) as { data: any[] | null };

              const donations_count = invDonations?.length || 0;
              const total_pads_donated = invDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

              return {
                ...inv,
                profile: inv.profile,
                donations_count,
                total_pads_donated
              };
            })
        );

        setInvestors(verifiedInvestors);
        setFilteredInvestors(verifiedInvestors);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load donation data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDonation = async (investor: InvestorWithProfile) => {
    setSelectedInvestor(investor.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get institution data
      const { data: institution } = await supabase
        .from('institutions')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: any };

      if (!institution) return;

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('institution_id', institution.id)
        .eq('investor_id', investor.id)
        .single() as { data: any };

      let conversationId = existingConv?.id;

      // Create conversation if it doesn't exist
      if (!conversationId) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            institution_id: institution.id,
            investor_id: investor.id
          })
          .select()
          .single() as { data: any };

        conversationId = newConv?.id;
      }

      // Navigate to messages
      if (conversationId) {
        setRequestSent(investor.id);
        toast({
          title: 'Request sent!',
          description: `Your donation request has been sent to ${investor.profile.full_name || investor.company_name}`,
        });
        setTimeout(() => {
          navigate('/messages');
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send donation request',
        variant: 'destructive',
      });
    } finally {
      setSelectedInvestor(null);
    }
  };

  const handleViewDonationDetails = async (donation: DbDonation) => {
    try {
      const { data: investor } = await supabase
        .from('investors')
        .select('company_name, investor_type, user_id')
        .eq('id', donation.investor_id)
        .single();

      let investorProfile = null;
      if (investor?.user_id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', investor.user_id)
          .single();
        investorProfile = data;
      }

      setSelectedDonation({
        ...donation,
        investor: investor || undefined,
        investor_profile: investorProfile || undefined,
      });
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Error fetching donation details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load donation details',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading donation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Sanitary Pad Donations
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Connect with verified donors and manage pad donations for your students
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 w-fit">
          <Button
            variant={activeTab === 'available' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('available')}
            className={`flex items-center gap-2 ${
              activeTab === 'available' 
                ? 'bg-white shadow-sm' 
                : 'hover:bg-white/50'
            }`}
          >
            <Users className="h-4 w-4" />
            Available Donors
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 ${
              activeTab === 'history' 
                ? 'bg-white shadow-sm' 
                : 'hover:bg-white/50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Donation History
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {requestSent && (
        <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800">
            Donation request sent successfully! Redirecting to messages...
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Donations</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700">Pending Requests</p>
                <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Completed</p>
                <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Total Pads Received</p>
                <p className="text-2xl font-bold text-purple-900">{stats.totalPads.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'available' ? (
        <>
          {/* Search and Filter Section */}
          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    placeholder="Search donors by name, company, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-3 text-lg border-2 border-slate-300 focus:border-blue-500 transition-colors"
                  />
                </div>
                <Button variant="outline" className="flex items-center gap-2 border-2 h-12 px-4">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Investors Grid */}
          {filteredInvestors.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <div>
                  <p className="text-lg font-semibold text-muted-foreground mb-2">No verified donors found</p>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search terms' : 'Check back later for new donor registrations'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredInvestors.map((investor) => (
                <Card 
                  key={investor.id} 
                  className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50 group"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Building2 className="h-7 w-7 text-blue-600" />
                        </div>
                        <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-xl text-slate-900">
                      {investor.profile.full_name || investor.company_name || 'Anonymous Donor'}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {investor.investor_type}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex flex-col">
                    <div className="space-y-4 flex-1">
                      {/* Contact Info */}
                      {investor.profile.email && (
                        <p className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                          {investor.profile.email}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-1 text-slate-600 mb-1 justify-center">
                            <Package className="h-4 w-4" />
                            <span className="text-xs font-medium">Total Donated</span>
                          </div>
                          <p className="text-lg font-bold text-slate-900">{investor.total_pads_donated.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">pads</p>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-1 text-slate-600 mb-1 justify-center">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-medium">Donations Made</span>
                          </div>
                          <p className="text-lg font-bold text-slate-900">{investor.donations_count}</p>
                          <p className="text-xs text-slate-500">times</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all duration-300 group/btn"
                      onClick={() => handleRequestDonation(investor)}
                      disabled={selectedInvestor === investor.id || requestSent === investor.id}
                      size="lg"
                    >
                      {requestSent === investor.id ? (
                        <>
                          <CheckCircle className="mr-2 h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                          Request Sent
                        </>
                      ) : selectedInvestor === investor.id ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Sending Request...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                          Request Donation
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 mb-2">How Donation Requests Work</p>
                  <p className="text-sm text-blue-800/80">
                    Click "Request Donation" to send a request to a verified donor. 
                    They will be notified and can discuss the donation details through messages. 
                    Track all your requests and received donations in the History tab.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Donation History Tab */
        <Card className="border-2 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Donation History
            </CardTitle>
            <CardDescription>All pad donations received by your institution</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {donations.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Package className="h-16 w-16 text-muted-foreground/50 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-muted-foreground mb-2">No donations yet</p>
                  <p className="text-muted-foreground">Start by requesting donations from available donors</p>
                </div>
                <Button 
                  onClick={() => setActiveTab('available')}
                  className="bg-gradient-to-r from-blue-600 to-blue-500"
                >
                  Browse Available Donors
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between p-5 border-2 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition-all duration-200 group cursor-pointer"
                    onClick={() => handleViewDonationDetails(donation)}
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <span className="font-bold text-xl text-slate-900">
                            {Number(donation.amount).toLocaleString()} pads
                          </span>
                        </div>
                        <Badge 
                          variant={getStatusVariant(donation.status)} 
                          className="text-sm px-3 py-1"
                        >
                          {donation.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(donation.donation_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Donor ID: {donation.investor_id.slice(0, 8)}...
                        </div>
                      </div>
                      {donation.message && (
                        <p className="text-sm text-slate-600 mt-2 p-3 bg-slate-50 rounded-lg">
                          <span className="font-medium">Message:</span> {donation.message}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-300 hover:bg-slate-100 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleViewDonationDetails(donation); }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Donation Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gradient-to-b from-white to-slate-50/50 border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              Donation Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedDonation && (
            <div className="space-y-6 py-4">
              {/* Amount & Status */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Amount
                  </label>
                  <p className="text-2xl font-bold text-green-600">
                    {Number(selectedDonation.amount).toLocaleString()} pads
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <div>
                    <Badge className={`text-lg px-3 py-1 ${getStatusColor(selectedDonation.status)}`}>
                      {selectedDonation.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Donation Date
                  </label>
                  <p className="font-medium text-slate-900">
                    {format(new Date(selectedDonation.donation_date), "PPP 'at' hh:mm a")}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Currency</label>
                  <p className="font-medium text-slate-900">{selectedDonation.currency}</p>
                </div>
              </div>

              {/* Message */}
              {selectedDonation.message && (
                <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4" />
                    Donor Message
                  </h3>
                  <p className="text-blue-800 p-3 bg-white rounded-lg border border-blue-100">
                    {selectedDonation.message}
                  </p>
                </div>
              )}

              {/* Donor Info */}
              <div className="p-4 bg-slate-50 rounded-xl border-2">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-blue-600" />
                  Donor Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Name</span>
                    <span className="font-semibold text-slate-900">
                      {selectedDonation.investor_profile?.full_name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Company</span>
                    <span className="font-semibold text-slate-900">
                      {selectedDonation.investor?.company_name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Type</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize">
                      {selectedDonation.investor?.investor_type || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Email</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {selectedDonation.investor_profile?.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}