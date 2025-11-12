import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, BarChart3, MessageSquare, Users, Clock, TrendingUp, Target, Sparkles, ChartNoAxesCombined } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface Conversation {
  id: string;
  investor_id: string | null;
  institution_id: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  created_at: string;
  read: boolean;
}

function StatCard({ title, value, icon: Icon, color = 'blue' }: { title: string; value: number | string; icon: any; color?: string }) {
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
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InstitutionAnalytics() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data: institution } = await supabase
          .from('institutions')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!institution?.id) {
          setLoading(false);
          return;
        }
        setInstitutionId(institution.id);

        const { data: convs } = await supabase
          .from('conversations')
          .select('id, investor_id, institution_id, created_at')
          .eq('institution_id', institution.id);

        const { data: msgs } = await supabase
          .from('messages')
          .select('id, conversation_id, created_at, read')
          .in('conversation_id', (convs ?? []).map(c => c.id));

        setConversations(convs ?? []);
        setMessages(msgs ?? []);
      } catch (e) {
        console.error('Analytics load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const metrics = useMemo(() => {
    const totalConversations = conversations.length;
    const activeInvestors = new Set(conversations.map(c => c.investor_id).filter(Boolean)).size;
    const totalMessages = messages.length;
    const unreadMessages = messages.filter(m => !m.read).length;
    const avgMessagesPerConversation = totalConversations ? (totalMessages / totalConversations) : 0;

    // Simple monthly trend from last 6 months based on conversations
    const now = new Date();
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = 0;
    }
    conversations.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in buckets) buckets[key] += 1;
    });

    const trend = Object.entries(buckets).map(([month, count]) => ({ month, count }));

    // Donor activity per month (unique investor_ids per month)
    const donorBuckets: Record<string, Set<string>> = {};
    Object.keys(buckets).forEach(k => (donorBuckets[k] = new Set()));
    conversations.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in donorBuckets && c.investor_id) donorBuckets[key].add(c.investor_id);
    });
    const donorTrend = Object.entries(donorBuckets).map(([month, set]) => ({ month, count: set.size }));

    // Messages per month
    const msgBuckets: Record<string, number> = {};
    Object.keys(buckets).forEach(k => (msgBuckets[k] = 0));
    messages.forEach(m => {
      const d = new Date(m.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in msgBuckets) msgBuckets[key] += 1;
    });
    const messagesPerMonth = Object.entries(msgBuckets).map(([month, count]) => ({ month, count }));

    // Engagement score: blend of activity metrics (bounded 0..100)
    const engagementScore = Math.min(100, Math.round(
      (activeInvestors * 5) + (avgMessagesPerConversation * 10) + (totalConversations * 2) - (unreadMessages)
    ));

    return {
      totalConversations,
      activeInvestors,
      totalMessages,
      unreadMessages,
      avgMessagesPerConversation: Number(avgMessagesPerConversation.toFixed(1)),
      engagementScore: Math.max(0, engagementScore),
      trend,
      donorTrend,
      messagesPerMonth,
    };
  }, [conversations, messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (!institutionId) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-16 text-center">
          <ChartNoAxesCombined className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <div>
            <p className="text-lg font-semibold text-muted-foreground mb-2">No Institution Found</p>
            <p className="text-muted-foreground">Complete your profile to view analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Institution Analytics
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Track your engagement metrics and donor activity insights
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Conversations" value={metrics.totalConversations} icon={Activity} color="blue" />
        <StatCard title="Active Donors" value={metrics.activeInvestors} icon={Users} color="green" />
        <StatCard title="Total Messages" value={metrics.totalMessages} icon={MessageSquare} color="purple" />
        <StatCard title="Unread Messages" value={metrics.unreadMessages} icon={Clock} color="orange" />
      </div>

      {/* Activity Overview */}
      <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            Engagement Overview
          </CardTitle>
          <CardDescription>Key performance indicators and engagement metrics</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="border-2 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-700">Avg. messages per conversation</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                  {metrics.avgMessagesPerConversation}
                </Badge>
              </div>
              <div className="h-3 bg-slate-200 rounded-full">
                <div
                  className="h-3 bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.avgMessagesPerConversation * 15)}%` }}
                />
              </div>
            </div>

            <div className="border-2 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-700">Engagement score</span>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  {metrics.engagementScore}
                </Badge>
              </div>
              <div className="h-3 bg-slate-200 rounded-full">
                <div
                  className="h-3 bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.engagementScore}%` }}
                />
              </div>
            </div>

            <div className="border-2 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-700">Unread ratio</span>
                <Badge variant="outline" className="border-orange-200 text-orange-700">
                  {metrics.totalMessages ? Math.round((metrics.unreadMessages / metrics.totalMessages) * 100) : 0}%
                </Badge>
              </div>
              <div className="h-3 bg-slate-200 rounded-full">
                <div
                  className="h-3 bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.totalMessages ? Math.round((metrics.unreadMessages / metrics.totalMessages) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Tabs defaultValue="trend" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger 
            value="trend" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <BarChart3 className="h-4 w-4" /> 
            Monthly Trend
          </TabsTrigger>
          <TabsTrigger 
            value="donors" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <Users className="h-4 w-4" /> 
            Donor Activity
          </TabsTrigger>
          <TabsTrigger 
            value="messages" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <MessageSquare className="h-4 w-4" /> 
            Messaging
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card className="border-2 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                Conversations Trend
              </CardTitle>
              <CardDescription>Last 6 months of conversation activity</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.trend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(m) => m.slice(5)} 
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="url(#colorCount)" 
                      strokeWidth={3} 
                      dot={{ fill: '#4f46e5', r: 5, strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: '#4f46e5' }}
                    />
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors">
          <Card className="border-2 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                Donor Activity
              </CardTitle>
              <CardDescription>Unique active donors per month</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.donorTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(m) => m.slice(5)} 
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="url(#colorDonors)" 
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="colorDonors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  Currently engaging with <span className="font-bold">{metrics.activeInvestors}</span> unique donors across{' '}
                  <span className="font-bold">{metrics.totalConversations}</span> conversations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card className="border-2 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                Messaging Insights
              </CardTitle>
              <CardDescription>Message volumes and engagement distribution</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.messagesPerMonth} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(m) => m.slice(5)} 
                        tick={{ fill: '#64748b' }}
                      />
                      <YAxis allowDecimals={false} tick={{ fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="url(#colorMessages)" 
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Unread', value: metrics.unreadMessages },
                          { name: 'Read', value: Math.max(0, metrics.totalMessages - metrics.unreadMessages) },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        <Cell fill="#ef4444" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Legend />
                      <Tooltip 
                        formatter={(value, name) => [`${value} messages`, name]}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}