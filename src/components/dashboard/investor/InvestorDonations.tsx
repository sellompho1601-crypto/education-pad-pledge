import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Search, Eye, DollarSign, MapPin, Calendar, Package, Truck, CheckCircle, 
  Clock, Building2, Users, BarChart3, Send, Heart, Target, ClipboardList,
  AlertCircle, XCircle
} from "lucide-react";
import { format } from "date-fns";

interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  donation_date: string;
  message: string | null;
  institution_id: string;
  created_at: string;
}

interface DonationDetails extends Donation {
  institution?: {
    institution_name: string;
    country: string;
    city: string;
  };
}

interface InstitutionWithProfile {
  id: string;
  user_id: string;
  institution_name: string;
  country: string;
  city: string;
  address: string;
  contact_person: string;
  contact_position: string | null;
  profile: {
    full_name: string | null;
    email: string;
    phone: string | null;
    verification_status: string;
  };
  donations_received: number;
  total_pads_received: number;
}

interface DonationRequest {
  id: string;
  institution_id: string;
  investor_id: string;
  product_type: string;
  quantity: number;
  urgency: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  institution_name?: string;
  institution_city?: string;
  institution_country?: string;
}

export const InvestorDonations = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionWithProfile[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<InstitutionWithProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [institutionSearchTerm, setInstitutionSearchTerm] = useState("");
  const [selectedDonation, setSelectedDonation] = useState<DonationDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionWithProfile | null>(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [donationMessage, setDonationMessage] = useState("");
  const [submittingDonation, setSubmittingDonation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'history' | 'requests'>('available');
  const [investorId, setInvestorId] = useState<string | null>(null);
  const [donationRequests, setDonationRequests] = useState<DonationRequest[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (institutionSearchTerm) {
      const filtered = institutions.filter(inst =>
        inst.institution_name.toLowerCase().includes(institutionSearchTerm.toLowerCase()) ||
        inst.city.toLowerCase().includes(institutionSearchTerm.toLowerCase()) ||
        inst.country.toLowerCase().includes(institutionSearchTerm.toLowerCase())
      );
      setFilteredInstitutions(filtered);
    } else {
      setFilteredInstitutions(institutions);
    }
  }, [institutionSearchTerm, institutions]);

  // Realtime subscriptions
  useEffect(() => {
    const requestsChannel = supabase
      .channel('investor-donation-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donation_requests' }, () => fetchData())
      .subscribe();

    const donationsChannel = supabase
      .channel('investor-donations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(donationsChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!investor) return;
      setInvestorId(investor.id);

      // Fetch donations
      const { data: donationsData, error: donationsError } = await supabase
        .from("donations")
        .select("*")
        .eq("investor_id", investor.id)
        .order("created_at", { ascending: false });

      if (donationsError) throw donationsError;
      setDonations(donationsData || []);

      // Fetch donation requests for this investor
      const { data: requestsData } = await supabase
        .from('donation_requests' as any)
        .select('*')
        .eq('investor_id', investor.id)
        .order('created_at', { ascending: false });

      // Enrich requests with institution names
      if (requestsData && (requestsData as any[]).length > 0) {
        const institutionIds = [...new Set((requestsData as any[]).map((r: any) => r.institution_id))];
        const { data: instData } = await supabase
          .from('institutions')
          .select('id, institution_name, city, country')
          .in('id', institutionIds);

        const instMap = new Map((instData || []).map(i => [i.id, i]));
        const enrichedRequests = (requestsData as any[]).map((r: any) => {
          const inst = instMap.get(r.institution_id);
          return {
            ...r,
            institution_name: inst?.institution_name || 'Unknown',
            institution_city: inst?.city || '',
            institution_country: inst?.country || '',
          };
        });
        setDonationRequests(enrichedRequests);
      } else {
        setDonationRequests([]);
      }

      // Fetch verified institutions
      const { data: institutionsData, error: institutionsError } = await supabase
        .from("institutions")
        .select("*");

      if (institutionsError) throw institutionsError;

      if (institutionsData) {
        const userIds = institutionsData.map(inst => inst.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, verification_status")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const verifiedInstitutions = await Promise.all(
          institutionsData
            .filter(inst => {
              const profile = profilesMap.get(inst.user_id);
              return profile?.verification_status === 'verified';
            })
            .map(async (inst) => {
              const profile = profilesMap.get(inst.user_id);
              const { data: instDonations } = await supabase
                .from("donations")
                .select("amount, status")
                .eq("institution_id", inst.id);

              return {
                ...inst,
                profile: profile || { full_name: null, email: '', phone: null, verification_status: 'pending' },
                donations_received: instDonations?.length || 0,
                total_pads_received: instDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0
              };
            })
        );

        setInstitutions(verifiedInstitutions);
        setFilteredInstitutions(verifiedInstitutions);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (donation: Donation) => {
    try {
      const { data: institution } = await supabase
        .from("institutions")
        .select("institution_name, country, city")
        .eq("id", donation.institution_id)
        .single();

      setSelectedDonation({ ...donation, institution });
      setShowDetailsDialog(true);
    } catch (error) {
      console.error("Error fetching donation details:", error);
      toast({ title: "Error", description: "Failed to load donation details", variant: "destructive" });
    }
  };

  const handleDonateClick = (institution: InstitutionWithProfile) => {
    setSelectedInstitution(institution);
    setDonationAmount("");
    setDonationMessage("");
    setShowDonateDialog(true);
  };

  const handleSubmitDonation = async () => {
    if (!selectedInstitution || !investorId || !donationAmount) {
      toast({ title: "Error", description: "Please enter a donation amount", variant: "destructive" });
      return;
    }

    setSubmittingDonation(true);
    try {
      const { error } = await supabase
        .from("donations")
        .insert({
          investor_id: investorId,
          institution_id: selectedInstitution.id,
          amount: parseInt(donationAmount),
          currency: "Pads",
          status: "pending",
          message: donationMessage || null,
        });

      if (error) throw error;

      toast({
        title: "Donation submitted!",
        description: `Your donation of ${donationAmount} pads to ${selectedInstitution.institution_name} has been submitted.`,
      });

      setShowDonateDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error submitting donation:", error);
      toast({ title: "Error", description: "Failed to submit donation", variant: "destructive" });
    } finally {
      setSubmittingDonation(false);
    }
  };

  const handleAcceptRequest = async (request: DonationRequest) => {
    try {
      // Update request status
      const { error } = await supabase
        .from('donation_requests' as any)
        .update({ status: 'accepted' } as any)
        .eq('id', request.id);

      if (error) throw error;

      // Get institution user_id for notification
      const { data: inst } = await supabase
        .from('institutions')
        .select('user_id, institution_name')
        .eq('id', request.institution_id)
        .single();

      if (inst) {
        await supabase.from('notifications').insert({
          user_id: inst.user_id,
          title: 'Donation Request Accepted',
          message: `Your request for ${request.quantity} ${request.product_type} has been accepted by a donor.`,
          type: 'donation_request',
        });
      }

      toast({ title: 'Request Accepted', description: `You accepted the request for ${request.quantity} ${request.product_type}.` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to accept request', variant: 'destructive' });
    }
  };

  const handleDeclineRequest = async (request: DonationRequest) => {
    try {
      const { error } = await supabase
        .from('donation_requests' as any)
        .update({ status: 'declined' } as any)
        .eq('id', request.id);

      if (error) throw error;

      const { data: inst } = await supabase
        .from('institutions')
        .select('user_id')
        .eq('id', request.institution_id)
        .single();

      if (inst) {
        await supabase.from('notifications').insert({
          user_id: inst.user_id,
          title: 'Donation Request Declined',
          message: `Your request for ${request.quantity} ${request.product_type} has been declined.`,
          type: 'donation_request',
        });
      }

      toast({ title: 'Request Declined', description: 'The request has been declined.' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to decline request', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return "default";
      case "pending": case "processing": return "secondary";
      case "cancelled": case "failed": case "declined": return "destructive";
      default: return "outline";
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case "pending": return 25;
      case "processing": return 50;
      case "shipped": return 75;
      case "completed": case "delivered": return 100;
      default: return 0;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "processing": return <Package className="h-4 w-4" />;
      case "shipped": return <Truck className="h-4 w-4" />;
      case "completed": case "delivered": return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high': return <Badge variant="destructive">Urgent</Badge>;
      case 'normal': return <Badge variant="secondary">Normal</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const filteredDonations = donations.filter((donation) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      donation.id.toLowerCase().includes(searchLower) ||
      donation.status.toLowerCase().includes(searchLower) ||
      donation.currency.toLowerCase().includes(searchLower)
    );
  });

  const totalDonated = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const completedDonations = donations.filter(d => d.status === 'completed' || d.status === 'delivered').length;
  const pendingRequests = donationRequests.filter(r => r.status === 'pending');

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
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Sanitary Pad Donations
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Browse verified institutions and make a difference in students' lives
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 w-fit">
          <Button
            variant={activeTab === 'available' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('available')}
            className={`flex items-center gap-2 ${activeTab === 'available' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
          >
            <Building2 className="h-4 w-4" />
            Available Institutions
          </Button>
          <Button
            variant={activeTab === 'requests' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 ${activeTab === 'requests' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
          >
            <ClipboardList className="h-4 w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
          >
            <BarChart3 className="h-4 w-4" />
            My Donations
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl"><Building2 className="h-6 w-6 text-blue-600" /></div>
            <div>
              <p className="text-sm font-medium text-blue-700">Available Institutions</p>
              <p className="text-2xl font-bold text-blue-900">{institutions.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl"><DollarSign className="h-6 w-6 text-green-600" /></div>
            <div>
              <p className="text-sm font-medium text-green-700">Total Donated</p>
              <p className="text-2xl font-bold text-green-900">{totalDonated.toLocaleString()} pads</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl"><ClipboardList className="h-6 w-6 text-amber-600" /></div>
            <div>
              <p className="text-sm font-medium text-amber-700">Pending Requests</p>
              <p className="text-2xl font-bold text-amber-900">{pendingRequests.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl"><CheckCircle className="h-6 w-6 text-purple-600" /></div>
            <div>
              <p className="text-sm font-medium text-purple-700">Delivered</p>
              <p className="text-2xl font-bold text-purple-900">{completedDonations}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'available' ? (
        <>
          {/* Search Section */}
          <Card className="p-6 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search institutions by name, city, or country..."
                value={institutionSearchTerm}
                onChange={(e) => setInstitutionSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg border-2 border-slate-300 focus:border-primary transition-colors"
              />
            </div>
          </Card>

          {/* Institutions Grid */}
          {filteredInstitutions.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <Building2 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg font-semibold text-muted-foreground mb-2">No verified institutions found</p>
                <p className="text-muted-foreground">
                  {institutionSearchTerm ? 'Try adjusting your search terms' : 'Check back later for new institution registrations'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredInstitutions.map((institution) => (
                <Card key={institution.id} className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50 group">
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
                    <CardTitle className="text-xl text-slate-900">{institution.institution_name}</CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {institution.city}, {institution.country}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col">
                    <div className="space-y-4 flex-1">
                      <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg space-y-1">
                        <p><strong>Contact:</strong> {institution.contact_person}</p>
                        {institution.contact_position && <p><strong>Position:</strong> {institution.contact_position}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-1 text-slate-600 mb-1 justify-center">
                            <Package className="h-4 w-4" /><span className="text-xs font-medium">Received</span>
                          </div>
                          <p className="text-lg font-bold text-slate-900">{institution.total_pads_received.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">pads</p>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-1 text-slate-600 mb-1 justify-center">
                            <Heart className="h-4 w-4" /><span className="text-xs font-medium">Donations</span>
                          </div>
                          <p className="text-lg font-bold text-slate-900">{institution.donations_received}</p>
                          <p className="text-xs text-slate-500">received</p>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4 flex items-center justify-center gap-2 group-hover:bg-primary/90"
                        onClick={() => handleDonateClick(institution)}
                      >
                        <Send className="h-4 w-4" />
                        Donate Pads
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : activeTab === 'requests' ? (
        /* Donation Requests Tab */
        <Card className="border-2 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardList className="h-6 w-6 text-primary" />
              Donation Requests
            </CardTitle>
            <CardDescription>Institutions requesting sanitary products from you</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {donationRequests.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <ClipboardList className="h-16 w-16 text-muted-foreground/50 mx-auto" />
                <p className="text-lg font-semibold text-muted-foreground mb-2">No requests yet</p>
                <p className="text-muted-foreground">When institutions request donations from you, they'll appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {donationRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-5 border-2 rounded-xl hover:bg-slate-50/50 hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-bold text-xl text-slate-900">
                              {request.quantity.toLocaleString()} × {request.product_type}
                            </span>
                            <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1">
                              {request.status === 'pending' && <Clock className="h-3 w-3" />}
                              {request.status === 'accepted' && <CheckCircle className="h-3 w-3" />}
                              {request.status === 'declined' && <XCircle className="h-3 w-3" />}
                              {request.status}
                            </Badge>
                            {getUrgencyBadge(request.urgency)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {request.institution_name}
                            </div>
                            {request.institution_city && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {request.institution_city}, {request.institution_country}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(request.created_at), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptRequest(request)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeclineRequest(request)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>

                      {request.message && (
                        <p className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                          <span className="font-medium">Message:</span> {request.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search Section for History */}
          <Card className="p-6 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search donations by ID, status, or currency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg border-2 border-slate-300 focus:border-primary transition-colors"
              />
            </div>
          </Card>

          {/* Donations Table */}
          <Card className="border-2 hover:shadow-xl transition-all duration-300">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Donation History
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Progress</TableHead>
                  <TableHead className="font-semibold text-slate-700">Date</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations.map((donation) => (
                  <TableRow key={donation.id} className="group hover:bg-slate-50/80 cursor-pointer transition-colors border-b-2"
                    onClick={() => handleViewDetails(donation)}>
                    <TableCell className="font-semibold text-lg">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600" />
                        {donation.amount.toLocaleString()} {donation.currency}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(donation.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(donation.status)}
                        {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-32 space-y-2">
                        <Progress value={getStatusProgress(donation.status)} className="h-2 group-hover:scale-105 transition-transform" />
                        <p className="text-xs text-muted-foreground">{getStatusProgress(donation.status)}% complete</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{format(new Date(donation.donation_date), "MMM dd, yyyy")}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(donation.donation_date), "hh:mm a")}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(donation); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDonations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="space-y-4">
                        <Package className="h-16 w-16 text-muted-foreground/50 mx-auto" />
                        <p className="text-lg font-semibold text-muted-foreground">No donations found</p>
                        <p className="text-muted-foreground mt-1">
                          {searchTerm ? "Try adjusting your search terms" : "Start making donations to see them here"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gradient-to-b from-white to-slate-50/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Package className="h-6 w-6 text-primary" />
              Donation Details
            </DialogTitle>
          </DialogHeader>
          {selectedDonation && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl border-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-muted-foreground">Amount</label>
                  <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
                    <Package className="h-6 w-6" />
                    {selectedDonation.amount.toLocaleString()} {selectedDonation.currency}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(selectedDonation.status)} className="text-sm px-3 py-1.5 flex items-center gap-1 w-fit">
                      {getStatusIcon(selectedDonation.status)}
                      {selectedDonation.status.charAt(0).toUpperCase() + selectedDonation.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white rounded-xl border-2">
                <label className="text-sm font-semibold text-muted-foreground mb-4 block">Delivery Progress</label>
                <div className="space-y-4">
                  <Progress value={getStatusProgress(selectedDonation.status)} className="h-3 bg-slate-200" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Initiated</span><span>Processing</span><span>Shipped</span><span>Delivered</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl border-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Donation Date
                  </label>
                  <p className="font-medium">{format(new Date(selectedDonation.donation_date), "PPP 'at' hh:mm a")}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Transaction Created</label>
                  <p className="font-medium">{format(new Date(selectedDonation.created_at), "PPP 'at' hh:mm a")}</p>
                </div>
              </div>
              {selectedDonation.message && (
                <div className="p-6 bg-white rounded-xl border-2">
                  <label className="text-sm font-semibold text-muted-foreground mb-3 block">Your Message</label>
                  <p className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-900">{selectedDonation.message}</p>
                </div>
              )}
              {selectedDonation.institution && (
                <div className="p-6 bg-white rounded-xl border-2 border-green-200 bg-green-50/50">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-green-900">
                    <MapPin className="h-5 w-5" /> Institution Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-green-700">Institution Name</label>
                      <p className="font-semibold text-green-900">{selectedDonation.institution.institution_name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-green-700">Location</label>
                      <p className="font-semibold text-green-900">{selectedDonation.institution.city}, {selectedDonation.institution.country}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Donate Dialog */}
      <Dialog open={showDonateDialog} onOpenChange={setShowDonateDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Donate to {selectedInstitution?.institution_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Number of Pads</Label>
              <Input id="amount" type="number" placeholder="Enter number of pads" value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)} min="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea id="message" placeholder="Add a message to the institution..." value={donationMessage}
                onChange={(e) => setDonationMessage(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDonateDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitDonation} disabled={submittingDonation || !donationAmount}>
              {submittingDonation ? "Submitting..." : "Submit Donation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
