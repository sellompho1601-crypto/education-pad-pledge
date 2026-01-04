import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'institution' | 'investor' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async (userId: string | null) => {
      if (!userId) {
        setRole(null);
        setUserType(null);
        setLoading(false);
        return;
      }

      try {
        // First check if user has admin role in user_roles table
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
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
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          setUserType(profile.user_type);
          if (profile.user_type === 'admin') {
            setRole('admin');
          } else {
            setRole(profile.user_type as UserRole);
          }
        } else {
          setRole(null);
          setUserType(null);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        setUserType(null);
        setLoading(false);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setRole(null);
          setUserType(null);
          setLoading(false);
        } else if (session?.user) {
          // Defer the fetch to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setUserType(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { role, userType, loading };
};
