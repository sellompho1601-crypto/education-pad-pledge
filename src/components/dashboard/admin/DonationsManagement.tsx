import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, DollarSign, Building2, User, MapPin, Mail, Calendar, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  donation_date: string;
  message: string | null;
  investor_id: string;
  institution_id: string;
  created_at: string;
}

interface DonationDetails extends Donation {
  investor?: {
    company_name: string | null;
    investor_type: string;
    user_id: string;
  };
  institution?: {
    institution_name: string;
    country: string;
    city: string;
    user_id: string;
  };
  investor_profile?: {
    full_name: string | null;
    email: string;
  };
  institution_profile?: {
    full_name: string | null;
    email: string;
  };
}

export const DonationsManagement = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDonation, setSelectedDonation] = useState<DonationDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error("Error fetching donations:", error);
      toast({
        title: "Error",
        description: "Failed to load donations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (donation: Donation) => {
    try {
      // Fetch investor details
      const { data: investor } = await supabase
        .from("investors")
        .select("company_name, investor_type, user_id")
        .eq("id", donation.investor_id)
        .single();

      // Fetch institution details
      const { data: institution } = await supabase
        .from("institutions")
        .select("institution_name, country, city, user_id")
        .eq("id", donation.institution_id)
        .single();

      // Fetch investor profile
      const { data: investorProfile } = investor?.user_id
        ? await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", investor.user_id)
            .single()
        : { data: null };

      // Fetch institution profile
      const { data: institutionProfile } = institution?.user_id
        ? await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", institution.user_id)
            .single()
        : { data: null };

      setSelectedDonation({
        ...donation,
        investor,
        institution,
        investor_profile: investorProfile || undefined,
        institution_profile: institutionProfile || undefined,
      });
      setShowDetailsDialog(true);
    } catch (error) {
      console.error("Error fetching donation details:", error);
      toast({
        title: "Error",
        description: "Failed to load donation details",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (donationId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('donations')
        .update({ status: newStatus })
        .eq('id', donationId);

      if (error) throw error;

      // Update local state
      setDonations(prev => prev.map(d => d.id === donationId ? { ...d, status: newStatus } : d));
      if (selectedDonation && selectedDonation.id === donationId) {
        setSelectedDonation({ ...selectedDonation, status: newStatus });
      }

      toast({
        title: "Status Updated",
        description: `Donation status changed to "${newStatus}"`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update donation status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-donations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        fetchDonations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading donations data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
          Donations Management
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Track and manage all donations between investors and institutions
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Donations</p>
                <p className="text-2xl font-bold text-blue-900">{donations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {donations.filter(d => d.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {donations.filter(d => d.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <Sparkles className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-700">Failed/Cancelled</p>
                <p className="text-2xl font-bold text-red-900">
                  {donations.filter(d => d.status === 'cancelled' || d.status === 'failed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table Section */}
      <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">All Donations</h2>
              <p className="text-muted-foreground">Manage and review donation transactions</p>
            </div>
            
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search donations by ID, status, or currency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg border-2 border-slate-300 focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="border-2 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Amount</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Date</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Currency</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations.map((donation) => (
                  <TableRow key={donation.id} className="hover:bg-slate-50/80 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-lg">
                            {donation.amount.toLocaleString()} {donation.currency}
                          </p>
                          <p className="text-xs text-slate-500">ID: {donation.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-medium ${getStatusColor(donation.status)}`}>
                        {donation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">
                          {format(new Date(donation.donation_date), "MMM dd, yyyy")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(donation.donation_date), "hh:mm a")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                        {donation.currency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(donation)}
                          className="border-slate-300 hover:bg-slate-100 transition-colors group/btn"
                        >
                          <Eye className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                          Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredDonations.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <div>
                <p className="text-lg font-semibold text-muted-foreground mb-2">No donations found</p>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'No donations recorded yet'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donation Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl bg-gradient-to-b from-white to-slate-50/50 border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              Donation Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedDonation && (
            <div className="space-y-8 py-4">
              {/* Donation Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Amount
                  </label>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedDonation.amount.toLocaleString()} {selectedDonation.currency}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Current Status</label>
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
                  <label className="text-sm font-semibold text-slate-700">Created At</label>
                  <p className="font-medium text-slate-900">
                    {format(new Date(selectedDonation.created_at), "PPP 'at' hh:mm a")}
                  </p>
                </div>
              </div>

              {/* Update Status Section */}
              <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2 mb-3">
                  <RefreshCw className="h-4 w-4" />
                  Update Donation Status
                </h3>
                <div className="flex items-center gap-4">
                  <Select
                    defaultValue={selectedDonation.status}
                    onValueChange={(value) => handleUpdateStatus(selectedDonation.id, value)}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-[200px] bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  {updatingStatus && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  )}
                </div>
              </div>

              {/* Message Section */}
              {selectedDonation.message && (
                <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4" />
                    Donor Message
                  </h3>
                  <p className="text-blue-800 p-3 bg-white rounded-lg border border-blue-100">
                    {selectedDonation.message}
                  </p>
                </div>
              )}

              {/* Parties Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Investor Information */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Investor Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Company Name</span>
                      <span className="font-semibold text-slate-900">{selectedDonation.investor?.company_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Investor Type</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize">
                        {selectedDonation.investor?.investor_type}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Contact Name</span>
                      <span className="font-semibold text-slate-900">{selectedDonation.investor_profile?.full_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Email</span>
                      <span className="font-semibold text-slate-900 text-sm">{selectedDonation.investor_profile?.email}</span>
                    </div>
                  </div>
                </div>

                {/* Institution Information */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-600" />
                    Institution Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Institution Name</span>
                      <span className="font-semibold text-slate-900">{selectedDonation.institution?.institution_name}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Location</span>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {selectedDonation.institution?.city}, {selectedDonation.institution?.country}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Contact Name</span>
                      <span className="font-semibold text-slate-900">{selectedDonation.institution_profile?.full_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Email</span>
                      <span className="font-semibold text-slate-900 text-sm">{selectedDonation.institution_profile?.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};