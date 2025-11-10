import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { User as UserIcon, Settings, Shield, LogOut, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

type ProfileFields = {
  display_name: string;
  skill: string;
  purpose: string;
};

const emptyProfileFields: ProfileFields = {
  display_name: '',
  skill: '',
  purpose: '',
};

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(
    user?.id,
    user?.email,
    user?.user_metadata?.name || user?.email?.split('@')[0] || null,
  );
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFields>(emptyProfileFields);
  const [savedData, setSavedData] = useState<ProfileFields>(emptyProfileFields);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const isDemoUser = Boolean(user?.id?.startsWith('demo-'));

  React.useEffect(() => {
    const nextData: ProfileFields = {
      display_name: profile?.display_name || '',
      skill: profile?.skill || '',
      purpose: profile?.purpose || '',
    };
    setFormData(nextData);
    setSavedData(nextData);
    setAvatarUrl(profile?.avatar_url || '');
    setSelectedFile(null);
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

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
      let nextAvatarUrl =
        avatarUrl && avatarUrl.trim().length > 0
          ? avatarUrl.trim()
          : profile?.avatar_url || null;

      if (selectedFile) {
        if (isDemoUser) {
          const dataUrl = await fileToDataUrl(selectedFile);
          nextAvatarUrl = dataUrl;
          setAvatarUrl(dataUrl);
        } else {
          const uploadedUrl = await uploadAvatar(selectedFile);
          if (uploadedUrl) {
            nextAvatarUrl = uploadedUrl;
            setAvatarUrl(uploadedUrl);
          } else {
            const dataUrl = await fileToDataUrl(selectedFile);
            nextAvatarUrl = dataUrl;
            setAvatarUrl(dataUrl);
          }
        }
      }

      const updatedProfile = await updateProfile({
        display_name: formData.display_name || null,
        skill: formData.skill || null,
        purpose: formData.purpose || null,
        avatar_url: nextAvatarUrl,
      });

      const latestSaved: ProfileFields = {
        display_name: updatedProfile?.display_name ?? formData.display_name,
        skill: updatedProfile?.skill ?? formData.skill,
        purpose: updatedProfile?.purpose ?? formData.purpose,
      };

      setSavedData(latestSaved);
      setFormData(latestSaved);
      setAvatarUrl(nextAvatarUrl ?? '');
      setEditing(false);
      setSelectedFile(null);
      setPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (error) {
      console.error('Error updating profile:', error);
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

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const avatarPreview = previewUrl || avatarUrl || null;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <UserIcon className="h-8 w-8 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">アカウント</h1>
        </div>
        <p className="text-gray-600">プロフィール情報を管理</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-12 w-12 text-white" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            {(editing ? formData.display_name : savedData.display_name) || 'Anonymous'}
          </h2>
          {/* メールアドレスは非表示にする */}
          <p className="text-gray-500 sr-only">{user?.email}</p>
        </div>

        {editing ? (
          <div className="space-y-4">
            <Input
              name="display_name"
              label="表示名"
              value={formData.display_name}
              onChange={handleInputChange}
              placeholder="あなたの表示名を入力"
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
              placeholder="例: 英検二級を取得したい、React仲間を探している など"
              rows={3}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                画像ファイルからアップロード
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-indigo-600 hover:file:bg-indigo-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedFile ? `選択済み: ${selectedFile.name}` : '選択されていません'}
                  </p>
                </div>
              </div>
              {previewUrl && (
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-500">
                    <img
                      src={previewUrl}
                      alt="プレビュー"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    保存するとこの画像がプロフィールに表示されます
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={uploading}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <Save className="h-4 w-4" />
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
            <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
              <h3 className="text-xs font-bold tracking-wide text-gray-500 uppercase">スキル</h3>
              <p className="text-gray-900 text-base">
                {savedData.skill || 'まだスキルが設定されていません'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
              <h3 className="text-xs font-bold tracking-wide text-gray-500 uppercase">目的</h3>
              <p className="text-gray-900 text-base whitespace-pre-line">
                {savedData.purpose || 'まだ目的が設定されていません'}
              </p>
            </div>

            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="w-full flex items-center justify中心 space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>プロフィールを編集</span>
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-6 space-y-4">
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
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-6">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center justify-center space-x-2 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
        >
          <LogOut className="h-4 w-4" />
          <span>ログアウト</span>
        </Button>
      </div>
    </div>
  );
}
