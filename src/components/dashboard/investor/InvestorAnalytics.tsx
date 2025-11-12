import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, DollarSign, Building2, Calendar, Users, Target, BarChart3, Sparkles } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  totalDonations: number;
  totalAmount: number;
  institutionsSupported: number;
  averageDonation: number;
  donationsByMonth: { month: string; amount: number; count: number }[];
}

export const InvestorAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();

    const donationsChannel = supabase
      .channel('donations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        () => fetchAnalytics()
      )
      .subscribe();

    const investorChannel = supabase
      .channel('investor-profile-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'investors' },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(donationsChannel);
      supabase.removeChannel(investorChannel);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: investor, error: investorError } = await supabase
        .from('investors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (investorError || !investor) {
        toast({
          title: 'Profile required',
          description: 'Please complete your investor profile first.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data: donations, error } = await supabase
        .from('donations')
        .select('*')
        .eq('investor_id', investor.id);

      if (error) throw error;

      // Calculate analytics
      const totalDonations = donations?.length || 0;
      const totalAmount = donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      const institutionsSupported = new Set(donations?.map(d => d.institution_id)).size;
      const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

      // Group by month
      const donationsByMonth = donations?.reduce((acc: any[], donation) => {
        const date = new Date(donation.donation_date);
        const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const existing = acc.find(item => item.month === monthYear);
        if (existing) {
          existing.amount += Number(donation.amount);
          existing.count += 1;
        } else {
          acc.push({
            month: monthYear,
            amount: Number(donation.amount),
            count: 1,
          });
        }
        return acc;
      }, []) || [];

      setAnalytics({
        totalDonations,
        totalAmount,
        institutionsSupported,
        averageDonation,
        donationsByMonth: donationsByMonth.slice(-6), // Last 6 months
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your impact analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <BarChart3 className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <div>
            <p className="text-lg font-semibold text-muted-foreground">No analytics data available</p>
            <p className="text-muted-foreground">Start making donations to see your impact</p>
          </div>
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Impact Analytics
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Track your donation journey and measure your educational impact
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Donations</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{analytics.totalDonations}</div>
            <p className="text-xs text-blue-600">All-time contributions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Total Amount</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">${analytics.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-green-600">Total donated</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Institutions Supported</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{analytics.institutionsSupported}</div>
            <p className="text-xs text-purple-600">Organizations helped</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Average Donation</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">${analytics.averageDonation.toFixed(2)}</div>
            <p className="text-xs text-orange-600">Per contribution</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Donation Amounts Chart */}
        <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Monthly Donation Amounts</CardTitle>
                <CardDescription>Total amount donated over the last 6 months</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer
              config={{
                amount: {
                  label: "Amount",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <BarChart data={analytics.donationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent className="bg-white border-2 shadow-lg" />}
                />
                <Bar 
                  dataKey="amount" 
                  fill="url(#colorAmount)" 
                  radius={[8, 8, 0, 0]} 
                  className="hover:opacity-80 transition-opacity"
                />
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Donation Volume Chart */}
        <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Donation Frequency</CardTitle>
                <CardDescription>Number of donations made per month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer
              config={{
                count: {
                  label: "Donations",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <LineChart data={analytics.donationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent className="bg-white border-2 shadow-lg" />}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="url(#colorCount)" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-2))', r: 6, strokeWidth: 2 }}
                  activeDot={{ r: 8, fill: 'hsl(var(--chart-2))' }}
                />
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Impact Summary */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-full">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary">Your Impact Summary</h3>
              <p className="text-primary/80 mt-1">
                You've supported {analytics.institutionsSupported} institutions with {analytics.totalDonations} donations, 
                contributing ${analytics.totalAmount.toLocaleString()} towards education.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};