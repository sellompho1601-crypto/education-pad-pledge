import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Package, Building2, User, Calendar, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface DonationRequest {
  id: string;
  product_type: string;
  quantity: number;
  urgency: string;
  status: string;
  message: string | null;
  institution_id: string;
  investor_id: string;
  created_at: string;
  updated_at: string;
}

interface RequestDetails extends DonationRequest {
  institution?: { institution_name: string; city: string; country: string; user_id: string };
  investor?: { company_name: string | null; investor_type: string; user_id: string };
  institution_profile?: { full_name: string | null; email: string };
  investor_profile?: { full_name: string | null; email: string };
}

export const DonationRequestsManagement = () => {
  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RequestDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-donation-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donation_requests' }, () => {
        fetchRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("donation_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching donation requests:", error);
      toast({ title: "Error", description: "Failed to load donation requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (request: DonationRequest) => {
    try {
      const { data: institution } = await supabase
        .from("institutions").select("institution_name, city, country, user_id")
        .eq("id", request.institution_id).single();

      const { data: investor } = await supabase
        .from("investors").select("company_name, investor_type, user_id")
        .eq("id", request.investor_id).single();

      const { data: instProfile } = institution?.user_id
        ? await supabase.from("profiles").select("full_name, email").eq("id", institution.user_id).single()
        : { data: null };

      const { data: invProfile } = investor?.user_id
        ? await supabase.from("profiles").select("full_name, email").eq("id", investor.user_id).single()
        : { data: null };

      setSelectedRequest({
        ...request,
        institution: institution || undefined,
        investor: investor || undefined,
        institution_profile: instProfile || undefined,
        investor_profile: invProfile || undefined,
      });
      setShowDetailsDialog(true);
    } catch (error) {
      console.error("Error fetching request details:", error);
      toast({ title: "Error", description: "Failed to load request details", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('donation_requests').update({ status: newStatus }).eq('id', requestId);
      if (error) throw error;

      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
      toast({ title: "Status Updated", description: `Request status changed to "${newStatus}"` });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update request status", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "declined": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal": return "bg-blue-100 text-blue-800 border-blue-200";
      case "low": return "bg-slate-100 text-slate-800 border-slate-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredRequests = requests.filter((r) => {
    const s = searchTerm.toLowerCase();
    return r.product_type.toLowerCase().includes(s) || r.status.toLowerCase().includes(s) || r.urgency.toLowerCase().includes(s);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading donation requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
          Donation Requests
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Monitor and manage all sanitary product donation requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl"><Package className="h-6 w-6 text-blue-600" /></div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Requests</p>
                <p className="text-2xl font-bold text-blue-900">{requests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl"><Clock className="h-6 w-6 text-yellow-600" /></div>
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{requests.filter(r => r.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl"><CheckCircle className="h-6 w-6 text-green-600" /></div>
              <div>
                <p className="text-sm font-medium text-green-700">Accepted</p>
                <p className="text-2xl font-bold text-green-900">{requests.filter(r => r.status === 'accepted').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl"><XCircle className="h-6 w-6 text-red-600" /></div>
              <div>
                <p className="text-sm font-medium text-red-700">Declined</p>
                <p className="text-2xl font-bold text-red-900">{requests.filter(r => r.status === 'declined').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">All Requests</h2>
              <p className="text-muted-foreground">Review donation requests from institutions</p>
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search by product, status, urgency..."
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
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Product</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Quantity</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Urgency</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Date</TableHead>
                  <TableHead className="font-semibold text-slate-700 bg-slate-50 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Package className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="font-semibold text-slate-900 capitalize">{request.product_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{request.quantity}</TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${getUrgencyColor(request.urgency)}`}>{request.urgency}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${getStatusColor(request.status)}`}>{request.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">{format(new Date(request.created_at), "MMM dd, yyyy")}</p>
                      <p className="text-xs text-slate-500">{format(new Date(request.created_at), "hh:mm a")}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(request)}
                          className="border-slate-300 hover:bg-slate-100">
                          <Eye className="h-4 w-4 mr-2" /> Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-lg font-semibold text-muted-foreground mb-2">No requests found</p>
              <p className="text-muted-foreground">{searchTerm ? 'Try adjusting your search' : 'No donation requests yet'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gradient-to-b from-white to-slate-50/50 border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-purple-100 rounded-lg"><Package className="h-6 w-6 text-purple-600" /></div>
              Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6 py-4">
              {/* Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Product Type</label>
                  <p className="text-xl font-bold text-slate-900 capitalize">{selectedRequest.product_type}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Quantity</label>
                  <p className="text-xl font-bold text-slate-900">{selectedRequest.quantity}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Urgency</label>
                  <Badge className={`text-base px-3 py-1 capitalize ${getUrgencyColor(selectedRequest.urgency)}`}>{selectedRequest.urgency}</Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <Badge className={`text-base px-3 py-1 capitalize ${getStatusColor(selectedRequest.status)}`}>{selectedRequest.status}</Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Calendar className="h-4 w-4" />Requested</label>
                  <p className="font-medium text-slate-900">{format(new Date(selectedRequest.created_at), "PPP 'at' hh:mm a")}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Last Updated</label>
                  <p className="font-medium text-slate-900">{format(new Date(selectedRequest.updated_at), "PPP 'at' hh:mm a")}</p>
                </div>
              </div>

              {/* Update Status */}
              <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2 mb-3">
                  <RefreshCw className="h-4 w-4" /> Update Status
                </h3>
                <div className="flex items-center gap-4">
                  <Select defaultValue={selectedRequest.status} onValueChange={(v) => handleUpdateStatus(selectedRequest.id, v)} disabled={updatingStatus}>
                    <SelectTrigger className="w-[200px] bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  {updatingStatus && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>}
                </div>
              </div>

              {/* Message */}
              {selectedRequest.message && (
                <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4" /> Request Message
                  </h3>
                  <p className="text-blue-800 p-3 bg-white rounded-lg border border-blue-100">{selectedRequest.message}</p>
                </div>
              )}

              {/* Parties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-600" /> Institution
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Name</span>
                      <span className="font-semibold text-slate-900">{selectedRequest.institution?.institution_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Location</span>
                      <span className="font-semibold text-slate-900">{selectedRequest.institution?.city}, {selectedRequest.institution?.country}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Contact</span>
                      <span className="font-semibold text-slate-900">{selectedRequest.institution_profile?.full_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Email</span>
                      <span className="font-semibold text-slate-900 text-sm">{selectedRequest.institution_profile?.email || "N/A"}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" /> Investor
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Company</span>
                      <span className="font-semibold text-slate-900">{selectedRequest.investor?.company_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Type</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize">{selectedRequest.investor?.investor_type || "N/A"}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Contact</span>
                      <span className="font-semibold text-slate-900">{selectedRequest.investor_profile?.full_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Email</span>
                      <span className="font-semibold text-slate-900 text-sm">{selectedRequest.investor_profile?.email || "N/A"}</span>
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
