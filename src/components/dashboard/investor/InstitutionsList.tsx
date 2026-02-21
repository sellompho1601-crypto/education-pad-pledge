import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, Building2, Mail, Users, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Institution {
  id: string;
  institution_name: string;
  country: string;
  city: string;
  address: string;
  contact_person: string;
  contact_position: string | null;
}

export const InstitutionsList = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchInstitutions();

    const channel = supabase
      .channel('investor-institutions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => fetchInstitutions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('institution_name');

      if (error) throw error;
      setInstitutions(data || []);
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

  const handleContactInstitution = async (institutionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: investor } = await supabase
        .from('investors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!investor) {
        throw new Error('Investor profile not found. Please complete your investor registration.');
      }

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('investor_id', investor.id)
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (existingConv) {
        window.location.href = `/messages?conversation=${existingConv.id}`;
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          investor_id: investor.id,
          institution_id: institutionId,
        })
        .select()
        .single();

      if (error) throw error;

      window.location.href = `/messages?conversation=${newConv.id}`;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredInstitutions = institutions.filter((inst) =>
    inst.institution_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading institutions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Educational Institutions
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover and connect with verified institutions making a difference in education
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{institutions.length}</p>
                <p className="text-sm text-blue-700">Total Institutions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {new Set(institutions.map(i => i.country)).size}
                </p>
                <p className="text-sm text-green-700">Countries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">
                  {new Set(institutions.map(i => i.contact_person)).size}
                </p>
                <p className="text-sm text-purple-700">Contact Persons</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Section */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
        <CardContent className="p-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search institutions by name, country, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 text-lg border-2 border-slate-300 focus:border-primary transition-colors"
            />
          </div>
        </CardContent>
      </Card>

      {/* Institutions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredInstitutions.map((institution) => (
          <Card 
            key={institution.id} 
            className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/20 cursor-pointer bg-gradient-to-b from-white to-slate-50"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                      {institution.institution_name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">{institution.city}, {institution.country}</span>
                    <Badge variant="secondary" className="ml-2">
                      {institution.country}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-4 border-t">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Users className="h-4 w-4 text-slate-600" />
                  <div>
                    <p className="font-medium text-sm">{institution.contact_person}</p>
                    {institution.contact_position && (
                      <p className="text-xs text-muted-foreground">{institution.contact_position}</p>
                    )}
                  </div>
                </div>
                
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {institution.address}
                  </p>
                </div>
              </div>
              
              <Button
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 group/btn"
                onClick={() => handleContactInstitution(institution.id)}
                size="lg"
              >
                <Mail className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                Start Conversation
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInstitutions.length === 0 && searchQuery && (
        <Card className="text-center py-16 border-dashed">
          <CardContent>
            <Building2 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No institutions found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or browse all institutions
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}

      {filteredInstitutions.length === 0 && !searchQuery && (
        <Card className="text-center py-16 border-dashed">
          <CardContent>
            <Building2 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No institutions available
            </h3>
            <p className="text-muted-foreground">
              Check back later for new institution registrations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};