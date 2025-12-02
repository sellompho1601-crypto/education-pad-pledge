import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { InvestorSidebar } from '@/components/dashboard/InvestorSidebar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Building2, FileText, Plus, Heart, CheckCircle, TrendingUp, Users, Award, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { CertificateUpload } from '@/components/dashboard/CertificateUpload';
import { InvestorDonations } from '@/components/dashboard/investor/InvestorDonations';
import { InstitutionsList } from '@/components/dashboard/investor/InstitutionsList';
import { InvestorAnalytics } from '@/components/dashboard/investor/InvestorAnalytics';
import InvestorReports from '@/components/dashboard/investor/InvestorReport';
import { InvestorProfile } from '@/components/dashboard/investor/InvestorProfile';

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeInstitutions: 0,
    pendingMessages: 0,
    verificationStatus: 'pending',
  });
  const [investorData, setInvestorData] = useState<any>(null);

  useEffect(() => {
    if (!loading && role !== 'investor') {
      navigate('/');
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (role === 'investor') {
      fetchDashboardData();
    }
  }, [role]);

  // Move navigation side-effect out of render to avoid React warnings
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

      const { data: investor } = await supabase
        .from('investors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setInvestorData(investor);

      if (!investor) {
        setStats({
          totalConversations: 0,
          activeInstitutions: 0,
          pendingMessages: 0,
          verificationStatus: profile?.verification_status || 'pending',
        });
        return;
      }

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('investor_id', investor.id);

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversations?.map(c => c.id) || [])
        .eq('read', false);

      setStats({
        totalConversations: conversations?.length || 0,
        activeInstitutions: new Set(conversations?.map(c => c.institution_id)).size || 0,
        pendingMessages: messages?.length || 0,
        verificationStatus: profile?.verification_status || 'pending',
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
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Welcome to Your Investor Portal
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Track your impact, connect with institutions, and make a difference in education
              </p>
            </div>

            {/* Verification Alert */}
            {stats.verificationStatus === 'pending' && (
              <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Your investor account is pending verification. Some features may be limited until verification is complete.
                </AlertDescription>
              </Alert>
            )}

            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Heart className="h-6 w-6 text-blue-600" />
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
                      <Building2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-700">Institutions Supported</p>
                      <p className="text-2xl font-bold text-green-900">{stats.activeInstitutions}</p>
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
                      <Award className="h-6 w-6 text-orange-600" />
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

            {/* Action Cards */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Common tasks and navigation</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 group"
                    onClick={() => navigate('/messages')}
                    size="lg"
                  >
                    <MessageSquare className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                    View Messages
                    {stats.pendingMessages > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-white text-primary">
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
                    <Building2 className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Browse Institutions
                    {stats.verificationStatus !== 'verified' && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Verify Required
                      </Badge>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {investorData && (
                <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
                  <CardHeader className="pb-4 border-b">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Users className="h-5 w-5 text-primary" />
                      Investor Profile
                    </CardTitle>
                    <CardDescription>Your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Investor Type</span>
                      <Badge variant="secondary" className="font-semibold">
                        {investorData.investor_type || 'Individual'}
                      </Badge>
                    </div>
                    {investorData.company_name && (
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Company Name</span>
                        <span className="font-semibold text-slate-900">{investorData.company_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Status</span>
                      <Badge 
                        variant={stats.verificationStatus === 'verified' ? 'default' : 'secondary'}
                        className="font-semibold"
                      >
                        {stats.verificationStatus}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Impact Summary */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-8">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-primary/20 rounded-2xl">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-primary mb-2">Ready to Make an Impact?</h3>
                    <p className="text-primary/80">
                      {stats.totalConversations > 0 
                        ? `You've already supported ${stats.activeInstitutions} institutions with ${stats.totalConversations} donations. Continue making a difference by exploring new opportunities.`
                        : 'Start your journey by browsing institutions and making your first donation to support education.'
                      }
                    </p>
                  </div>
                  <Button 
                    className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                    onClick={() => setActiveTab('institutions')}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Explore Institutions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'donations':
        return <InvestorDonations />;
      case 'institutions':
        return <InstitutionsList />;
      case 'messages':
        return null;
      case 'analytics':
        return <InvestorAnalytics />;
      case 'reports':
        return <InvestorReports />;
      case 'profile':
        return (
          <div className="space-y-8">
            <CertificateUpload 
              userType="investor"
              currentCertificateUrl={investorData?.certificate_url}
              onUploadSuccess={fetchDashboardData}
            />
            <InvestorProfile />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50/30">
      <InvestorSidebar 
        selected={activeTab} 
        onSelect={setActiveTab}
        messageCount={stats.pendingMessages}
      />
      <main className="flex-1 overflow-y-auto p-8">
        {renderContent()}
      </main>
    </div>
  );
}