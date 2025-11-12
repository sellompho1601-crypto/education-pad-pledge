import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  DollarSign,
  Target,
  Activity,
  Sparkles,
  ChartNoAxesCombined,
  PieChart,
  LineChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  totalDonations: number;
  totalAmount: number;
  averageDonation: number;
  activeDonors: number;
  conversionRate: number;
  monthlyTrend: Array<{
    month: string;
    donations: number;
    amount: number;
  }>;
  donorAnalytics: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  campaignPerformance: Array<{
    campaign: string;
    donations: number;
    amount: number;
    conversion: number;
  }>;
}

interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  dateRange: 'month' | 'quarter' | 'year' | 'custom';
  includeCharts: boolean;
}

export default function InstitutionReports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Get current institution ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: institution } = await supabase
        .from('institutions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!institution) throw new Error('Institution not found');

      // Fetch donations data
      const { data: donations } = await supabase
        .from('donations')
        .select('*')
        .eq('institution_id', institution.id)
        .gte('created_at', getDateRangeStart(dateRange));

      // Fetch conversations for donor analytics
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('institution_id', institution.id);

      // Fetch messages for engagement metrics
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversations?.map(c => c.id) || []);

      // Process data for reports
      const processedData = processReportData(donations || [], conversations || [], messages || []);
      setReportData(processedData);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (
    donations: any[], 
    conversations: any[], 
    messages: any[]
  ): ReportData => {
    const totalDonations = donations.length;
    const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;
    const activeDonors = new Set(donations.map(d => d.donor_id)).size;
    
    // Calculate conversion rate (conversations to donations)
    const conversionRate = conversations.length > 0 
      ? (totalDonations / conversations.length) * 100 
      : 0;

    // Monthly trend data (last 6 months)
    const monthlyTrend = generateMonthlyTrend(donations);

    // Donor type analytics
    const donorAnalytics = generateDonorAnalytics(conversations);

    // Campaign performance (placeholder - would need campaign data)
    const campaignPerformance = generateCampaignPerformance(donations);

    return {
      totalDonations,
      totalAmount,
      averageDonation,
      activeDonors,
      conversionRate,
      monthlyTrend,
      donorAnalytics,
      campaignPerformance,
    };
  };

  const generateMonthlyTrend = (donations: any[]) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthDonations = donations.filter(d => {
        const donationDate = new Date(d.created_at);
        return donationDate.getMonth() === date.getMonth() && 
               donationDate.getFullYear() === date.getFullYear();
      });

      const monthAmount = monthDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      months.push({
        month: monthName,
        donations: monthDonations.length,
        amount: monthAmount,
      });
    }
    
    return months;
  };

  const generateDonorAnalytics = (conversations: any[]) => {
    const types = {
      'Individual Investor': 0,
      'Corporate Investor': 0,
      'Foundation': 0,
      'Other': 0,
    };

    conversations.forEach(conv => {
      // This would need to be enhanced with actual donor type data
      types['Individual Investor'] = (types['Individual Investor'] || 0) + 1;
    });

    const total = conversations.length || 1;
    return Object.entries(types)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / total) * 100,
      }));
  };

  const generateCampaignPerformance = (donations: any[]) => {
    // Placeholder campaign data - would be enhanced with actual campaign tracking
    return [
      { campaign: 'General Fund', donations: donations.length * 0.4, amount: 0, conversion: 15 },
      { campaign: 'Emergency Relief', donations: donations.length * 0.3, amount: 0, conversion: 22 },
      { campaign: 'Education Program', donations: donations.length * 0.2, amount: 0, conversion: 18 },
      { campaign: 'Healthcare Initiative', donations: donations.length * 0.1, amount: 0, conversion: 12 },
    ];
  };

  const getDateRangeStart = (range: string): string => {
    const now = new Date();
    switch (range) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'quarter':
        return new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
      case 'year':
        return new Date(now.getFullYear(), 0, 1).toISOString();
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      setExporting(true);

      if (options.format !== 'pdf') {
        toast({
          title: 'Unsupported format',
          description: 'Only PDF export is currently supported.',
        });
        return;
      }

      if (!reportData) {
        toast({
          title: 'No data to export',
          description: 'Please load report data before exporting.',
          variant: 'destructive',
        });
        return;
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      // Header
      doc.setFontSize(18);
      doc.text('Institution Report', 40, 40);
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 60);
      doc.text(`Period: ${options.dateRange}`, 40, 75);

      // KPI Table
      autoTable(doc, {
        startY: 95,
        head: [['Metric', 'Value']],
        body: [
          ['Total Donations', String(reportData.totalDonations)],
          ['Total Amount', `$${(reportData.totalAmount || 0).toLocaleString()}`],
          ['Average Donation', `$${(reportData.averageDonation || 0).toFixed(2)}`],
          ['Active Donors', String(reportData.activeDonors)],
          ['Conversion Rate', `${(reportData.conversionRate || 0).toFixed(1)}%`],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      // Monthly Trend
      autoTable(doc, {
        startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : 140,
        head: [['Month', 'Donations', 'Amount']],
        body: (reportData.monthlyTrend || []).map(m => [
          m.month,
          String(m.donations),
          `$${(m.amount || 0).toLocaleString()}`,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      // Donor Analytics
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Donor Type', 'Count', 'Percentage']],
        body: (reportData.donorAnalytics || []).map(d => [
          d.type,
          String(d.count),
          `${(d.percentage || 0).toFixed(1)}%`,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      // Campaign Performance
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Campaign', 'Donations', 'Amount', 'Conversion']],
        body: (reportData.campaignPerformance || []).map(c => [
          c.campaign,
          String(Math.round(c.donations || 0)),
          `$${(c.amount || 0).toLocaleString()}`,
          `${Math.round(c.conversion || 0)}%`,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      doc.save(`institution_report_${new Date().toISOString().slice(0, 10)}.pdf`);

      toast({
        title: 'Export Complete',
        description: 'PDF report downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Unable to export report',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendLabel, color = 'blue' }: any) => {
    const colorClasses = {
      blue: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-600',
      green: 'from-green-50 to-emerald-50 border-green-200 text-green-600',
      purple: 'from-purple-50 to-violet-50 border-purple-200 text-purple-600',
      orange: 'from-orange-50 to-amber-50 border-orange-200 text-orange-600',
    };

    return (
      <Card className={`bg-gradient-to-br ${colorClasses[color]} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              color === 'blue' ? 'bg-blue-100' :
              color === 'green' ? 'bg-green-100' :
              color === 'purple' ? 'bg-purple-100' :
              'bg-orange-100'
            }`}>
              <Icon className={`h-6 w-6 ${
                color === 'blue' ? 'text-blue-600' :
                color === 'green' ? 'text-green-600' :
                color === 'purple' ? 'text-purple-600' :
                'text-orange-600'
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <p className="text-xs mt-1">
                  <span className={trend > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {trend > 0 ? '+' : ''}{trend}%
                  </span>
                  {' '}<span className="text-slate-600">{trendLabel}</span>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive insights into your institution's performance and impact
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-slate-200 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                    <div className="h-8 bg-slate-200 rounded w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Reports & Analytics
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Comprehensive insights into your institution's performance and impact
        </p>
      </div>

      {/* Action Bar */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">Time Period:</span>
              </div>
              <Tabs value={dateRange} onValueChange={(value) => setDateRange(value as any)}>
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="month" className="data-[state=active]:bg-white">This Month</TabsTrigger>
                  <TabsTrigger value="quarter" className="data-[state=active]:bg-white">This Quarter</TabsTrigger>
                  <TabsTrigger value="year" className="data-[state=active]:bg-white">This Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={fetchReportData}
                disabled={loading}
                className="border-2 hover:bg-white transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                onClick={() => handleExport({ format: 'pdf', dateRange, includeCharts: true })}
                disabled={exporting}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all duration-300"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Donations"
          value={reportData?.totalDonations || 0}
          icon={DollarSign}
          trend={12}
          trendLabel="vs last period"
          color="blue"
        />
        <StatCard
          title="Total Amount"
          value={`$${(reportData?.totalAmount || 0).toLocaleString()}`}
          icon={TrendingUp}
          trend={8}
          trendLabel="vs last period"
          color="green"
        />
        <StatCard
          title="Active Donors"
          value={reportData?.activeDonors || 0}
          icon={Users}
          trend={15}
          trendLabel="new donors"
          color="purple"
        />
        <StatCard
          title="Conversion Rate"
          value={`${(reportData?.conversionRate || 0).toFixed(1)}%`}
          icon={Target}
          trend={-2}
          trendLabel="vs last period"
          color="orange"
        />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="trends" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <LineChart className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger 
            value="donors" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <Users className="h-4 w-4" />
            Donor Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="campaigns" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <Target className="h-4 w-4" />
            Campaign Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Monthly Performance
                </CardTitle>
                <CardDescription>Donations and engagement over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {reportData?.monthlyTrend.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="font-medium text-slate-900">{month.month}</span>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                          {month.donations} donations
                        </Badge>
                        <span className="text-sm font-semibold text-slate-700">
                          ${month.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  Quick Stats
                </CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Average Donation</span>
                    <span className="font-semibold text-slate-900">${(reportData?.averageDonation || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Response Rate</span>
                    <span className="font-semibold text-slate-900">78%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Messages per Donor</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round((reportData?.totalDonations || 0) / (reportData?.activeDonors || 1))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="border-2 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Donation Trends
              </CardTitle>
              <CardDescription>Monthly donation patterns and growth</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {reportData?.monthlyTrend.map((month, index) => {
                  const maxAmount = Math.max(...(reportData?.monthlyTrend.map(m => m.amount) || [1]));
                  const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                  
                  return (
                    <div key={index} className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-900">{month.month}</span>
                        <span className="text-slate-600">
                          {month.donations} donations • ${month.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <PieChart className="h-5 w-5 text-orange-600" />
                  Donor Types
                </CardTitle>
                <CardDescription>Breakdown of donor categories</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {reportData?.donorAnalytics.map((donor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="font-medium text-slate-900">{donor.type}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-white border-slate-300">
                          {donor.count}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-700 min-w-12 text-right">
                          {donor.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  Engagement Metrics
                </CardTitle>
                <CardDescription>Donor interaction statistics</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Average Response Time</span>
                    <span className="font-semibold text-slate-900">2.4 hours</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Repeat Donors</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round((reportData?.activeDonors || 0) * 0.6)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Donor Retention Rate</span>
                    <span className="font-semibold text-slate-900">68%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card className="border-2 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="h-5 w-5 text-purple-600" />
                Campaign Performance
              </CardTitle>
              <CardDescription>Effectiveness of different campaigns</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {reportData?.campaignPerformance.map((campaign, index) => (
                  <div key={index} className="border-2 rounded-xl p-5 bg-white hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold text-slate-900">{campaign.campaign}</h4>
                      <Badge 
                        variant={campaign.conversion > 15 ? 'default' : 'secondary'}
                        className={campaign.conversion > 15 ? 'bg-green-100 text-green-700 border-green-200' : ''}
                      >
                        {campaign.conversion}% conversion
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-600 block mb-1">Donations</span>
                        <p className="font-bold text-slate-900">{Math.round(campaign.donations)}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-600 block mb-1">Amount</span>
                        <p className="font-bold text-slate-900">${campaign.amount.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-600 block mb-1">ROI</span>
                        <p className="font-bold text-slate-900">{Math.round(campaign.conversion * 2.5)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}