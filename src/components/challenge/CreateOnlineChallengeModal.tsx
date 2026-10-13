import React, { useState } from 'react';
import { Trophy, Clock, Share2, Copy, Check, LogIn } from 'lucide-react';
import { Modal } from '../common/Modal';
import { WordItem, AppSettings } from '../../types/vocabulary';
import { createOnlineChallenge, CurrentPlayer, loginWithGoogle } from '../../services/firebaseChallengeService';

interface CreateOnlineChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: string;
  allTags: string[];
  words: WordItem[];
  settings: AppSettings;
  currentPlayer: CurrentPlayer | null;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  onChallengeCreated: (code: string) => void;
}

export const CreateOnlineChallengeModal: React.FC<CreateOnlineChallengeModalProps> = ({
  isOpen,
  onClose,
  tag: initialTag,
  allTags,
  words,
  settings,
  currentPlayer,
  onToast,
  onChallengeCreated,
}) => {
  const [selectedTag, setSelectedTag] = useState(initialTag || (allTags[0] ?? ''));
  const [title, setTitle] = useState(initialTag || '單字挑戰');
  const [durationMode, setDurationMode] = useState<'7' | '3' | '14' | 'unlimited'>('7');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const activeTag = initialTag || (allTags[0] ?? '');
      setSelectedTag(activeTag);
      setTitle(activeTag ? `${activeTag} 競賽` : '單字挑戰');
      setCreatedCode(null);
    }
  }, [isOpen, initialTag, allTags]);

  const tagWords = words.filter(w => selectedTag ? w.tags.includes(selectedTag) : true);

  const handleCreate = async () => {
    if (tagWords.length === 0) {
      onToast('error', '標籤無單字', '此標籤下沒有單字可供舉辦競賽');
      return;
    }

    try {
      setIsSubmitting(true);
      const durationDays = durationMode === 'unlimited' ? null : parseInt(durationMode, 10);
      const code = await createOnlineChallenge({
        title,
        tag: selectedTag,
        words,
        durationDays,
        slowMs: settings.speedThresholds?.slowMs ?? 15000,
        chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
      });

      setCreatedCode(code);
      onToast('success', '競賽發起成功！', `參賽代碼：${code}`);
      onChallengeCreated(code);
    } catch (err: any) {
      console.error(err);
      onToast('error', '建立競賽失敗', err.message || '請確認網路連線');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShareUrl = (code: string) => {
    return `${window.location.origin}${window.location.pathname}#/c/${code}`;
  };

  const handleCopy = async () => {
    if (!createdCode) return;
    const url = getShareUrl(createdCode);
    const text = `🏆 邀請你參加「${title}」單字競賽！\n題目數量：${tagWords.length} 字\n參賽代碼：${createdCode}\n立即參賽：${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onToast('success', '已複製參賽邀請連結');
    } catch {
      onToast('error', '複製失敗');
    }
  };

  const handleNativeShare = async () => {
    if (!createdCode) return;
    const url = getShareUrl(createdCode);
    const text = `🏆 邀請你參加「${title}」單字拼寫競賽！\n題目共 ${tagWords.length} 字，看誰能登上排行榜第一名！`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `單字競賽：${title}`, text, url });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setCreatedCode(null);
        onClose();
      }}
      title={
        <span className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          發起單字競賽排行榜
        </span>
      }
    >
      <div className="flex flex-col gap-4 text-sm" style={{ color: 'var(--text-1)' }}>
        {!createdCode ? (
          <>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>選擇要競賽的標籤</label>
              <select
                value={selectedTag}
                onChange={e => {
                  setSelectedTag(e.target.value);
                  setTitle(e.target.value ? `${e.target.value} 競賽` : '單字競賽');
                }}
                className="w-full px-3 py-2 rounded-lg text-sm mb-2"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
              >
                {allTags.map(t => (
                  <option key={t} value={t}>
                    {t} ({words.filter(w => w.tags.includes(t)).length} 個單字)
                  </option>
                ))}
              </select>

              <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>競賽標題</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                標籤「{selectedTag}」共 {tagWords.length} 個單字
              </p>
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>競賽進行期間</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: '7', label: '1 週 (預設)' },
                  { id: '3', label: '3 天' },
                  { id: '14', label: '2 週' },
                  { id: 'unlimited', label: '不設限' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDurationMode(opt.id as any)}
                    className="py-2 px-2 rounded-lg text-xs font-medium border text-center transition-all"
                    style={{
                      background: durationMode === opt.id ? 'var(--accent)' : 'var(--bg)',
                      borderColor: durationMode === opt.id ? 'var(--accent)' : 'var(--border)',
                      color: durationMode === opt.id ? '#fff' : 'var(--text-2)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg text-xs flex flex-col gap-1.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-1.5 font-medium text-amber-600">
                <Clock className="w-3.5 h-3.5" />
                公平競賽規則已自動鎖定：
              </div>
              <ul className="list-disc pl-4 space-y-0.5" style={{ color: 'var(--text-2)' }}>
                <li>固定出題順序：所有參賽者面臨完全相同的題目序列</li>
                <li>限鍵盤拼寫作答：杜絕輸入法自動辨識速度差異</li>
                <li>即時雲端榜單：每位玩家取最佳得分即時排位</li>
                <li>學習進度連動：參賽作答同樣會累計至您的個人單字庫熟練度</li>
              </ul>
            </div>

            {(!currentPlayer || currentPlayer.isAnonymous) ? (
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-amber-800 font-medium">
                  🔒 系統規定：只有使用 Google 帳號登入才可發起競賽
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await loginWithGoogle();
                      onToast('success', 'Google 登入成功！');
                    } catch (e: any) {
                      onToast('error', '登入失敗', e.message);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg font-semibold bg-white border border-slate-300 text-slate-800 flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                  使用 Google 登入後發起
                </button>
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm border font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting || tagWords.length === 0 || !currentPlayer || currentPlayer.isAnonymous}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {isSubmitting ? '建立中...' : '建立競賽並取得邀請代碼'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <div className="text-center flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base">競賽發起成功！</h3>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                將代碼或連結分享給好友，大家就能在同個排行榜同台競技！
              </p>
            </div>

            <div className="p-4 rounded-xl text-center border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>參賽邀請碼</span>
              <div className="text-3xl font-extrabold tracking-widest text-indigo-600 my-1 font-mono">
                {createdCode}
              </div>
              <span className="text-xs text-slate-500">
                可直接在首頁輸入此代碼加入
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)' }}
              >
                <Share2 className="w-4 h-4" />
                分享競賽
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border flex items-center justify-center gap-2"
                style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? '已複製' : '複製邀請連結'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
