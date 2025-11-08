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

const createDemoProfile = (userId: string): Profile => {
  const now = new Date().toISOString();
  return {
    id: userId,
    email: `${userId}@demo.local`,
    display_name: 'Demo User',
    bio: null,
    avatar_url: null,
    skill: null,
    purpose: null,
    created_at: now,
    updated_at: now,
  };
};

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
      const stored = readDemoProfile(userId) ?? createDemoProfile(userId);
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
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return;

    if (isDemoUserId(userId)) {
      const current = profile ?? readDemoProfile(userId) ?? createDemoProfile(userId);
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
