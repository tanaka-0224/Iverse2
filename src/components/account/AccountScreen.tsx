import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { FiUser, FiSettings, FiLogOut, FiSave } from 'react-icons/fi';
import { supabase } from '../../lib/supabase';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile, refetch } = useProfile(
    user?.id,
    user?.email,
  );
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    skill: '',
    purpose: '',
    photo: '',
  });
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        skill: profile.skill || '',
        purpose: profile.purpose || '',
        photo: profile.photo || '',
      });
      setPreviewUrl(null);
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let photoUrl: string | null = formData.photo ? formData.photo : null;

      if (selectedFile) {
        const uploadedUrl = await uploadAvatar(selectedFile);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        } else {
          // fall back to embedding the image data directly when storage upload fails
          const inlineImage = await fileToDataUrl(selectedFile);
          photoUrl = inlineImage;
        }
      }

      const updates = {
        name: formData.name,
        skill: formData.skill || null,
        purpose: formData.purpose || null,
        photo: photoUrl,
      };

      console.log('[AccountScreen] Saving profile:', updates);
      const result = await updateProfile(updates);
      console.log('[AccountScreen] Update result:', result);
      await refetch();
      setFormData(prev => ({
        ...prev,
        photo: photoUrl ?? '',
      }));
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setSelectedFile(null);
      setEditing(false);
    } catch (error) {
      console.error('[AccountScreen] Error updating profile:', error);
    } finally {
      setSaving(false);
    }
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

  const currentPhoto = previewUrl || formData.photo || profile?.photo || null;

  return (
    <div className="space-y-6">
      {/* Profile Header with Image */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-32 h-32 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden shadow-lg ring-4 ring-white">
              {currentPhoto ? (
                <img 
                  src={currentPhoto} 
                  alt="Avatar" 
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    // 画像の読み込みに失敗した場合のフォールバック
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.classList.add('bg-gradient-to-r', 'from-indigo-500', 'to-purple-600');
                  }}
                />
              ) : (
                <FiUser className="h-16 w-16 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.name || 'Anonymous'}
              </h1>
              <p className="text-gray-500 mt-1">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">

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

            <TextArea
              name="purpose"
              label="目的"
              value={formData.purpose}
              onChange={handleInputChange}
              placeholder="あなたの目的や興味を入力してください"
              rows={4}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">プロフィール写真をアップロード</label>
              <div className="flex items-center space-x-3">
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {uploading && <span className="text-sm text-gray-500">アップロード中...</span>}
              </div>
              {previewUrl && (
                <div className="mt-2 w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500">
                  <img src={previewUrl} alt="プレビュー" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleSave}
                loading={saving}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <FiSave className="h-4 w-4" />
                <span>保存</span>
              </Button>
              <Button
                onClick={() => setEditing(false)}
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
              <h3 className="text-sm font-medium text-gray-700 mb-1">スキル</h3>
              <p className="text-gray-900">
                {profile?.skill || 'まだスキルが設定されていません'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">目的</h3>
              <p className="text-gray-900">
                {profile?.purpose || 'まだ目的が設定されていません'}
              </p>
            </div>

            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
            >
              <FiSettings className="h-4 w-4" />
              <span>プロフィールを編集</span>
            </Button>
          </div>
        )}
      </div>

      {/* Settings Section */}
      {/* <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
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

      {/* Logout Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
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
