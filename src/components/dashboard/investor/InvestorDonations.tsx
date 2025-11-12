import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { Badge } from "@/components/ui/badge";
import { Search, Eye, DollarSign, MapPin, Calendar, Package, Truck, CheckCircle, Clock } from "lucide-react";
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

export const InvestorDonations = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDonation, setSelectedDonation] = useState<DonationDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!investor) return;

      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("investor_id", investor.id)
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
      const { data: institution } = await supabase
        .from("institutions")
        .select("institution_name, country, city")
        .eq("id", donation.institution_id)
        .single();

      setSelectedDonation({
        ...donation,
        institution,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "default";
      case "pending":
      case "processing":
        return "secondary";
      case "cancelled":
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case "pending":
        return 25;
      case "processing":
        return 50;
      case "shipped":
        return 75;
      case "completed":
      case "delivered":
        return 100;
      default:
        return 0;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <Package className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "completed":
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your donations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          My Donations
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Track your donations and follow their journey to making an impact
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Total Donated</p>
              <p className="text-2xl font-bold text-blue-900">${totalDonated.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Total Donations</p>
              <p className="text-2xl font-bold text-green-900">{donations.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-700">Delivered</p>
              <p className="text-2xl font-bold text-purple-900">{completedDonations}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Section */}
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
              <TableRow 
                key={donation.id} 
                className="group hover:bg-slate-50/80 cursor-pointer transition-colors border-b-2"
                onClick={() => handleViewDetails(donation)}
              >
                <TableCell className="font-semibold text-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    {donation.currency} {donation.amount.toLocaleString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={getStatusColor(donation.status)} 
                    className="flex items-center gap-1 w-fit"
                  >
                    {getStatusIcon(donation.status)}
                    {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="w-32 space-y-2">
                    <Progress 
                      value={getStatusProgress(donation.status)} 
                      className="h-2 group-hover:scale-105 transition-transform"
                    />
                    <p className="text-xs text-muted-foreground">
                      {getStatusProgress(donation.status)}% complete
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {format(new Date(donation.donation_date), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(donation.donation_date), "hh:mm a")}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(donation);
                    }}
                  >
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
                    <div>
                      <p className="text-lg font-semibold text-muted-foreground">
                        No donations found
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {searchTerm ? "Try adjusting your search terms" : "Start making donations to see them here"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl bg-gradient-to-b from-white to-slate-50/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Package className="h-6 w-6 text-primary" />
              Donation Details
            </DialogTitle>
          </DialogHeader>
          {selectedDonation && (
            <div className="space-y-8">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl border-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-muted-foreground">Amount</label>
                  <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
                    <DollarSign className="h-6 w-6" />
                    {selectedDonation.currency} {selectedDonation.amount.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant={getStatusColor(selectedDonation.status)} 
                      className="text-sm px-3 py-1.5 flex items-center gap-1 w-fit"
                    >
                      {getStatusIcon(selectedDonation.status)}
                      {selectedDonation.status.charAt(0).toUpperCase() + selectedDonation.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="p-6 bg-white rounded-xl border-2">
                <label className="text-sm font-semibold text-muted-foreground mb-4 block">
                  Delivery Progress
                </label>
                <div className="space-y-4">
                  <Progress 
                    value={getStatusProgress(selectedDonation.status)} 
                    className="h-3 bg-slate-200"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Initiated</span>
                    <span>Processing</span>
                    <span>Shipped</span>
                    <span>Delivered</span>
                  </div>
                  <p className={`text-sm font-medium ${
                    selectedDonation.status === 'completed' || selectedDonation.status === 'delivered' 
                      ? 'text-green-600' 
                      : 'text-blue-600'
                  }`}>
                    {selectedDonation.status === 'completed' || selectedDonation.status === 'delivered' 
                      ? '🎉 Donation delivered successfully!' 
                      : `🔄 Currently ${selectedDonation.status}`}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl border-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Donation Date
                  </label>
                  <p className="font-medium">{format(new Date(selectedDonation.donation_date), "PPP 'at' hh:mm a")}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Transaction Created</label>
                  <p className="font-medium">{format(new Date(selectedDonation.created_at), "PPP 'at' hh:mm a")}</p>
                </div>
              </div>

              {/* Message */}
              {selectedDonation.message && (
                <div className="p-6 bg-white rounded-xl border-2">
                  <label className="text-sm font-semibold text-muted-foreground mb-3 block">
                    Your Message
                  </label>
                  <p className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-900">
                    {selectedDonation.message}
                  </p>
                </div>
              )}

              {/* Institution Info */}
              {selectedDonation.institution && (
                <div className="p-6 bg-white rounded-xl border-2 border-green-200 bg-green-50/50">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-green-900">
                    <MapPin className="h-5 w-5" />
                    Institution Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-green-700">Institution Name</label>
                      <p className="font-semibold text-green-900">{selectedDonation.institution.institution_name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-green-700">Location</label>
                      <p className="font-semibold text-green-900">
                        {selectedDonation.institution.city}, {selectedDonation.institution.country}
                      </p>
                    </div>
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