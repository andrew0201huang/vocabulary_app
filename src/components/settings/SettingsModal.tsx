import React, { useState } from 'react';
import { Settings, Key, Volume2, Gauge, ShieldAlert, HelpCircle, Check, Play, Headphones } from 'lucide-react';
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
  const [speechRate, setSpeechRate] = useState(settings.speechRate || 0.95);
  const [speechPitch, setSpeechPitch] = useState(settings.speechPitch || 1.0);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(settings.soundEffectsEnabled ?? true);
  const [chineseDelaySeconds, setChineseDelaySeconds] = useState(settings.chineseDelaySeconds ?? 10);
  
  // Speed Thresholds in seconds for user convenience
  const [lightningSec, setLightningSec] = useState((settings.speedThresholds.lightningMs / 1000).toFixed(1));
  const [goodSec, setGoodSec] = useState((settings.speedThresholds.goodMs / 1000).toFixed(1));
  const [slowSec, setSlowSec] = useState((settings.speedThresholds.slowMs / 1000).toFixed(1));

  const [showHelp, setShowHelp] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { speak } = useSpeech();

  const handleSave = () => {
    onSaveSettings({
      googleClientId: googleClientId.trim(),
      speechRate: Number(speechRate),
      speechPitch: Number(speechPitch),
      soundEffectsEnabled,
      chineseDelaySeconds: Number(chineseDelaySeconds),
      speedThresholds: {
        lightningMs: Math.round(Number(lightningSec) * 1000),
        goodMs: Math.round(Number(goodSec) * 1000),
        slowMs: Math.round(Number(slowSec) * 1000),
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
        {/* Section 1: Google OAuth 2.0 Client ID */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Google OAuth 2.0 Client ID</span>
            </label>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>如何取得？</span>
            </button>
          </div>

          <input
            type="text"
            value={googleClientId}
            onChange={(e) => setGoogleClientId(e.target.value)}
            placeholder="例如：123456789-xxxxxx.apps.googleusercontent.com"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
          />

          {showHelp && (
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-slate-300 flex flex-col gap-1">
              <p>1. 前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Google Cloud Console 憑證頁面</a>。</p>
              <p>2. 建立 OAuth 2.0 用戶端 ID（應用程式類型選擇「網頁應用程式」）。</p>
              <p>3. 在「已授權的 JavaScript 來源」新增您的 GitHub Pages 網址 (如 <code>https://username.github.io</code> 或 <code>http://localhost:5173</code>)。</p>
              <p>4. 啟用 <strong>Google Drive API</strong> 服務權限。</p>
              <p className="text-emerald-400 mt-0.5">※ 本 App 僅申請 <code>appDataFolder</code> 隱藏儲存權限，絕對不會存取您雲端硬碟中的其他私人檔案。</p>
            </div>
          )}
        </div>

        {/* Section 2: Speech Synthesis (TTS) Settings */}
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

        {/* Section 3: Listening-First Prompt Delay */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-cyan-400" />
              <span>聽音優先模式：延遲顯示中文釋義時間</span>
            </label>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              {chineseDelaySeconds === 0 ? '即時顯示' : `${chineseDelaySeconds} 秒`}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            出題時先播放英文發音，經過指定秒數（預設 10 秒）後自動顯示中文翻譯
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { sec: 0, label: '0s (即時顯示)' },
              { sec: 5, label: '5 秒' },
              { sec: 10, label: '10 秒 (預設)' },
              { sec: 15, label: '15 秒' },
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

        {/* Section 4: Speed Thresholds Configuration */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-indigo-400" />
            <span>反應時間等級判定門檻 (Speed Thresholds)</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <span className="text-[11px] text-amber-400 block mb-1 font-bold">⚡ 極速精通</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">&lt;</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="5.0"
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
                  step="0.1"
                  min="1.0"
                  max="10.0"
                  value={goodSec}
                  onChange={(e) => setGoodSec(e.target.value)}
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
                  step="0.1"
                  min="2.0"
                  max="20.0"
                  value={slowSec}
                  onChange={(e) => setSlowSec(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-center text-slate-100"
                />
                <span className="text-xs text-slate-400">秒</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Dangerous Zone - Reset Data */}
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
