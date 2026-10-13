import React, { useState, useEffect } from 'react';
import { User, Check, ShieldCheck, AlertCircle, LogIn, LogOut, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CurrentPlayer } from '../../services/firebaseChallengeService';

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayer: CurrentPlayer | null;
  onLoginGoogle: () => Promise<void>;
  onLogoutGoogle: () => Promise<void>;
  localUserName: string;
  localUserAvatar: string;
  onSaveLocalUser: (name: string, avatar: string) => void;
}

const AVATAR_OPTIONS = ['⚡', '🚀', '🦊', '🐼', '🎯', '🌟', '💡', '🦁', '🦉', '🎓'];

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onClose,
  currentPlayer,
  onLoginGoogle,
  onLogoutGoogle,
  localUserName,
  localUserAvatar,
  onSaveLocalUser,
}) => {
  const isGoogleLoggedIn = Boolean(currentPlayer && !currentPlayer.isAnonymous);
  const [userName, setUserName] = useState(localUserName || '一般學習者');
  const [selectedAvatar, setSelectedAvatar] = useState(localUserAvatar || '⚡');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUserName(localUserName || '一般學習者');
      setSelectedAvatar(localUserAvatar || '⚡');
      setErrorMessage(null);
    }
  }, [isOpen, localUserName, localUserAvatar]);

  const handleSaveGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    onSaveLocalUser(userName.trim(), selectedAvatar);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await onLoginGoogle();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google 登入失敗，請重試');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await onLogoutGoogle();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '登出失敗');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          <span>使用者帳號設定</span>
        </div>
      }
      maxWidth="md"
    >
      <div className="flex flex-col gap-5 text-sm" style={{ color: 'var(--text-1)' }}>
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── Case 1: Google Logged In ────────────────────────────── */}
        {isGoogleLoggedIn && currentPlayer ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl border flex items-center justify-between gap-3" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                {currentPlayer.photoURL ? (
                  <img
                    src={currentPlayer.photoURL}
                    alt={currentPlayer.displayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/30"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                    {currentPlayer.displayName.charAt(0) || 'G'}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-base text-slate-900">{currentPlayer.displayName}</span>
                  <span className="text-xs text-slate-500 font-mono">
                    {currentPlayer.email || `ID: ${currentPlayer.uid.slice(0, 8)}...`}
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 shrink-0">
                Google 已連線
              </span>
            </div>

            {/* Feature Perks */}
            <div className="p-3.5 rounded-xl border bg-indigo-50/50 border-indigo-100 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                <Sparkles className="w-4 h-4" />
                <span>已解鎖全站雲端連線特權：</span>
              </div>
              <ul className="space-y-1 text-slate-600 list-disc pl-4">
                <li><strong className="text-slate-800">發起線上競賽：</strong>可在「🏆 競賽榜」挑選單字庫發起比賽邀請好友</li>
                <li><strong className="text-slate-800">雲端排行榜：</strong>挑戰成績將直接以您的 Google 名稱即時登上排位</li>
                <li><strong className="text-slate-800">多裝置管理：</strong>您發起的競賽將自動綁定並同步至任何登入此帳號的裝置</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleGoogleSignOut}
                disabled={isGoogleLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isGoogleLoading ? '登出中...' : '登出 Google 帳號'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                完成
              </button>
            </div>
          </div>
        ) : (
          /* ── Case 2: Not Logged In with Google ─────────────────── */
          <div className="flex flex-col gap-5">
            {/* Google Sign-in Card */}
            <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">使用 Google 帳號登入（推薦）</h4>
                  <p className="text-xs text-slate-600">
                    一鍵快速連線，登入後即可在「🏆 競賽榜」發起競賽、登錄排行榜並保留紀錄。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>{isGoogleLoading ? '正在開啟 Google 登入視窗...' : '點擊以 Google 帳號一鍵登入'}</span>
              </button>
            </div>

            {/* Guest / Local Profile Section */}
            <div className="flex flex-col gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <div className="flex-1 h-px bg-slate-200" />
                <span>或使用自訂訪客暱稱（免登入）</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs text-slate-700 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  免任何登入即可自由背單字、拼寫測驗；您設定的暱稱亦可用於參加他人發起的競賽！
                </span>
              </div>

              <form onSubmit={handleSaveGuest} className="flex flex-col gap-4">
                {/* Select Avatar */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">
                    選擇個人頭像：
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedAvatar(emoji)}
                        className={`w-9 h-9 rounded-xl text-base flex items-center justify-center border transition-all ${
                          selectedAvatar === emoji
                            ? 'border-indigo-500 bg-indigo-100 ring-2 ring-indigo-400/40 scale-105'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nickname Input */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    訪客學習者暱稱：
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="例如：Alex、小明、單字達人"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2 px-3.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>儲存訪客身分</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
