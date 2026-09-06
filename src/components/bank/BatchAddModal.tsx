import React, { useState, useCallback } from 'react';
import {
  ClipboardPaste, CheckCircle2, Layers, AlertCircle, Search,
  Loader2, RotateCcw, BookOpen,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { WordItem } from '../../types/vocabulary';
import {
  parseBatchWords, mergeParsedWords, lookupMissingWords,
  ParsedWordEntry,
} from '../../services/parserService';

interface BatchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingWords: WordItem[];
  onBatchAddSuccess: (newWords: WordItem[], addedCount: number) => void;
}

type Stage = 'input' | 'preview' | 'looking-up' | 'ready';

export const BatchAddModal: React.FC<BatchAddModalProps> = ({
  isOpen,
  onClose,
  existingWords,
  onBatchAddSuccess,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [defaultTags, setDefaultTags] = useState('自訂匯入');
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const [stage, setStage] = useState<Stage>('input');
  const [validEntries, setValidEntries] = useState<ParsedWordEntry[]>([]);
  const [dupEntries, setDupEntries] = useState<ParsedWordEntry[]>([]);
  const [invalidLines, setInvalidLines] = useState<{ line: number; text: string; error: string }[]>([]);

  const [lookupProgress, setLookupProgress] = useState({ done: 0, total: 0 });

  const needsLookupCount = validEntries.filter(e => e.needsLookup).length
    + dupEntries.filter(e => e.needsLookup).length;

  // ── Parse ──────────────────────────────────────────────────────────────
  const handleParse = useCallback(() => {
    if (!pastedText.trim()) return;
    const tags = defaultTags.split(/[,/，、]/).map(t => t.trim()).filter(Boolean);
    const result = parseBatchWords(pastedText, existingWords, tags);
    setValidEntries(result.validWords);
    setDupEntries(result.duplicates);
    setInvalidLines(result.invalidLines);
    setStage('preview');
  }, [pastedText, existingWords, defaultTags]);

  // ── Auto-lookup ────────────────────────────────────────────────────────
  const handleLookup = useCallback(async () => {
    setStage('looking-up');
    const allEntries = [...validEntries, ...dupEntries];
    setLookupProgress({ done: 0, total: allEntries.filter(e => e.needsLookup).length });

    const updated = await lookupMissingWords(allEntries, (done, total) => {
      setLookupProgress({ done, total });
    });

    const newValid: ParsedWordEntry[] = [];
    const newDups: ParsedWordEntry[] = [];
    updated.forEach(e => (e.isDuplicate ? newDups : newValid).push(e));
    setValidEntries(newValid);
    setDupEntries(newDups);
    setStage('ready');
  }, [validEntries, dupEntries]);

  // ── Import ─────────────────────────────────────────────────────────────
  const handleImport = useCallback(() => {
    const toImport = overwriteExisting
      ? [...validEntries, ...dupEntries]
      : validEntries;
    const merged = mergeParsedWords(existingWords, toImport, overwriteExisting);
    onBatchAddSuccess(merged, toImport.length);
    handleClose();
  }, [validEntries, dupEntries, overwriteExisting, existingWords, onBatchAddSuccess]);

  const handleClose = () => {
    setPastedText('');
    setValidEntries([]);
    setDupEntries([]);
    setInvalidLines([]);
    setStage('input');
    onClose();
  };

  const importCount = overwriteExisting
    ? validEntries.length + dupEntries.length
    : validEntries.length;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-indigo-400" />
          <span>批次新增單字</span>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-5">

        {/* ── Stage: Input ── */}
        {stage === 'input' && (
          <>
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-300 leading-relaxed">
              <div className="font-bold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-4 h-4" />
                <span>支援任意格式</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>每行一個單字，格式不限</li>
                <li>可直接貼 Excel / Google Sheets（Tab 分隔）</li>
                <li>支援「apple 蘋果」「apple - 蘋果」「apple, 蘋果」等</li>
                <li><strong className="text-indigo-300">只貼英文單字（無中文）</strong>→ 可自動查字典補上釋義 🔍</li>
                <li>也可貼中文詞彙，系統會把它當作查詢目標</li>
              </ul>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                貼上內容：
              </label>
              <textarea
                rows={8}
                value={pastedText}
                onChange={e => { setPastedText(e.target.value); }}
                placeholder={`範例（任何格式都行）：\napple\nbanana\napple\t蘋果\ncat - 貓\ndog, 狗\nbeautiful\n學校`}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  標籤分類（逗號分隔）：
                </label>
                <input
                  type="text"
                  value={defaultTags}
                  onChange={e => setDefaultTags(e.target.value)}
                  placeholder="例如：多益, 商務, 基礎"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-1">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={e => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
                  />
                  <span className="text-xs text-slate-300">若已存在，覆寫中文釋義</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={handleParse}
              disabled={!pastedText.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all"
            >
              解析並預覽
            </button>
          </>
        )}

        {/* ── Stage: Preview / Ready ── */}
        {(stage === 'preview' || stage === 'ready') && (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap gap-3 text-xs px-1">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                可新增：{validEntries.length} 個
              </span>
              {dupEntries.length > 0 && (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  已存在：{dupEntries.length} 個（{overwriteExisting ? '將覆寫' : '略過'}）
                </span>
              )}
              {invalidLines.length > 0 && (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  無法解析：{invalidLines.length} 行
                </span>
              )}
              {needsLookupCount > 0 && stage === 'preview' && (
                <span className="text-sky-400 font-bold flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" />
                  待查字典：{needsLookupCount} 個
                </span>
              )}
            </div>

            {/* Preview table */}
            <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/60 p-2 flex flex-col gap-1">
              {validEntries.slice(0, 80).map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-slate-900/80 gap-2">
                  <span className="font-bold text-slate-100 font-mono shrink-0">{entry.word}</span>
                  {entry.needsLookup
                    ? <span className="text-sky-400 italic">🔍 待查字典</span>
                    : <span className="text-slate-300 truncate">{entry.translation}</span>
                  }
                  {entry.pos && <span className="text-indigo-400 font-mono shrink-0">{entry.pos}</span>}
                </div>
              ))}
              {validEntries.length > 80 && (
                <div className="text-center text-xs text-slate-500 py-1">…另有 {validEntries.length - 80} 個省略</div>
              )}
            </div>

            {/* Auto-lookup CTA */}
            {needsLookupCount > 0 && stage === 'preview' && (
              <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 flex flex-col gap-2">
                <div className="text-xs text-sky-300 font-semibold flex items-center gap-1.5">
                  <Search className="w-4 h-4" />
                  有 {needsLookupCount} 個單字缺少中文釋義
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  點擊「自動查字典」將透過 Free Dictionary API + MyMemory 翻譯自動補上中文釋義、詞性、音標。
                  也可跳過直接匯入（釋義欄留空）。
                </div>
                <button
                  type="button"
                  onClick={handleLookup}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  自動查字典（{needsLookupCount} 個）
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStage('input')}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重新編輯
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importCount === 0}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg"
              >
                確認匯入（{importCount} 個單字）
              </button>
            </div>
          </>
        )}

        {/* ── Stage: Looking up ── */}
        {stage === 'looking-up' && (
          <div className="flex flex-col items-center gap-5 py-6">
            <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
            <div className="text-sm font-bold text-slate-200">
              正在查詢字典... {lookupProgress.done} / {lookupProgress.total}
            </div>
            {/* Progress bar */}
            <div className="w-full max-w-xs h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: lookupProgress.total ? `${(lookupProgress.done / lookupProgress.total) * 100}%` : '0%' }}
              />
            </div>
            <div className="text-xs text-slate-400 text-center max-w-xs leading-relaxed">
              透過 Free Dictionary API 查詢英文定義，並使用 MyMemory 翻譯成中文
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
