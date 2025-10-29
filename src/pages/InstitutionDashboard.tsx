import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, TrendingUp, FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function InstitutionDashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeInvestors: 0,
    pendingMessages: 0,
    verificationStatus: 'pending',
  });
  const [institutionData, setInstitutionData] = useState<any>(null);

  useEffect(() => {
    if (!loading && role !== 'institution') {
      navigate('/');
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (role === 'institution') {
      fetchDashboardData();
    }
  }, [role]);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: institution } = await supabase
        .from('institutions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setInstitutionData(institution);

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('institution_id', institution?.id || '');

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversations?.map(c => c.id) || [])
        .eq('read', false);

      setStats({
        totalConversations: conversations?.length || 0,
        activeInvestors: new Set(conversations?.map(c => c.investor_id)).size || 0,
        pendingMessages: messages?.length || 0,
        verificationStatus: profile?.verification_status || 'pending',
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Institution Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Institution Dashboard" 
      description={`Welcome back, ${institutionData?.institution_name || 'Institution'}`}
    >
      {stats.verificationStatus === 'pending' && (
        <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <p className="text-sm font-medium">
              Your account is pending verification. You'll be able to access all features once verified.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard title="Total Conversations" value={stats.totalConversations} icon={MessageSquare} />
        <StatsCard title="Active Investors" value={stats.activeInvestors} icon={Users} />
        <StatsCard title="Pending Messages" value={stats.pendingMessages} icon={FileText} />
        <StatsCard 
          title="Verification Status" 
          value={
            <Badge variant={stats.verificationStatus === 'verified' ? 'default' : 'secondary'}>
              {stats.verificationStatus}
            </Badge>
          } 
          icon={TrendingUp} 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full" 
              variant="hero"
              onClick={() => navigate('/messages')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              View Messages
            </Button>
            <Button 
              className="w-full" 
              variant="outline"
              disabled={stats.verificationStatus !== 'verified'}
            >
              <Plus className="mr-2 h-4 w-4" />
              Start New Conversation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Institution Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Institution Name</p>
              <p className="font-medium">{institutionData?.institution_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{institutionData?.city}, {institutionData?.country}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Person</p>
              <p className="font-medium">{institutionData?.contact_person || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
