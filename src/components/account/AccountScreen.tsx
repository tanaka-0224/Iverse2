import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { User as UserIcon, LogOut, Save, Edit3 } from 'lucide-react';

type FormState = {
  display_name: string;
  bio: string;
};

const initialFormState: FormState = { display_name: '', bio: '' };

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(
    user?.id,
    user?.email,
    user?.user_metadata?.name,
  );

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
      });
    } else {
      setFormData(initialFormState);
    }
  }, [profile]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!profile) return;

    const trimmedName = formData.display_name.trim();
    if (!trimmedName) {
      setError('名前を入力してください。');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateProfile({
        display_name: trimmedName,
        bio: formData.bio.trim(),
      });
      setEditing(false);
    } catch (err) {
      console.error('[AccountScreen] Error updating profile:', err);
      setError('プロフィールの更新に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
      });
    } else {
      setFormData(initialFormState);
    }
    setEditing(false);
    setError('');
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
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
      <div className="bg-white rounded-3xl shadow-lg p-6 space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-semibold">
            {profile?.display_name?.charAt(0)?.toUpperCase() || <UserIcon className="h-10 w-10" />}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {profile?.display_name || user?.email || 'ゲストユーザー'}
            </h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <Input
              name="display_name"
              label="名前"
              value={formData.display_name}
              onChange={handleInputChange}
              placeholder="あなたの名前を入力してください"
            />

            <TextArea
              name="bio"
              label="自己紹介"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="得意なスキルや興味のある分野を記入してください"
              rows={4}
            />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleSave}
                loading={saving}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>保存する</span>
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">自己紹介</h3>
              <p className="text-gray-900 whitespace-pre-line">
                {profile?.bio || 'まだ自己紹介が設定されていません。'}
              </p>
            </div>

            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
            >
              <Edit3 className="h-4 w-4" />
              <span>プロフィールを編集</span>
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">アカウント</h3>
        <p className="text-sm text-gray-500">メールアドレスやログイン情報の管理を行います。</p>
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
