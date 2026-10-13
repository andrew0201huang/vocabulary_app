import React, { useEffect, useMemo, useState } from 'react';
import { Share2, Copy, Trophy, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { WordItem, AppSettings } from '../../types/vocabulary';
import {
  buildPackFromTag,
  encodePackToUrl,
  newChallengeSeed,
  shareOrCopy,
} from '../../services/shareService';

interface ShareTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: string;
  words: WordItem[];
  settings: AppSettings;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const ShareTagModal: React.FC<ShareTagModalProps> = ({
  isOpen, onClose, tag, words, settings, onToast,
}) => {
  const [title, setTitle] = useState(tag);
  const [asChallenge, setAsChallenge] = useState(true);
  const [seed, setSeed] = useState(newChallengeSeed());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(tag);
      setSeed(newChallengeSeed());
      setCopied(false);
    }
  }, [isOpen, tag]);

  const count = useMemo(() => words.filter(w => w.tags.includes(tag)).length, [words, tag]);

  const url = useMemo(() => {
    if (!isOpen || !tag) return '';
    const pack = buildPackFromTag(
      words, tag, title,
      asChallenge
        ? {
            seed,
            slowMs: settings.speedThresholds?.slowMs ?? 15000,
            chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
          }
        : undefined,
    );
    return encodePackToUrl(pack);
  }, [isOpen, words, tag, title, asChallenge, seed, settings]);

  const handleShare = async () => {
    const text = asChallenge
      ? `來挑戰「${title}」${count} 個單字，看誰拼得又快又準！`
      : `分享給你「${title}」${count} 個單字`;
    const r = await shareOrCopy(text, url);
    if (r === 'copied') onToast('success', '已複製分享連結');
    else if (r === 'failed') onToast('error', '分享失敗', '請手動複製下方連結');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onToast('error', '複製失敗', '請長按連結手動複製');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<span className="flex items-center gap-2"><Share2 className="w-5 h-5" />分享標籤單字</span>}>
      <div className="flex flex-col gap-4 text-sm" style={{ color: 'var(--text-1)' }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>名稱</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            標籤「{tag}」共 {count} 個單字（只分享單字內容，不含你的學習紀錄）
          </p>
        </div>

        <label className="flex items-start gap-2 p-3 rounded-lg cursor-pointer" style={{ border: '1px solid var(--border)' }}>
          <input type="checkbox" checked={asChallenge} onChange={e => setAsChallenge(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-medium flex items-center gap-1"><Trophy className="w-4 h-4 text-amber-500" />設為挑戰賽</span>
            <span className="block text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              所有人題目順序相同、只用鍵盤作答、只算第一次作答，成績可以互相比較
            </span>
          </span>
        </label>

        {count > 300 && (
          <p className="text-xs text-amber-600">單字數量較多，連結會很長，部分通訊軟體可能截斷。</p>
        )}

        <textarea
          readOnly
          value={url}
          rows={3}
          onFocus={e => e.currentTarget.select()}
          className="w-full px-3 py-2 rounded-lg text-xs font-mono break-all"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
        />

        <div className="flex gap-2">
          <button
            onClick={handleShare}
            disabled={count === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            <Share2 className="w-4 h-4" />分享
          </button>
          <button
            onClick={handleCopy}
            disabled={count === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-1)' }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '已複製' : '複製連結'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
