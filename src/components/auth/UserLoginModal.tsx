import React, { useState } from 'react';
import { User, Cloud, Check, ShieldCheck, Sparkles, AlertCircle, LogIn, ExternalLink } from 'lucide-react';
import { Modal } from '../common/Modal';
import { AuthState } from '../../types/auth';

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  authState: AuthState;
  googleClientId: string;
  onLoginLocal: (name: string, avatar: string) => void;
  onLoginGoogle: (clientId: string) => Promise<void>;
  onOpenSettings: () => void;
}

const AVATAR_OPTIONS = ['⚡', '🚀', '🦊', '🐼', '🎯', '🌟', '💡', '🦁', '🦉', '🎓'];

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onClose,
  authState,
  googleClientId,
  onLoginLocal,
  onLoginGoogle,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'google'>(
    googleClientId && authState.authType === 'google' ? 'google' : 'local'
  );
  const [userName, setUserName] = useState(authState.user?.name || '一般學習者');
  const [selectedAvatar, setSelectedAvatar] = useState(authState.user?.avatar || '⚡');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualClientId, setManualClientId] = useState(googleClientId || '');

  const handleSaveLocalUser = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginLocal(userName, selectedAvatar);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    const targetClientId = googleClientId || manualClientId.trim();
    if (!targetClientId) {
      setErrorMessage('請先填入 App 的 Google Client ID');
      return;
    }
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await onLoginGoogle(targetClientId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google 登入失敗，請確認 Client ID 與授權來源設定是否正確');
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
          <User className="w-5 h-5 text-indigo-400" />
          <span>使用者登入與帳號設定</span>
        </div>
      }
      maxWidth="md"
    >
      <div className="flex flex-col gap-5">
        {/* Switch Tab */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'local'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>一般使用者 (免設定)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'google'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Google 帳號登入</span>
          </button>
        </div>

        {/* Tab 1: Local User */}
        {activeTab === 'local' && (
          <form onSubmit={handleSaveLocalUser} className="flex flex-col gap-4">
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-300">免任何設定、即開即用：</span>
                <p className="mt-0.5 text-slate-300 text-[11px] leading-relaxed">
                  所有單字進度與反應時間均自動保存在您的瀏覽器中，支援完全離線使用、PWA 桌面安裝與 JSON/CSV 資料備份匯出！
                </p>
              </div>
            </div>

            {/* Select Avatar */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">
                選擇個人頭像：
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all ${
                      selectedAvatar === emoji
                        ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/30 scale-105'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Enter Nickname */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                學習者暱稱 (Nickname)：
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="例如：Alex、小明、單字達人"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                取消
              </button>
              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40"
              >
                <Check className="w-4 h-4" />
                <span>儲存並開始學習</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Google Drive OAuth */}
        {activeTab === 'google' && (
          <div className="flex flex-col gap-4">
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-300 flex flex-col gap-1.5">
              <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Google 雲端同步原理：</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                使用者只要登入自己的 Google 帳號，進度即會自動同步至您個人的 Google Drive 隱藏資料夾（<code>appDataFolder</code>），不需額外伺服器。
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {authState.authType === 'google' && authState.user ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {authState.user.avatar.startsWith('http') ? (
                    <img src={authState.user.avatar} alt="avatar" className="w-10 h-10 rounded-full" />
                  ) : (
                    <span className="text-2xl">{authState.user.avatar}</span>
                  )}
                  <div>
                    <div className="text-sm font-bold text-slate-100">{authState.user.name}</div>
                    <div className="text-xs text-slate-400">{authState.user.email || '已連結 Google 雲端'}</div>
                  </div>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  已同步
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* If Client ID is pre-configured in .env or settings */}
                {googleClientId ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 transition-all active:scale-[0.98]"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isGoogleLoading ? '正在開啟 Google 登入視窗...' : '點擊以 Google 帳號登入'}</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        網站 Google Client ID：
                      </label>
                      <input
                        type="text"
                        value={manualClientId}
                        onChange={(e) => setManualClientId(e.target.value)}
                        placeholder="例如：xxxx.apps.googleusercontent.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading || !manualClientId.trim()}
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-950/40"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{isGoogleLoading ? '登入中...' : '使用此 Client ID 進行 Google 登入'}</span>
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenSettings();
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline flex items-center justify-center gap-1 mx-auto"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>查看如何取得網站的 Google Client ID</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
