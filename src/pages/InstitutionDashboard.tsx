import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { InstitutionSidebar } from '@/components/dashboard/InstitutionSidebar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, FileText, Plus, Activity, Calendar, Building2, CheckCircle, TrendingUp, Sparkles, MapPin, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { CertificateUpload } from '@/components/dashboard/CertificateUpload';
import { InstitutionDonations } from '@/components/dashboard/institution/InstitutionDonations';
import InstitutionReports from '@/components/dashboard/institution/InstitutionReports';
import InstitutionAnalytics from '@/components/dashboard/institution/InstitutionAnalytics';
import InstitutionProfile from '@/components/dashboard/institution/InstitutionProfile';
import { Navbar } from '@/components/Navbar';

export default function InstitutionDashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeInvestors: 0,
    pendingMessages: 0,
    verificationStatus: 'pending',
  });
  const [institutionData, setInstitutionData] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);

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

  useEffect(() => {
    if (activeTab === 'messages') {
      navigate('/messages');
    }
  }, [activeTab, navigate]);

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

      // If the institution record is missing, skip dependent queries safely
      if (!institution) {
        setDonations([]);
        setStats({
          totalConversations: 0,
          activeInvestors: 0,
          pendingMessages: 0,
          verificationStatus: profile?.verification_status ?? 'pending',
        });
        return;
      }

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('institution_id', institution.id);

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversations?.map((c: any) => c.id) ?? [])
        .eq('read', false);

      setDonations(conversations ?? []);

      setStats({
        totalConversations: conversations?.length ?? 0,
        activeInvestors: conversations ? new Set(conversations.map((c: any) => c.investor_id).filter(Boolean)).size : 0,
        pendingMessages: messages?.length ?? 0,
        verificationStatus: profile?.verification_status ?? 'pending',
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Welcome Header */}
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Welcome to Your Institution Hub
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Manage your institution profile, track donations, and connect with supporters
              </p>
            </div>

            {/* Verification Alert */}
            {stats.verificationStatus === 'pending' && (
              <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Your institution account is pending verification. Some features may be limited until verification is complete.
                </AlertDescription>
              </Alert>
            )}

            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Activity className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total Donations</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalConversations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-700">Active Donors</p>
                      <p className="text-2xl font-bold text-green-900">{stats.activeInvestors}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <MessageSquare className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-700">Unread Messages</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.pendingMessages}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <CheckCircle className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-700">Verification Status</p>
                      <div className="mt-1">
                        <Badge 
                          variant={stats.verificationStatus === 'verified' ? 'default' : 'secondary'}
                          className="text-sm px-2 py-1"
                        >
                          {stats.verificationStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Donations */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Recent Donations
                  </CardTitle>
                  <CardDescription>Latest donation activity and conversations</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {donations.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                      <div>
                        <p className="text-lg font-semibold text-muted-foreground">No recent donations</p>
                        <p className="text-muted-foreground">Donations will appear here once you start receiving support</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {donations.slice(0, 5).map((donation) => (
                        <div 
                          key={donation.id} 
                          className="flex items-center justify-between p-4 border-2 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                              <Activity className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">Donation #{donation.id.slice(0, 8)}</p>
                              <p className="text-sm text-slate-600 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(donation.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Manage your institution activities</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all duration-300 group"
                    onClick={() => navigate('/messages')}
                    size="lg"
                  >
                    <MessageSquare className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                    View Messages
                    {stats.pendingMessages > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-white text-blue-600">
                        {stats.pendingMessages} new
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    className="w-full border-2 hover:bg-slate-50 transition-colors group"
                    variant="outline"
                    disabled={stats.verificationStatus !== 'verified'}
                    size="lg"
                  >
                    <Plus className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Start New Conversation
                    {stats.verificationStatus !== 'verified' && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Verify Required
                      </Badge>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Institution Details */}
            {institutionData && (
              <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Institution Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2">
                      <Building2 className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Institution Name</p>
                        <p className="font-semibold text-slate-900">{institutionData?.institution_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2">
                      <MapPin className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Location</p>
                        <p className="font-semibold text-slate-900">{institutionData?.city}, {institutionData?.country}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2">
                      <User className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Contact Person</p>
                        <p className="font-semibold text-slate-900">{institutionData?.contact_person || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Impact Summary */}
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200">
              <CardContent className="p-8">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-blue-200/50 rounded-2xl">
                    <Sparkles className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-blue-900 mb-2">Ready to Grow Your Impact?</h3>
                    <p className="text-blue-800/80">
                      {stats.totalConversations > 0 
                        ? `You've already connected with ${stats.activeInvestors} donors and received ${stats.totalConversations} donations. Continue building relationships to expand your impact.`
                        : 'Start your journey by connecting with potential donors and sharing your institution\'s mission.'
                      }
                    </p>
                  </div>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                    onClick={() => navigate('/messages')}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Connect with Donors
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'messages':
        navigate('/messages');
        return null;
      case 'donations':
        return <InstitutionDonations />;
      case 'reports':
        return <InstitutionReports />;
      case 'analytics':
        return <InstitutionAnalytics />;
      case 'profile':
        return (
          <div className="space-y-8">
            <CertificateUpload 
              userType="institution"
              currentCertificateUrl={institutionData?.certificate_url}
              onUploadSuccess={fetchDashboardData}
            />
            <InstitutionProfile />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <InstitutionSidebar 
          selected={activeTab} 
          onSelect={setActiveTab}
          pendingCount={stats.pendingMessages}
          messageCount={stats.pendingMessages}
        />
        <main className="flex-1 overflow-y-auto p-8 pt-24">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}