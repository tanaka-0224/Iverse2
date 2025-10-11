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
    name: '',
    skill: '',
    purpose: '',
    photo: '',
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        skill: profile.skill || '',
        purpose: profile.purpose || '',
        photo: profile.photo || '',
      });
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
      await updateProfile(formData);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
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
        <p className="text-gray-600">プロフィール情報を管理</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {profile?.photo ? (
              <img 
                src={profile.photo} 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-white" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            {profile?.name || 'Anonymous'}
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

            <TextArea
              name="purpose"
              label="目的"
              value={formData.purpose}
              onChange={handleInputChange}
              placeholder="あなたの目的や興味を入力してください"
              rows={4}
            />

            <Input
              name="photo"
              label="プロフィール写真URL"
              value={formData.photo}
              onChange={handleInputChange}
              placeholder="写真のURLを入力（任意）"
            />

            <div className="flex space-x-3">
              <Button
                onClick={handleSave}
                loading={saving}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <Save className="h-4 w-4" />
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
              <Settings className="h-4 w-4" />
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
          <LogOut className="h-4 w-4" />
          <span>ログアウト</span>
        </Button>
      </div>
    </div>
  );
}