import React, { useRef } from 'react';
import { Download, Upload, BookMarked, FileJson, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../common/Modal';
import { WordItem } from '../../types/vocabulary';
import { exportToCSV, exportToJSON, downloadFile, parseBatchWords, mergeParsedWords } from '../../services/parserService';
import { storageService } from '../../services/storageService';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  onImportPresets: (bankType: 'elementary' | 'junior_high') => void;
  onRestoreBackup: (words: WordItem[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  words,
  onImportPresets,
  onRestoreBackup,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const data = storageService.getData();
    const jsonStr = exportToJSON(data);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(jsonStr, `speedvocab_backup_${dateStr}.json`, 'application/json');
  };

  const handleExportCSV = () => {
    const csvStr = exportToCSV(words);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(csvStr, `speedvocab_words_${dateStr}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.words)) {
            onRestoreBackup(parsed.words);
            alert(`成功還原 ${parsed.words.length} 個單字！`);
            onClose();
          } else if (Array.isArray(parsed)) {
            onRestoreBackup(parsed);
            alert(`成功還原 ${parsed.length} 個單字！`);
            onClose();
          } else {
            alert('JSON 檔案格式不符，請確認是 SpeedVocab 匯出的備份檔。');
          }
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          const result = parseBatchWords(content, words, ['CSV匯入']);
          const merged = mergeParsedWords(words, result.validWords, true);
          onRestoreBackup(merged);
          alert(`成功從 CSV 匯入 ${result.validWords.length} 個單字！`);
          onClose();
        }
      } catch (err) {
        alert('檔案讀取解析失敗，請確認檔案格式是否正確。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-indigo-400" />
          <span>題庫匯入、匯出與備份</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="flex flex-col gap-6">
        {/* Built-in Presets */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            教育部官方題庫快速匯入 (MOE Official Word Banks)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                onImportPresets('elementary');
                onClose();
              }}
              className="p-4 rounded-2xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 text-left flex flex-col gap-1 transition-all group active:scale-[0.98]"
            >
              <div className="font-bold text-emerald-300 group-hover:text-emerald-200">
                🎒 國小基本必備單字
              </div>
              <div className="text-xs text-slate-400">
                教育部國小核心基礎單字，附例句、音標與詞性。
              </div>
              <span className="text-[11px] text-emerald-400 font-mono mt-1">
                +300 常用字
              </span>
            </button>

            <button
              onClick={() => {
                onImportPresets('junior_high');
                onClose();
              }}
              className="p-4 rounded-2xl bg-blue-950/20 hover:bg-blue-950/40 border border-blue-500/30 text-left flex flex-col gap-1 transition-all group active:scale-[0.98]"
            >
              <div className="font-bold text-blue-300 group-hover:text-blue-200">
                🏫 國中會考核心單字
              </div>
              <div className="text-xs text-slate-400">
                教育部國中必備 1200+ 核心單字與各領域分類。
              </div>
              <span className="text-[11px] text-blue-400 font-mono mt-1">
                +1200 核心字
              </span>
            </button>
          </div>
        </div>

        {/* Export Data */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            備份與資料匯出 (Backup & Export)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleExportCSV}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-left flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold">匯出 CSV 表格</div>
                  <div className="text-[10px] text-slate-400">支援 Excel 開啟 (含UTF-8 BOM)</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={handleExportJSON}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-left flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2.5">
                <FileJson className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="text-xs font-bold">匯出完整 JSON 備份</div>
                  <div className="text-[10px] text-slate-400">包含學習紀錄與反應時間</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Restore from File */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            從檔案還原 (Restore Backup)
          </h3>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/40 text-slate-300 hover:text-white flex items-center justify-center gap-2 text-xs font-semibold transition-all"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>點擊選擇 JSON 或 CSV 備份檔案進行還原</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
