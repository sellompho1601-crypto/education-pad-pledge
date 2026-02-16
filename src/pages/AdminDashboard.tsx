import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Users, Building2, TrendingUp, MessageSquare, CheckCircle, XCircle, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { UsersManagement } from '@/components/dashboard/admin/UsersManagement';
import { InstitutionsManagement } from '@/components/dashboard/admin/InstitutionsManagement';
import { InvestorsManagement } from '@/components/dashboard/admin/InvestorsManagement';
import { SettingsManagement } from '@/components/dashboard/admin/SettingsManagement';
import { DonationsManagement } from '@/components/dashboard/admin/DonationsManagement';
import { CertificatesManagement } from '@/components/dashboard/admin/CertificatesManagement';
import { DonationRequestsManagement } from '@/components/dashboard/admin/DonationRequestsManagement';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    institutions: 0,
    investors: 0,
    pendingVerifications: 0,
  });
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      navigate('/');
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (role === 'admin') {
      fetchDashboardData();

      // Set up realtime subscription for profiles table
      const channel = supabase
        .channel('profiles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          },
          () => {
            // Refetch data when any change occurs
            fetchDashboardData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [role]);

  const fetchDashboardData = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching profiles:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch user data: ' + error.message,
          variant: 'destructive',
        });
        return;
      }

      console.log('Fetched profiles:', profiles);

      const pending = profiles?.filter(p => p.verification_status === 'pending') || [];
      const institutions = profiles?.filter(p => p.user_type === 'institution') || [];
      const investors = profiles?.filter(p => p.user_type === 'investor') || [];

      setStats({
        totalUsers: profiles?.length || 0,
        institutions: institutions.length,
        investors: investors.length,
        pendingVerifications: pending.length,
      });

      setPendingUsers(pending);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleVerification = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `User ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      });

      fetchDashboardData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update verification status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Header Section */}
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Manage users, institutions, investors, and system-wide settings
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <Building2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-700">Institutions</p>
                      <p className="text-2xl font-bold text-green-900">{stats.institutions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-700">Investors</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.investors}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <Shield className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-700">Pending Verifications</p>
                      <p className="text-2xl font-bold text-orange-900">{stats.pendingVerifications}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Verifications Card */}
            <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  Pending Verifications
                </CardTitle>
                <CardDescription>Review and approve user registrations requiring verification</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="p-4 bg-green-50 rounded-full inline-flex">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-muted-foreground mb-2">All caught up!</p>
                      <p className="text-muted-foreground">No pending verifications at the moment</p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold text-slate-700 bg-slate-50">Name</TableHead>
                          <TableHead className="font-semibold text-slate-700 bg-slate-50">Type</TableHead>
                          <TableHead className="font-semibold text-slate-700 bg-slate-50">Email</TableHead>
                          <TableHead className="font-semibold text-slate-700 bg-slate-50 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingUsers.map((user) => (
                          <TableRow key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center">
                                  <Users className="h-4 w-4 text-slate-600" />
                                </div>
                                <span>{user.full_name || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize bg-slate-100">
                                {user.user_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                            <TableCell>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleVerification(user.id, 'verified')}
                                  className="bg-green-600 hover:bg-green-700 transition-colors group/btn"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1 group-hover/btn:scale-110 transition-transform" />
                                  Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleVerification(user.id, 'rejected')}
                                  className="group/btn"
                                >
                                  <XCircle className="h-4 w-4 mr-1 group-hover/btn:scale-110 transition-transform" />
                                  Reject
                                </Button>
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

            {/* Quick Actions */}
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-purple-200">
              <CardContent className="p-8">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-purple-200/50 rounded-2xl">
                    <Sparkles className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-purple-900 mb-2">Quick Actions</h3>
                    <p className="text-purple-800/80">
                      Need to manage specific areas? Use the sidebar to navigate to detailed management sections for users, institutions, investors, and system settings.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="border-purple-200 text-purple-700 hover:bg-purple-50"
                      onClick={() => setActiveTab('users')}
                    >
                      Manage Users
                    </Button>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => setActiveTab('settings')}
                    >
                      System Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'users':
        return <UsersManagement />;
      case 'organizations':
        return <InvestorsManagement />;
      case 'institutions':
        return <InstitutionsManagement />;
      case 'settings':
        return <SettingsManagement />;
      case 'donations':
        return <DonationsManagement />;
      case 'certificates':
        return <CertificatesManagement />;
      case 'requests':
        return <DonationRequestsManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50/30">
      <AdminSidebar selected={activeTab} onSelect={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        {renderContent()}
      </main>
    </div>
  );
}