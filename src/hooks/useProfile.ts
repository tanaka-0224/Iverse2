import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];

const buildInsertPayload = (
  userId: string,
  email?: string | null,
  overrides?: Partial<UserRow>,
): UserInsert => {
  const fallbackEmail = email || `${userId}@local.dev`;
  const timestamp = new Date().toISOString();
  return {
    id: userId,
    email: overrides?.email ?? fallbackEmail,
    name:
      overrides?.name ??
      fallbackEmail.split('@')[0] ??
      'ユーザー',
    password: '',
    photo: overrides?.photo ?? null,
    purpose: overrides?.purpose ?? null,
    skill: overrides?.skill ?? null,
    created_at: overrides?.created_at ?? timestamp,
    updated_at: overrides?.updated_at ?? timestamp,
  };
};

const createServerProfile = async (
  userId: string,
  email?: string | null,
  overrides?: Partial<UserRow>,
) => {
  const payload = buildInsertPayload(userId, email, overrides);
  const { data, error } = await supabase
    .from('users')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export function useProfile(userId: string | undefined, userEmail?: string | null) {
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [userId, userEmail]);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const created = await createServerProfile(userId, userEmail);
        setProfile(created);
        return created;
      }

      setProfile(data);
      return data;
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

    try {
      const { data, error } = await supabase
        .from('users')
        .update(safeUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const created = await createServerProfile(userId, userEmail, safeUpdates);
          setProfile(created);
          return created;
        }
        throw error;
      }

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
