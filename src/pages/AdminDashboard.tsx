import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building2, TrendingUp, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const { toast } = useToast();
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
    }
  }, [role]);

  const fetchDashboardData = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

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
      <DashboardLayout title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Admin Dashboard" 
      description="Manage users, institutions, and system overview"
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatsCard title="Institutions" value={stats.institutions} icon={Building2} />
        <StatsCard title="Investors" value={stats.investors} icon={TrendingUp} />
        <StatsCard title="Pending Verifications" value={stats.pendingVerifications} icon={MessageSquare} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pending verifications</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.user_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleVerification(user.id, 'verified')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVerification(user.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <RecentActivity activities={[]} />
      </div>
    </DashboardLayout>
  );
}
