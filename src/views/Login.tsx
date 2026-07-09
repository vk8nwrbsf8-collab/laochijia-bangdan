import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Eye, EyeOff, Phone, Mail } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { cn } from '../components/Layout';

// 手机号 → 虚拟邮箱（Firebase 底层认证用）
const phoneToEmail = (phone: string) => `${phone.trim()}@laochijia.local`;

const isPhone = (v: string) => /^1[3-9]\d{9}$/.test(v.trim());
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// 密码：至少6位即可（手机号用户无需复杂密码）
const validatePassword = (v: string) => v.length >= 6;

type Mode = 'login' | 'register';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  // 账号：手机号 or 邮箱
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  // 判断当前输入类型
  const accountIsPhone = isPhone(account);
  const accountIsEmail = isEmail(account);
  const accountType: 'phone' | 'email' | 'unknown' =
    accountIsPhone ? 'phone' : accountIsEmail ? 'email' : 'unknown';

  // 把账号转成 Firebase 用的邮箱
  const toFirebaseEmail = () =>
    accountIsPhone ? phoneToEmail(account) : account.trim();

  const getFirebaseError = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return '账号格式不正确';
      case 'auth/user-not-found':
      case 'auth/invalid-credential': return mode === 'login' ? '账号未注册或密码错误' : '账号或密码错误';
      case 'auth/wrong-password': return '密码错误';
      case 'auth/email-already-in-use': return accountIsPhone ? '该手机号已注册，请直接登录' : '该邮箱已注册，请直接登录';
      case 'auth/weak-password': return '密码至少6位';
      case 'auth/too-many-requests': return '操作过于频繁，请稍后再试';
      case 'auth/operation-not-allowed': return '登录方式未启用，请联系管理员';
      case 'auth/network-request-failed': return '网络连接失败，请检查网络';
      case 'auth/popup-closed-by-user': return '';
      case 'auth/cancelled-popup-request': return '';
      case 'auth/popup-blocked': return '弹窗被拦截，请允许弹窗后重试';
      default: return `操作失败（${code}），请重试`;
    }
  };

  // 验证表单
  const validate = (): string | null => {
    if (!account.trim()) return '请输入手机号或邮箱';
    if (!accountIsPhone && !accountIsEmail) {
      return account.length === 11 ? '请输入正确的手机号（1开头11位）' : '请输入正确的手机号或邮箱';
    }
    if (!password) return '请输入密码';
    if (!validatePassword(password)) return '密码至少6位';
    if (mode === 'register') {
      if (!agreed) return '请先勾选同意用户协议';
      if (password !== confirmPassword) return '两次密码输入不一致';
    }
    return null;
  };

  // Google 登录
  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate('/');
    } catch (err: any) {
      console.error('Google auth error:', err.code, err.message);
      const msg = getFirebaseError(err.code);
      if (msg) setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // 手机号/邮箱 登录或注册
  const handleSubmit = async () => {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    const firebaseEmail = toFirebaseEmail();
    try {
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, firebaseEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, firebaseEmail, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error('Auth error:', err.code, err.message);
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 bg-primary w-full max-w-3xl mx-auto">
      {/* Logo */}
      <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mb-5 shadow-sm border border-accent/20">
        <UtensilsCrossed className="w-10 h-10 text-accent" />
      </div>
      <h1 className="text-2xl font-bold mb-1 text-primary">老吃家榜单</h1>
      <p className="text-secondary mb-8 text-sm">记录你的私人美食图鉴</p>

      <div className="w-full max-w-sm space-y-3">

        {/* ── Google 一键登录 ── */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-primary border border-theme rounded-xl font-medium text-primary shadow-sm active:bg-secondary transition-colors disabled:opacity-60"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-sm">{googleLoading ? '登录中...' : '使用 Google 账号一键登录'}</span>
        </button>

        {/* 分割线 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-theme" />
          <span className="text-xs text-tertiary whitespace-nowrap">或使用手机号 / 邮箱</span>
          <div className="flex-1 border-t border-theme" />
        </div>

        {/* ── 登录/注册 Tab ── */}
        <div className="flex bg-secondary rounded-xl p-1">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
                mode === m ? "bg-primary text-primary shadow-sm" : "text-tertiary"
              )}
            >
              {m === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-danger/10 text-danger rounded-xl text-sm flex items-start gap-2">
            <span className="shrink-0">✗</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── 账号输入框（手机号 or 邮箱）── */}
        <div className="relative">
          {/* 左侧图标提示当前类型 */}
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary">
            {accountType === 'phone' ? (
              <Phone className="w-4 h-4 text-accent" />
            ) : accountType === 'email' ? (
              <Mail className="w-4 h-4 text-accent" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
          </div>
          <input
            type="text"
            inputMode="tel"
            value={account}
            onChange={e => setAccount(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="手机号 或 邮箱地址"
            autoComplete="username"
            maxLength={50}
            className="w-full bg-secondary border border-transparent focus:border-accent rounded-xl pl-10 pr-4 py-3.5 text-primary outline-none transition-colors placeholder:text-tertiary text-sm"
          />
        </div>

        {/* ── 账号类型说明标签 ── */}
        {account.length > 0 && (
          <div className="flex gap-2 -mt-1">
            {accountType === 'phone' && (
              <span className="text-xs text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                已识别为手机号登录
              </span>
            )}
            {accountType === 'email' && (
              <span className="text-xs text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                已识别为邮箱登录
              </span>
            )}
            {accountType === 'unknown' && account.length >= 3 && (
              <span className="text-xs text-tertiary">请输入手机号（11位）或邮箱地址</span>
            )}
          </div>
        )}

        {/* ── 密码输入 ── */}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'register' ? '设置密码（至少6位）' : '密码'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full bg-secondary border border-transparent focus:border-accent rounded-xl px-4 py-3.5 pr-12 text-primary outline-none transition-colors placeholder:text-tertiary text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary p-1 active:opacity-70"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* ── 确认密码（注册时）── */}
        {mode === 'register' && (
          <div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="确认密码"
              autoComplete="new-password"
              className="w-full bg-secondary border border-transparent focus:border-accent rounded-xl px-4 py-3.5 text-primary outline-none transition-colors placeholder:text-tertiary text-sm"
            />
          </div>
        )}

        {/* ── 提交按钮 ── */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-accent text-white rounded-xl font-semibold shadow-md shadow-accent/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100"
        >
          {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
        </button>

        {/* ── 用户协议（注册时）── */}
        {mode === 'register' && (
          <label className="flex items-center justify-center text-xs text-tertiary cursor-pointer select-none gap-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="accent-accent w-4 h-4 rounded-sm shrink-0"
            />
            <span>
              已阅读并同意&nbsp;
              <span className="text-primary font-medium">用户协议</span>
              &nbsp;和&nbsp;
              <span className="text-primary font-medium">隐私政策</span>
            </span>
          </label>
        )}

        {/* ── 底部提示 ── */}
        <p className="text-center text-xs text-tertiary pt-1 leading-relaxed">
          {mode === 'login'
            ? '没有账号？点上方「注册」创建'
            : '注册即代表你的数据由你自己管理'}
        </p>

      </div>
    </div>
  );
}
