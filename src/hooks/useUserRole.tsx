import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'institution' | 'investor' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        // First check if user has admin role in user_roles table
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (adminRole) {
          setRole('admin');
          setUserType('admin');
          setLoading(false);
          return;
        }

        // Get user profile to determine type
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setUserType(profile.user_type);
          // Check if user_type is admin (for backward compatibility)
          if (profile.user_type === 'admin') {
            setRole('admin');
          } else {
            setRole(profile.user_type as UserRole);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return { role, userType, loading };
};
