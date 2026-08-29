import React, { useState } from 'react';
import { ClipboardPaste, AlertCircle, CheckCircle2, FileText, Layers } from 'lucide-react';
import { Modal } from '../common/Modal';
import { WordItem } from '../../types/vocabulary';
import { parseBatchWords, mergeParsedWords, ParsedWordEntry } from '../../services/parserService';

interface BatchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingWords: WordItem[];
  onBatchAddSuccess: (newWords: WordItem[], addedCount: number) => void;
}

export const BatchAddModal: React.FC<BatchAddModalProps> = ({
  isOpen,
  onClose,
  existingWords,
  onBatchAddSuccess,
}) => {
  const [pastedText, setPastedText] = useState<string>('');
  const [defaultTags, setDefaultTags] = useState<string>('自訂匯入');
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false);
  const [parsedEntries, setParsedEntries] = useState<{
    valid: ParsedWordEntry[];
    duplicates: ParsedWordEntry[];
    invalid: { line: number; text: string; error: string }[];
  } | null>(null);

  const handleParse = () => {
    if (!pastedText.trim()) return;
    const tagList = defaultTags.split(/[,/，、]/).map(t => t.trim()).filter(Boolean);
    const result = parseBatchWords(pastedText, existingWords, tagList);
    setParsedEntries({
      valid: result.validWords,
      duplicates: result.duplicates,
      invalid: result.invalidLines,
    });
  };

  const handleImport = () => {
    if (!parsedEntries) return;
    const entriesToImport = overwriteExisting
      ? [...parsedEntries.valid, ...parsedEntries.duplicates]
      : parsedEntries.valid;

    const merged = mergeParsedWords(existingWords, entriesToImport, overwriteExisting);
    onBatchAddSuccess(merged, entriesToImport.length);
    handleClose();
  };

  const handleClose = () => {
    setPastedText('');
    setParsedEntries(null);
    onClose();
  };

  const sampleData = `apple\t蘋果\tn.\t[ˈæpl]
banana\t香蕉\tn.\t[bəˈnænə]
orange\t柳橙\tn.\t[ˈɔːrɪndʒ]`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-indigo-400" />
          <span>批次新增單字 (從 Excel / 表格複製貼上)</span>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-5">
        {/* Helper Instructions */}
        <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-300 flex flex-col gap-1.5">
          <div className="font-bold text-indigo-300 flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>支援格式說明：</span>
          </div>
          <p>
            直接從 <strong>Excel</strong> 或 <strong>Google Sheets</strong> 複製欄位貼上（以 Tab 分隔：單字 [Tab] 中文 [Tab] 詞性 [Tab] 音標），或使用逗號分隔、<code>單字 - 中文</code> 格式。
          </p>
        </div>

        {/* Textarea Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-400">
              貼上文字內容：
            </label>
            <button
              type="button"
              onClick={() => setPastedText(sampleData)}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline"
            >
              載入範例格式
            </button>
          </div>

          <textarea
            rows={7}
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value);
              setParsedEntries(null);
            }}
            placeholder={`在此貼上內容，例如：\napple\t蘋果\nbanana\t香蕉\ncat, 貓\ndog - 狗`}
            className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Global Tags & Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">
              設定標籤分類 (以逗號分隔)：
            </label>
            <input
              type="text"
              value={defaultTags}
              onChange={(e) => setDefaultTags(e.target.value)}
              placeholder="例如：多益, 商務, 基礎"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer mt-3 sm:mt-0">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-300">
                若單字已存在，覆寫更新中文釋義
              </span>
            </label>
          </div>
        </div>

        {/* Parse Button */}
        {!parsedEntries && (
          <button
            type="button"
            onClick={handleParse}
            disabled={!pastedText.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all"
          >
            解析並預覽單字列表
          </button>
        )}

        {/* Parsed Result Preview Table */}
        {parsedEntries && (
          <div className="flex flex-col gap-3 animate-fade-in">
            {/* Stats bar */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  可新增：{parsedEntries.valid.length} 個
                </span>
                {parsedEntries.duplicates.length > 0 && (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    已存在重複：{parsedEntries.duplicates.length} 個 ({overwriteExisting ? '將覆寫' : '將略過'})
                  </span>
                )}
                {parsedEntries.invalid.length > 0 && (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    格式不符：{parsedEntries.invalid.length} 行
                  </span>
                )}
              </div>
            </div>

            {/* Preview List */}
            <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl bg-slate-950/60 p-2 flex flex-col gap-1.5">
              {parsedEntries.valid.slice(0, 50).map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-slate-900/80">
                  <span className="font-bold text-slate-100 font-mono">{entry.word}</span>
                  <span className="text-slate-300">{entry.translation}</span>
                  {entry.pos && <span className="text-indigo-400 font-mono">{entry.pos}</span>}
                </div>
              ))}
              {parsedEntries.valid.length > 50 && (
                <div className="text-center text-xs text-slate-500 py-1">
                  ...其餘 {parsedEntries.valid.length - 50} 個單字已省略預覽
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setParsedEntries(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                重新編輯文字
              </button>

              <button
                type="button"
                onClick={handleImport}
                disabled={parsedEntries.valid.length === 0 && (!overwriteExisting || parsedEntries.duplicates.length === 0)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-emerald-950/40"
              >
                確認匯入至單字庫 ({overwriteExisting ? parsedEntries.valid.length + parsedEntries.duplicates.length : parsedEntries.valid.length} 個單字)
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
