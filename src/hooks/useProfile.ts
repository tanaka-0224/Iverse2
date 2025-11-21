import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    if (isDemoUserId(userId)) {
      const stored =
        readDemoProfile(userId) ??
        createDemoProfile(userId, userEmail, userDisplayName);

      const normalized =
        stored.display_name || userDisplayName
          ? {
              ...stored,
              display_name: stored.display_name || userDisplayName || 'Demo User',
            }
          : stored;

      writeDemoProfile(userId, normalized);
      setProfile(normalized);
      setLoading(false);
      return normalized;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserRow>) => {
    if (!userId) {
      console.error('[useProfile] No userId provided for updateProfile');
      return;
    }

    const { password, ...rest } = updates;
    const safeUpdates: Partial<UserRow> = { ...rest };

    if (Object.keys(safeUpdates).length === 0) {
      return profile;
    }

    safeUpdates.updated_at = new Date().toISOString();

    if (isDemoUserId(userId)) {
      const current =
        profile ??
        readDemoProfile(userId) ??
        createDemoProfile(userId, userEmail, userDisplayName);
      const updatedProfile: Profile = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      setProfile(updatedProfile);
      writeDemoProfile(userId, updatedProfile);
      return updatedProfile;
    }

    try {
      const payload = buildUserUpdatePayload(updates, profile, userEmail);
      if (Object.keys(payload).length === 0) {
        return profile;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (error) {
      console.error('[useProfile] Error updating profile:', error);
      throw error;
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refetch: fetchProfile,
  };
}
