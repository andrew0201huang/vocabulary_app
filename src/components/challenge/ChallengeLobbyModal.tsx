import React, { useState, useEffect } from 'react';
import { Trophy, Play, User, LogIn, Calendar, Check, Copy } from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  ChallengeDoc,
  LeaderboardEntry,
  CurrentPlayer,
  subscribeLeaderboard,
  loginAnonymouslyWithNickname,
  loginWithGoogle,
} from '../../services/firebaseChallengeService';
import { formatSeconds } from '../../utils/timeUtils';

interface ChallengeLobbyModalProps {
  challenge: ChallengeDoc | null;
  isOpen: boolean;
  onClose: () => void;
  currentPlayer: CurrentPlayer | null;
  onStartChallenge: (challenge: ChallengeDoc) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const ChallengeLobbyModal: React.FC<ChallengeLobbyModalProps> = ({
  challenge,
  isOpen,
  onClose,
  currentPlayer,
  onStartChallenge,
  onToast,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [nicknameInput, setNicknameInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (challenge && isOpen) {
      const unsub = subscribeLeaderboard(challenge.id, (entries) => {
        setLeaderboard(entries);
      });
      return () => unsub();
    }
  }, [challenge, isOpen]);

  if (!challenge || !isOpen) return null;

  const now = new Date().getTime();
  const isExpired = challenge.endsAt ? now > new Date(challenge.endsAt).getTime() : false;

  const handleLoginNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    try {
      setIsLoggingIn(true);
      await loginAnonymouslyWithNickname(nicknameInput.trim());
      onToast('success', '暱稱已設定', `歡迎參賽，${nicknameInput.trim()}！`);
    } catch (err: any) {
      onToast('error', '設定暱稱失敗', err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsLoggingIn(true);
      const player = await loginWithGoogle();
      onToast('success', 'Google 登入成功', `歡迎參賽，${player.displayName}！`);
    } catch (err: any) {
      onToast('error', 'Google 登入取消或失敗', err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/c/${challenge.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onToast('success', '已複製競賽連結');
    } catch {
      onToast('error', '複製失敗');
    }
  };

  const formatExpiry = (endsAt: string | null) => {
    if (!endsAt) return '無限期競賽';
    const d = new Date(endsAt);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} 截止`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>{challenge.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-600 font-bold">
            {challenge.id}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-sm" style={{ color: 'var(--text-1)' }}>
        {/* Info Banner */}
        <div className="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col gap-1">
            <span className="font-bold text-base">{challenge.words.length} 個挑戰單字</span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatExpiry(challenge.endsAt)}
              </span>
              <span>發起人：{challenge.creatorName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1"
              style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已複製' : '分享連結'}
            </button>
            <button
              onClick={() => onStartChallenge(challenge)}
              disabled={isExpired}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              style={{ background: isExpired ? '#94a3b8' : 'var(--accent)' }}
            >
              <Play className="w-4 h-4 fill-white" />
              {isExpired ? '競賽已截止' : '立即挑戰'}
            </button>
          </div>
        </div>

        {/* Identity Section (if not logged in) */}
        {!currentPlayer ? (
          <div className="p-4 rounded-xl border bg-amber-50/60 border-amber-200 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-amber-800 font-medium text-xs">
              <User className="w-4 h-4" />
              設定參賽身分即可登上排行榜（可輸入暱稱或綁定 Google）：
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <form onSubmit={handleLoginNickname} className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="輸入你的暱稱 (例: 閃電背單字王)"
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs border bg-white"
                />
                <button
                  type="submit"
                  disabled={isLoggingIn || !nicknameInput.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white disabled:opacity-50"
                >
                  設定
                </button>
              </form>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">或</span>
                <button
                  onClick={handleGoogleAuth}
                  disabled={isLoggingIn}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-300 text-slate-700 flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Google 登入
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                目前參賽身分：<strong className="text-slate-800">{currentPlayer.displayName}</strong>
                {currentPlayer.isAnonymous ? ' (匿名身分)' : ' (Google 帳號)'}
              </span>
            </div>
            {currentPlayer.isAnonymous ? (
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoggingIn}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <LogIn className="w-3 h-3" />
                改用 Google 登入
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoggingIn}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline"
              >
                切換帳號
              </button>
            )}
          </div>
        )}

        {/* Real-time Leaderboard */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-xs flex items-center gap-1 text-slate-700">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              即時排行榜 (Top {leaderboard.length})
            </h4>
            <span className="text-xs text-slate-400">即時更新</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl">
              目前尚無參賽紀錄，搶下第一名！
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {leaderboard.map((entry, idx) => {
                const isMe = currentPlayer && currentPlayer.uid === entry.uid;
                return (
                  <div
                    key={entry.uid}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors ${
                      isMe ? 'bg-indigo-50/70 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0
                            ? 'bg-amber-400 text-white shadow-sm'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-700'
                            : idx === 2
                            ? 'bg-amber-700/60 text-white'
                            : 'text-slate-400 font-mono'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-slate-900">{entry.displayName} {isMe && '(你)'}</span>
                        <span className="text-slate-400 text-[10px]">
                          答對 {entry.correctCount}/{entry.totalQuestions} ({entry.accuracy}%)・挑戰 {entry.attempts} 次
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-indigo-600 text-sm">
                          {entry.score} <span className="text-[10px] font-normal text-slate-500">分</span>
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {formatSeconds(entry.totalTimeMs)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
