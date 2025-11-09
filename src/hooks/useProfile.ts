import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const hasWindow = () => typeof window !== 'undefined';
const canUseStorage = () => hasWindow() && typeof window.localStorage !== 'undefined';
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
      window.localStorage.setItem(getDemoProfileKey(userId), JSON.stringify(profile));
    } else {
      window.localStorage.removeItem(getDemoProfileKey(userId));
    }
  } catch (error) {
    console.warn('Failed to persist demo profile', error);
  }
};

const createDemoProfile = (userId: string, email?: string | null): Profile => {
  const now = new Date().toISOString();
  return {
    id: userId,
    email: email || `${userId}@demo.local`,
    display_name: 'Demo User',
    bio: null,
    avatar_url: null,
    skill: null,
    purpose: null,
    created_at: now,
    updated_at: now,
  };
};

const createServerProfile = async (userId: string, email: string) => {
  const now = new Date().toISOString();
  const defaultProfile = {
    id: userId,
    email,
    display_name: null,
    bio: null,
    avatar_url: null,
    skill: null,
    purpose: null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(defaultProfile, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export function useProfile(userId: string | undefined, userEmail?: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
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

    if (isDemoUserId(userId)) {
      const stored = readDemoProfile(userId) ?? createDemoProfile(userId, userEmail);
      writeDemoProfile(userId, stored);
      setProfile(stored);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        if (!userEmail) {
          console.warn('No profile row exists and no email provided to create one.');
          setProfile(null);
        } else {
          const created = await createServerProfile(userId, userEmail);
          setProfile(created);
        }
      } else {
        setProfile(data);
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
      const current = profile ?? readDemoProfile(userId) ?? createDemoProfile(userId, userEmail);
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
      let currentProfile = profile;
      if (!currentProfile) {
        if (!userEmail) {
          console.warn('Cannot create profile without an email address.');
          return;
        }
        currentProfile = await createServerProfile(userId, userEmail);
      }

      const updatedProfile: Profile = {
        ...currentProfile,
        ...updates,
        email: userEmail || currentProfile.email,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(updatedProfile, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
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
