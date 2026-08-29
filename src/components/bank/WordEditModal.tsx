import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit3, Volume2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { WordItem } from '../../types/vocabulary';
import { useSpeech } from '../../hooks/useSpeech';

interface WordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordToEdit?: WordItem | null;
  onSaveWord: (wordData: {
    word: string;
    translation: string;
    pos?: string;
    phonetic?: string;
    exampleEn?: string;
    exampleZh?: string;
    tags: string[];
  }) => void;
}

export const WordEditModal: React.FC<WordEditModalProps> = ({
  isOpen,
  onClose,
  wordToEdit,
  onSaveWord,
}) => {
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [pos, setPos] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [exampleZh, setExampleZh] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const { speak } = useSpeech();

  useEffect(() => {
    if (wordToEdit) {
      setWord(wordToEdit.word);
      setTranslation(wordToEdit.translation);
      setPos(wordToEdit.pos || '');
      setPhonetic(wordToEdit.phonetic || '');
      setExampleEn(wordToEdit.exampleEn || '');
      setExampleZh(wordToEdit.exampleZh || '');
      setTagsInput((wordToEdit.tags || []).join(', '));
    } else {
      setWord('');
      setTranslation('');
      setPos('');
      setPhonetic('');
      setExampleEn('');
      setExampleZh('');
      setTagsInput('日常');
    }
  }, [wordToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !translation.trim()) return;

    const tags = tagsInput
      .split(/[,/，、]/)
      .map(t => t.trim())
      .filter(Boolean);

    onSaveWord({
      word: word.trim().toLowerCase(),
      translation: translation.trim(),
      pos: pos.trim() || undefined,
      phonetic: phonetic.trim() || undefined,
      exampleEn: exampleEn.trim() || undefined,
      exampleZh: exampleZh.trim() || undefined,
      tags: tags.length > 0 ? tags : ['自訂'],
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {wordToEdit ? <Edit3 className="w-5 h-5 text-indigo-400" /> : <PlusCircle className="w-5 h-5 text-indigo-400" />}
          <span>{wordToEdit ? '編輯單字資料' : '新增單字'}</span>
        </div>
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* English Word & Audio preview */}
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">
            英文單字 (Word) *
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="例如：vocabulary"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-base focus:outline-none focus:border-indigo-500"
            />
            {word && (
              <button
                type="button"
                onClick={() => speak(word)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 transition-colors"
                title="試聽發音"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Translation */}
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">
            中文釋義 (Translation) *
          </label>
          <input
            type="text"
            required
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="例如：字彙；單字庫"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* POS & Phonetic in row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">
              詞性 (POS)
            </label>
            <input
              type="text"
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              placeholder="例如：n. / v. / adj."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">
              音標 (Phonetic)
            </label>
            <input
              type="text"
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              placeholder="例如：[vəˈkæbjəleri]"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Example Sentence EN */}
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">
            英文例句 (Example Sentence)
          </label>
          <input
            type="text"
            value={exampleEn}
            onChange={(e) => setExampleEn(e.target.value)}
            placeholder="例如：Build your vocabulary step by step."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Example Sentence ZH */}
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">
            例句中文翻譯 (Sentence Translation)
          </label>
          <input
            type="text"
            value={exampleZh}
            onChange={(e) => setExampleZh(e.target.value)}
            placeholder="例如：循序漸進地擴充你的單字量。"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">
            標籤分類 (以逗號分隔)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="例如：基礎, 多益, 生活"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Submit */}
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
            disabled={!word.trim() || !translation.trim()}
            className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-indigo-950/40"
          >
            {wordToEdit ? '儲存修改' : '加入單字庫'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
