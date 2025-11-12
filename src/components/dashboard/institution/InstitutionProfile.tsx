import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Building2, User, MapPin, Globe, Save, Sparkles } from 'lucide-react';

interface InstitutionRow {
  id: string;
  user_id: string;
  institution_name: string | null;
  contact_person: string | null;
  city: string | null;
  country: string | null;
  certificate_url?: string | null;
}

export default function InstitutionProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [form, setForm] = useState({
    institution_name: '',
    contact_person: '',
    city: '',
    country: '',
    description: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase
          .from('institutions')
          .select('id, user_id, institution_name, contact_person, city, country, certificate_url')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setInstitution(data as InstitutionRow);
          setForm({
            institution_name: data.institution_name ?? '',
            contact_person: data.contact_person ?? '',
            city: data.city ?? '',
            country: data.country ?? '',
            description: '',
          });
        }
      } catch (e) {
        console.error('Profile load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const handleSave = async () => {
    if (!institution) return;
    try {
      setSaving(true);
      const payload = {
        institution_name: form.institution_name || null,
        contact_person: form.contact_person || null,
        city: form.city || null,
        country: form.country || null,
      };
      const { error } = await supabase
        .from('institutions')
        .update(payload)
        .eq('id', institution.id);
      if (error) throw error;
      toast({ 
        title: 'Profile Updated Successfully', 
        description: 'Your institution details have been saved and updated.' 
      });
    } catch (e: any) {
      console.error('Save error:', e);
      toast({ 
        title: 'Failed to Save', 
        description: e.message || 'Please check your information and try again.', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-16 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <div>
            <p className="text-lg font-semibold text-muted-foreground mb-2">No Institution Found</p>
            <p className="text-muted-foreground">
              Complete your registration to edit your institution profile
            </p>
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
          Institution Profile
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage your institution's public information and profile details
        </p>
      </div>

      <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            Edit Institution Profile
          </CardTitle>
          <CardDescription className="text-lg">
            Update your institution's public information that donors will see
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          {/* Form Grid */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Institution Name */}
            <div className="space-y-3">
              <Label htmlFor="institution_name" className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Institution Name
              </Label>
              <Input 
                id="institution_name" 
                value={form.institution_name} 
                onChange={updateField('institution_name')} 
                placeholder="e.g., Bright Future Academy"
                className="border-2 focus:border-blue-500 transition-colors h-12 text-lg"
              />
            </div>

            {/* Contact Person */}
            <div className="space-y-3">
              <Label htmlFor="contact_person" className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Person
              </Label>
              <Input 
                id="contact_person" 
                value={form.contact_person} 
                onChange={updateField('contact_person')} 
                placeholder="e.g., Jane Doe"
                className="border-2 focus:border-blue-500 transition-colors h-12 text-lg"
              />
            </div>

            {/* City */}
            <div className="space-y-3">
              <Label htmlFor="city" className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                City
              </Label>
              <Input 
                id="city" 
                value={form.city} 
                onChange={updateField('city')} 
                placeholder="e.g., Nairobi"
                className="border-2 focus:border-blue-500 transition-colors h-12 text-lg"
              />
            </div>

            {/* Country */}
            <div className="space-y-3">
              <Label htmlFor="country" className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Country
              </Label>
              <Input 
                id="country" 
                value={form.country} 
                onChange={updateField('country')} 
                placeholder="e.g., Kenya"
                className="border-2 focus:border-blue-500 transition-colors h-12 text-lg"
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">Profile Information</p>
                <p className="text-sm text-blue-800/80">
                  This information helps donors learn about your institution and make informed decisions about supporting your cause.
                  Keep your details up to date to maintain trust with potential supporters.
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all duration-300 group"
              size="lg"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Profile Summary */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-slate-600" />
            Current Profile Summary
          </CardTitle>
          <CardDescription>
            This is how your institution appears to potential donors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2">
                <span className="text-sm font-medium text-slate-700">Institution Name</span>
                <span className="font-semibold text-slate-900">{form.institution_name || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2">
                <span className="text-sm font-medium text-slate-700">Contact Person</span>
                <span className="font-semibold text-slate-900">{form.contact_person || 'Not set'}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2">
                <span className="text-sm font-medium text-slate-700">Location</span>
                <span className="font-semibold text-slate-900">
                  {form.city && form.country ? `${form.city}, ${form.country}` : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2">
                <span className="text-sm font-medium text-slate-700">Profile Status</span>
                <span className="font-semibold text-green-600">Active</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}