import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Building2, FileText, Shield, BadgeCheck, Clock, AlertCircle } from 'lucide-react';
import { CertificateUpload } from '../CertificateUpload';
import { Badge } from '@/components/ui/badge';

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  investor_type: string;
  company_name: string | null;
  certificate_url: string | null;
  verification_status: string;
}

export const InvestorProfile = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (investorError) throw investorError;

      setProfile({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        investor_type: investorData.investor_type || '',
        company_name: investorData.company_name || null,
        certificate_url: investorData.certificate_url || null,
        verification_status: profileData.verification_status || 'pending',
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: investorError } = await supabase
        .from('investors')
        .update({
          company_name: profile.company_name,
        })
        .eq('user_id', user.id);

      if (investorError) throw investorError;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCertificateUpload = () => {
    fetchProfile(); // Refresh profile after certificate upload
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <BadgeCheck className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <User className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <div>
            <p className="text-lg font-semibold text-muted-foreground">Profile not found</p>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Investor Profile
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage your profile details and verification status
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Personal Information Card */}
        <Card className="lg:col-span-2 border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-6 w-6 text-primary" />
              </div>
              Personal Information
            </CardTitle>
            <CardDescription>Update your profile details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="full_name" className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    required
                    className="border-2 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-slate-100 border-2 text-slate-600"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="border-2 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="investor_type" className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Investor Type
                  </Label>
                  <Input
                    id="investor_type"
                    value={profile.investor_type}
                    disabled
                    className="bg-slate-100 border-2 text-slate-600"
                  />
                </div>
              </div>

              {profile.investor_type === 'corporate' && (
                <div className="space-y-3">
                  <Label htmlFor="company_name" className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company Name
                  </Label>
                  <Input
                    id="company_name"
                    value={profile.company_name || ''}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    className="border-2 focus:border-primary transition-colors"
                    placeholder="Enter your company name"
                  />
                </div>
              )}

              <Button 
                type="submit" 
                disabled={saving}
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300"
                size="lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving Changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Verification Status Card */}
          <Card className="border-2 hover:shadow-lg transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(profile.verification_status)}
                    <span className="font-semibold">Account Status</span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`font-bold text-sm ${getStatusColor(profile.verification_status)}`}
                  >
                    {profile.verification_status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg border-2">
                  <p className="text-sm text-slate-700">
                    {profile.verification_status === 'verified' 
                      ? '🎉 Your account is fully verified and active. You can access all platform features.'
                      : profile.verification_status === 'rejected'
                      ? '❌ Your verification was rejected. Please contact support for assistance.'
                      : '⏳ Your account verification is in progress. This usually takes 1-2 business days.'}
                  </p>
                </div>

                {profile.verification_status === 'pending' && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      <strong>Note:</strong> Uploading required documents will speed up the verification process.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Certificate Upload Card */}
          <CertificateUpload 
            userType="investor"
            currentCertificateUrl={profile.certificate_url}
            onUploadSuccess={handleCertificateUpload} 
          />
        </div>
      </div>
    </div>
  );
};