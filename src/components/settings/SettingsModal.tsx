import React, { useState } from 'react';
import { Settings, ShieldCheck, Volume2, Gauge, ShieldAlert, Check, Play, Headphones, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '../common/Modal';
import { AppSettings } from '../../types/vocabulary';
import { useSpeech } from '../../hooks/useSpeech';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: Partial<AppSettings>) => void;
  onResetAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetAllData,
}) => {
  const [googleClientId, setGoogleClientId] = useState(settings.googleClientId || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(settings.openaiApiKey || '');
  const [speechRate, setSpeechRate] = useState(settings.speechRate || 0.95);
  const [speechPitch, setSpeechPitch] = useState(settings.speechPitch || 1.0);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(settings.soundEffectsEnabled ?? true);
  
  // Speed Thresholds in seconds: default 5, 10, 15
  const [lightningSec, setLightningSec] = useState((settings.speedThresholds.lightningMs / 1000).toFixed(1));
  const [goodSec, setGoodSec] = useState((settings.speedThresholds.goodMs / 1000).toFixed(1));
  const [slowSec, setSlowSec] = useState((settings.speedThresholds.slowMs / 1000).toFixed(1));

  // Chinese reveal delay defaults to slowMs (生疏重測時間)
  const [chineseDelaySeconds, setChineseDelaySeconds] = useState(
    settings.chineseDelaySeconds ?? Math.round(Number(goodSec))
  );

  const [showAdvancedAuth, setShowAdvancedAuth] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { speak } = useSpeech();

  const handleSave = () => {
    const lMs = Math.round(Number(lightningSec) * 1000);
    const gMs = Math.round(Number(goodSec) * 1000);
    const sMs = Math.round(Number(slowSec) * 1000);

    onSaveSettings({
      googleClientId: googleClientId.trim(),
      openaiApiKey: openaiApiKey.trim(),
      speechRate: Number(speechRate),
      speechPitch: Number(speechPitch),
      soundEffectsEnabled,
      chineseDelaySeconds: Number(chineseDelaySeconds),
      speedThresholds: {
        lightningMs: lMs,
        goodMs: gMs,
        slowMs: sMs,
      },
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const handleTestSpeech = () => {
    speak('Welcome to SpeedVocab reaction test.', Number(speechRate), Number(speechPitch));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>應用程式偏好設定 (Settings)</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="flex flex-col gap-6">
        {/* Section 1: Reaction Time Speed Thresholds */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-indigo-400" />
              <span>反應時間等級判定門檻 (Speed Thresholds: 5s, 10s, 15s)</span>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <span className="text-[11px] text-amber-400 block mb-1 font-bold">⚡ 極速精通</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">&lt;</span>
                <input
                  type="number"
                  step="0.5"
                  min="1.0"
                  max="10.0"
                  value={lightningSec}
                  onChange={(e) => setLightningSec(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-center text-slate-100"
                />
                <span className="text-xs text-slate-400">秒</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-emerald-400 block mb-1 font-bold">✨ 熟練反應</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">&lt;</span>
                <input
                  type="number"
                  step="0.5"
                  min="2.0"
                  max="20.0"
                  value={goodSec}
                  onChange={(e) => {
                    setGoodSec(e.target.value);
                    setChineseDelaySeconds(Math.round(Number(e.target.value)));
                  }}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-center text-slate-100"
                />
                <span className="text-xs text-slate-400">秒</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-rose-400 block mb-1 font-bold">⚠️ 生疏重測</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">&gt;</span>
                <input
                  type="number"
                  step="0.5"
                  min="5.0"
                  max="30.0"
                  value={slowSec}
                  onChange={(e) => setSlowSec(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-center text-slate-100"
                />
                <span className="text-xs text-slate-400">秒</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-0.5">
            作答時間超過門檻將自動歸入「生疏動態複習池」，於回合尾端重新測驗。
          </div>
        </div>

        {/* Section 2: Listening-First Prompt Delay (Tied to Slow Threshold) */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-cyan-400" />
              <span>聽音優先：延遲顯示中文釋義時間（以生疏門檻為準）</span>
            </label>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              {chineseDelaySeconds === 0 ? '即時顯示' : `${chineseDelaySeconds} 秒`}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            出題時先播放英文發音，前 {chineseDelaySeconds} 秒隱藏中文，超過時間後自動顯示中文釋義提供輔助。
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { sec: 0, label: '0s (即時顯示)' },
              { sec: 5, label: '5 秒 (極速)' },
              { sec: 10, label: '10 秒 (推薦)' },
              { sec: 15, label: '15 秒 (放寬)' },
            ].map(({ sec, label }) => (
              <button
                key={sec}
                type="button"
                onClick={() => setChineseDelaySeconds(sec)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                  chineseDelaySeconds === sec
                    ? 'border-cyan-500 bg-cyan-950/50 text-cyan-200 shadow-md ring-1 ring-cyan-500/30'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Speech Synthesis (TTS) Settings */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-indigo-400" />
            <span>語音合成發音設定 (Speech Synthesis)</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>語速 (Speed Rate)：</span>
                <span className="font-mono text-indigo-300">{speechRate}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>音調 (Pitch)：</span>
                <span className="font-mono text-indigo-300">{speechPitch}</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={soundEffectsEnabled}
                onChange={(e) => setSoundEffectsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-300">啟用介面音效 (正確/錯誤/通關音)</span>
            </label>

            <button
              type="button"
              onClick={handleTestSpeech}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>試聽語音</span>
            </button>
          </div>
        </div>

        {/* Section 4: OpenAI Whisper — Offline Recording Mode */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎙️</span>
              <span className="text-xs font-bold text-slate-200">語音拼讀模式：OpenAI Whisper API</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                openaiApiKey
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {openaiApiKey ? '✅ 離線錄音模式' : '⚠️ 使用瀏覽器語音辨識'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowOpenAIKey(!showOpenAIKey)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {showOpenAIKey ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            {openaiApiKey
              ? '🎉 已啟用：語音拼讀將改用本機錄音後送至 Whisper AI 辨識，辨識精準度高且不受網路狀態影響。'
              : '目前使用 Chrome 瀏覽器內建語音辨識（需連線至 Google 語音伺服器）。設定 OpenAI API 金鑰後可改為本機錄音模式。'}
          </div>

          {showOpenAIKey && (
            <div className="mt-1 flex flex-col gap-2 animate-fade-in">
              <label className="text-[11px] font-bold text-slate-300">
                OpenAI API Key (sk-...)：
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
              <div className="text-[10px] text-slate-500 leading-relaxed">
                金鑰僅儲存在您的瀏覽器本機（localStorage），不會傳送至任何第三方伺服器。<br />
                取得金鑰：前往 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-indigo-400 underline">platform.openai.com/api-keys</a> 建立 API Key。
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Google Cloud Authorization (Clean / Hidden by default) */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Google Drive 雲端同步設定</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                已就緒
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedAuth(!showAdvancedAuth)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>{showAdvancedAuth ? '隱藏進階設定' : '進階設定'}</span>
              {showAdvancedAuth ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            使用者點擊「Google 登入」即可直接同步進度至個人雲端硬碟（<code>appDataFolder</code> 專屬目錄）。
          </div>

          {showAdvancedAuth && (
            <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2 animate-fade-in">
              <label className="text-[11px] font-bold text-slate-300">
                自訂 Google OAuth 2.0 Client ID (一般使用者無需修改)：
              </label>
              <input
                type="text"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="例如：547959897484-xxxxxx.apps.googleusercontent.com"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Section 5: Dangerous Zone - Reset Data */}
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>重設本機所有學習資料</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              清除單字熟悉度與測驗紀錄，回復為預設單字狀態
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm('警告：確定要清空所有本機單字庫與學習進度紀錄嗎？此動作無法復原。')) {
                onResetAllData();
                onClose();
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 border border-rose-500 text-rose-200 text-xs font-bold transition-colors"
          >
            重設資料
          </button>
        </div>

        {/* Footer Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            取消
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40"
          >
            {isSaved ? <Check className="w-4 h-4" /> : null}
            <span>{isSaved ? '已儲存！' : '儲存設定'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
