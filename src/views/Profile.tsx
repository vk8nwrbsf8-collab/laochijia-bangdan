import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Camera, Sun, Moon } from 'lucide-react';
import { cn } from '../components/Layout';

type EditField = 'nickname' | 'banner_title' | 'dish_banner_title' | 'banner_slogan' | null;

const FIELD_LABELS: Record<string, string> = {
  nickname: '昵称',
  banner_title: '商户榜名称',
  dish_banner_title: '餐品榜名称',
  banner_slogan: '榜单 Slogan',
};

const FIELD_MAX: Record<string, number> = {
  nickname: 20,
  banner_title: 15,
  dish_banner_title: 15,
  banner_slogan: 50,
};

export default function Profile() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();

  const [editing, setEditing] = useState<EditField>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('确定退出登录吗？')) {
      await auth.signOut();
      navigate('/login');
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let { width, height } = img;
        // Crop to square first
        const minDim = Math.min(width, height);
        const offX = (width - minDim) / 2;
        const offY = (height - minDim) / 2;
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, offX, offY, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        try {
          await updateDoc(doc(db, 'users', user.uid), { avatar_url: dataUrl });
          await refreshProfile();
        } catch (err) {
          console.error(err);
          alert('头像更新失败，请重试');
        }
      };
    };
  };

  const handleToggleTheme = async () => {
    if (!user || !profile) return;
    const newTheme = profile.theme_mode === 'dark' ? 'light' : 'dark';
    try {
      await updateDoc(doc(db, 'users', user.uid), { theme_mode: newTheme });
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      await refreshProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (field: EditField) => {
    if (!field) return;
    setEditing(field);
    setEditValue((profile as any)?.[field] || '');
  };

  const saveEdit = async () => {
    if (!user || !editing) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { [editing]: editValue });
      await refreshProfile();
      setEditing(null);
    } catch (e) {
      console.error(e);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // Edit overlay
  if (editing) {
    return (
      <div className="flex flex-col h-screen bg-secondary">
        <div className="flex items-center justify-between px-4 py-3 bg-primary border-b border-theme">
          <button onClick={() => setEditing(null)} className="text-secondary px-2 -ml-2 text-[15px]">
            取消
          </button>
          <span className="font-semibold text-primary text-[16px]">编辑{FIELD_LABELS[editing]}</span>
          <button
            onClick={saveEdit}
            disabled={saving}
            className="text-accent font-semibold px-2 -mr-2 text-[15px] disabled:opacity-50"
          >
            {saving ? '保存中' : '保存'}
          </button>
        </div>
        <div className="p-4 mt-2">
          <textarea
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            maxLength={FIELD_MAX[editing]}
            rows={editing === 'banner_slogan' ? 3 : 1}
            className="w-full bg-primary rounded-xl px-4 py-3 outline-none text-[15px] text-primary border border-theme focus:border-accent resize-none transition-colors"
          />
          <div className="text-right text-xs text-tertiary mt-1">
            {editValue.length}/{FIELD_MAX[editing]}
          </div>
          {editing === 'banner_slogan' && (
            <p className="text-xs text-tertiary mt-2">
              提示：可使用 {'{nickname}'} 引用你的昵称，例如：童叟无欺，依托{'{nickname}'}真实品鉴
            </p>
          )}
        </div>
      </div>
    );
  }

  const isDark = profile?.theme_mode === 'dark';

  const renderSlogan = (slogan?: string) => {
    if (!slogan) return '未设置';
    return slogan.replace('{nickname}', profile?.nickname || '美食家');
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-primary border-b border-theme sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary active:opacity-60 transition-opacity">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-semibold text-primary text-[16px] absolute left-1/2 -translate-x-1/2">
          编辑资料
        </span>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center pt-8 pb-6 bg-primary border-b border-theme mb-3">
        <label className="relative cursor-pointer block">
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary border-2 border-theme shadow-sm">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <Camera className="w-8 h-8 text-tertiary" />
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-7 h-7 bg-accent rounded-full border-2 border-primary flex items-center justify-center shadow-sm">
            <Camera className="w-3.5 h-3.5 text-white" />
          </div>
        </label>
        <p className="text-xs text-tertiary mt-3">点击更换头像</p>
      </div>

      {/* Settings List */}
      <div className="px-4 space-y-3">
        {/* Profile info */}
        <div className="bg-primary rounded-2xl overflow-hidden divide-y divide-theme shadow-card border border-theme">
          {/* Nickname */}
          <button
            onClick={() => startEdit('nickname')}
            className="flex items-center justify-between w-full p-4 active:bg-secondary transition-colors"
          >
            <span className="text-[15px] text-primary">昵称</span>
            <div className="flex items-center text-tertiary gap-1">
              <span className="truncate max-w-[160px] text-[14px]">{profile?.nickname || '未设置'}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </div>
          </button>

          {/* Shop banner title */}
          <button
            onClick={() => startEdit('banner_title')}
            className="flex items-center justify-between w-full p-4 active:bg-secondary transition-colors"
          >
            <span className="text-[15px] text-primary">商户榜名称</span>
            <div className="flex items-center text-tertiary gap-1">
              <span className="truncate max-w-[160px] text-[14px]">{profile?.banner_title || '未设置'}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </div>
          </button>

          {/* Dish banner title */}
          <button
            onClick={() => startEdit('dish_banner_title')}
            className="flex items-center justify-between w-full p-4 active:bg-secondary transition-colors"
          >
            <span className="text-[15px] text-primary">餐品榜名称</span>
            <div className="flex items-center text-tertiary gap-1">
              <span className="truncate max-w-[160px] text-[14px]">{profile?.dish_banner_title || '未设置'}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </div>
          </button>

          {/* Banner slogan */}
          <button
            onClick={() => startEdit('banner_slogan')}
            className="flex items-center justify-between w-full p-4 active:bg-secondary transition-colors"
          >
            <span className="text-[15px] text-primary shrink-0 mr-3">榜单 Slogan</span>
            <div className="flex items-center text-tertiary gap-1 min-w-0">
              <span className="truncate text-[13px] text-right">{renderSlogan((profile as any)?.banner_slogan)}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </div>
          </button>
        </div>

        {/* Theme */}
        <div className="bg-primary rounded-2xl overflow-hidden shadow-card border border-theme">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              {isDark ? <Moon className="w-4 h-4 text-accent" /> : <Sun className="w-4 h-4 text-accent" />}
              <span className="text-[15px] text-primary">深色模式</span>
            </div>
            <button
              onClick={handleToggleTheme}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5",
                isDark ? "bg-accent" : "bg-gray-200"
              )}
            >
              <div className={cn(
                "w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                isDark ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

        {/* Account info */}
        {user?.email && (
          <div className="bg-primary rounded-2xl overflow-hidden shadow-card border border-theme">
            <div className="flex items-center justify-between p-4">
              <span className="text-[15px] text-primary">账号</span>
              <span className="text-[14px] text-tertiary">{user.email}</span>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="bg-primary rounded-2xl overflow-hidden shadow-card border border-theme">
          <button
            onClick={handleLogout}
            className="w-full py-4 flex items-center justify-center text-[15px] text-danger font-medium active:bg-secondary transition-colors"
          >
            退出登录
          </button>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
