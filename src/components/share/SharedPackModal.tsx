import React from 'react';
import { Download, Trophy } from 'lucide-react';
import { Modal } from '../common/Modal';
import { SharedPack } from '../../services/shareService';

interface SharedPackModalProps {
  pack: SharedPack | null;
  onClose: () => void;
  onImport: (pack: SharedPack, startChallenge: boolean) => void;
}

export const SharedPackModal: React.FC<SharedPackModalProps> = ({ pack, onClose, onImport }) => {
  if (!pack) return null;
  const isChallenge = !!pack.challenge;

  return (
    <Modal
      isOpen={!!pack}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {isChallenge ? <Trophy className="w-5 h-5 text-amber-500" /> : <Download className="w-5 h-5" />}
          {isChallenge ? '收到挑戰' : '收到分享的單字'}
        </span>
      }
    >
      <div className="flex flex-col gap-4 text-sm" style={{ color: 'var(--text-1)' }}>
        <div>
          <p className="text-lg font-bold">{pack.title}</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {pack.words.length} 個單字，將匯入到標籤「{pack.tag}」
            {isChallenge && `・速度門檻 ${Math.round(pack.challenge!.slowMs / 1000)} 秒`}
          </p>
        </div>

        <div
          className="max-h-48 overflow-y-auto rounded-lg p-2 flex flex-wrap gap-1.5"
          style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
        >
          {pack.words.map(w => (
            <span
              key={w.word}
              className="px-2 py-0.5 rounded text-xs"
              style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
              title={w.translation}
            >
              {isChallenge ? w.translation || '•••' : w.word}
            </span>
          ))}
        </div>

        {isChallenge && (
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            挑戰規則：題目順序固定、只用鍵盤作答、只算第一次作答。答對 100 分 + 速度加分（最高 100）。
          </p>
        )}

        <div className="flex flex-col gap-2">
          {isChallenge && (
            <button
              onClick={() => onImport(pack, true)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-white"
              style={{ background: 'var(--accent)' }}
            >
              <Trophy className="w-4 h-4" />匯入並開始挑戰
            </button>
          )}
          <button
            onClick={() => onImport(pack, false)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium"
            style={
              isChallenge
                ? { border: '1px solid var(--border)', color: 'var(--text-1)' }
                : { background: 'var(--accent)', color: '#fff' }
            }
          >
            <Download className="w-4 h-4" />只匯入到單字庫
          </button>
          <button onClick={onClose} className="py-2 text-xs" style={{ color: 'var(--text-3)' }}>
            取消
          </button>
        </div>
      </div>
    </Modal>
  );
};
