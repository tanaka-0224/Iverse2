import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { User, Settings, Shield, LogOut, Save } from 'lucide-react';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(formData);
      setEditing(false);
      setSelectedFile(null);
      setPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (error) {
      console.error('[AccountScreen] Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setSelectedFile(null);
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFormData(savedData);
    setAvatarUrl(profile?.avatar_url || '');
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <User className="h-8 w-8 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">アカウント</h1>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-white" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            {profile?.display_name || 'Anonymous'}
          </h2>
          <p className="text-gray-500">{user?.email}</p>
        </div>

        {editing ? (
          <div className="space-y-4">
            <Input
              name="name"
              label="名前"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="あなたの名前を入力"
            />

            <Input
              name="skill"
              label="スキル"
              value={formData.skill}
              onChange={handleInputChange}
              placeholder="あなたのスキルを入力"
            />

            <Input
              name="skill"
              label="スキル"
              value={formData.skill}
              onChange={handleInputChange}
              placeholder="例: 英語、フロントエンド開発、コミュ力"
            />

            <TextArea
              name="purpose"
              label="目的"
              value={formData.purpose}
              onChange={handleInputChange}
              placeholder="自己紹介を入力してください"
              rows={4}
            />

            <div className="flex space-x-3">
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={uploading}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <FiSave className="h-4 w-4" />
                <span>保存</span>
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
              >
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">自己紹介</h3>
              <p className="text-gray-900">
                {profile?.bio || 'まだ自己紹介が設定されていません'}
              </p>
            </div>

            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="w-full flex items-center justify中心 space-x-2"
            >
              <FiSettings className="h-4 w-4" />
              <span>プロフィールを編集</span>
            </Button>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>設定</span>
        </h3>

        <div className="space-y-3">
          <button className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-3">
            <Shield className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">利用規約</p>
              <p className="text-sm text-gray-500">サービスの利用規約を確認</p>
            </div>
          </button>

          <button className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-3">
            <Shield className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">プライバシーポリシー</p>
              <p className="text-sm text-gray-500">個人情報の取り扱いについて</p>
            </div>
          </button>
        </div>
      </div> */}

      <div className="bg-white rounded-3xl shadow-lg p-6">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center justify-center space-x-2 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
        >
          <FiLogOut className="h-4 w-4" />
          <span>ログアウト</span>
        </Button>
      </div>
    </div>
  );
}
