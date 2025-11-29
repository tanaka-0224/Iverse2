import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  skill: string | null;
  purpose: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const hasWindow = () => typeof window !== 'undefined';
const canUseStorage = () =>
  hasWindow() && typeof window.localStorage !== 'undefined';
const isDemoUserId = (userId?: string) => Boolean(userId?.startsWith('demo-'));
const getDemoProfileKey = (userId: string) => `demo-profile:${userId}`;

const readDemoProfile = (userId: string): Profile | null => {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(getDemoProfileKey(userId));
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch (error) {
    console.warn('Failed to parse stored demo profile', error);
    return null;
  }
};

const writeDemoProfile = (userId: string, profile: Profile | null) => {
  if (!canUseStorage()) return;

  try {
    if (profile) {
      window.localStorage.setItem(
        getDemoProfileKey(userId),
        JSON.stringify(profile),
      );
    } else {
      window.localStorage.removeItem(getDemoProfileKey(userId));
    }
  } catch (error) {
    console.warn('Failed to persist demo profile', error);
  }
};

const createDemoProfile = (
  userId: string,
  email?: string | null,
  displayName?: string | null,
): Profile => {
  const now = new Date().toISOString();
  return {
    id: userId,
    email: email || `${userId}@demo.local`,
    display_name: displayName || 'Demo User',
    avatar_url: null,
    bio: null,
    skill: null,
    purpose: null,
    created_at: now,
    updated_at: now,
  };
};

const mapUserToProfile = (user: UserRow): Profile => ({
  id: user.id,
  email: user.email,
  display_name: user.name,
  avatar_url: user.photo,
  bio: null,
  skill: user.skill,
  purpose: user.purpose,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

const createServerProfile = async (
  userId: string,
  email: string,
  displayName?: string | null,
) => {
  const timestamp = new Date().toISOString();
  const defaultName = displayName || email.split('@')[0] || 'ユーザー';

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        email,
        name: defaultName,
        password: '',
        photo: null,
        purpose: null,
        skill: null,
        created_at: timestamp,
        updated_at: timestamp,
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) throw error;
  return mapUserToProfile(data);
};

const buildUserUpdatePayload = (
  updates: Partial<Profile>,
  currentProfile: Profile | null,
  fallbackEmail?: string | null,
): Partial<UserRow> => {
  const payload: Partial<UserRow> = {};

  if ('display_name' in updates) {
    const resolvedName =
      updates.display_name ??
      currentProfile?.display_name ??
      (fallbackEmail ? fallbackEmail.split('@')[0] : null) ??
      'ユーザー';

    payload.name = resolvedName || 'ユーザー';
  }

  if ('avatar_url' in updates) {
    payload.photo = updates.avatar_url ?? null;
  }

  if ('skill' in updates) {
    payload.skill = updates.skill ?? null;
  }

  if ('purpose' in updates) {
    payload.purpose = updates.purpose ?? null;
  }

  if (Object.keys(payload).length > 0) {
    payload.updated_at = new Date().toISOString();
  }

  return payload;
};

export function useProfile(
  userId: string | undefined,
  userEmail?: string | null,
  userDisplayName?: string | null,
) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [userId, userEmail, userDisplayName]);

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

      if (!data) {
        if (!userEmail) {
          console.warn(
            'No profile row exists and no email provided to create one.',
          );
          setProfile(null);
        } else {
          const created = await createServerProfile(
            userId,
            userEmail,
            userDisplayName,
          );
          setProfile(created);
        }
      } else {
        setProfile(mapUserToProfile(data));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return;

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
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      const normalized = mapUserToProfile(data);
      setProfile(normalized);
      return normalized;
    } catch (error) {
      console.error('Error updating profile:', error);
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
