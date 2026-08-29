import React, { useState, useEffect } from 'react';
import { Header, TabType } from './components/common/Header';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { TestDashboard } from './components/test/TestDashboard';
import { TestSetupModal } from './components/test/TestSetupModal';
import { TestingView } from './components/test/TestingView';
import { RoundResultView } from './components/test/RoundResultView';
import { WordBankView } from './components/bank/WordBankView';
import { BatchAddModal } from './components/bank/BatchAddModal';
import { WordEditModal } from './components/bank/WordEditModal';
import { ImportExportModal } from './components/bank/ImportExportModal';
import { StatsView } from './components/stats/StatsView';
import { SettingsModal } from './components/settings/SettingsModal';
import { UserLoginModal } from './components/auth/UserLoginModal';
import { useVocabulary } from './hooks/useVocabulary';
import { useAuth } from './hooks/useAuth';
import { RoundConfig, RoundSummary, WordItem } from './types/vocabulary';
import { storageService } from './services/storageService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('test');
  
  // Test Session State
  const [isTestingActive, setIsTestingActive] = useState<boolean>(false);
  const [roundConfig, setRoundConfig] = useState<RoundConfig | null>(null);
  const [lastRoundSummary, setLastRoundSummary] = useState<RoundSummary | null>(null);

  // Modals state
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [isBatchAddOpen, setIsBatchAddOpen] = useState<boolean>(false);
  const [isWordEditOpen, setIsWordEditOpen] = useState<boolean>(false);
  const [wordToEdit, setWordToEdit] = useState<WordItem | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUserLoginModalOpen, setIsUserLoginModalOpen] = useState<boolean>(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Custom Hooks
  const {
    words,
    roundHistory,
    settings,
    stats,
    addWord,
    updateWord,
    deleteWord,
    resetWordProgress,
    importPresetBank,
    replaceAllWords,
    updateSettings,
    recordRound,
  } = useVocabulary();

  const {
    authState,
    syncStatus,
    loginLocal,
    loginGoogle,
    syncNow,
  } = useAuth();

  // Handle Google Drive sync when settings client ID is present
  useEffect(() => {
    if (settings.googleClientId && authState.authType === 'google') {
      // GIS will be ready on user interaction
    }
  }, [settings.googleClientId, authState.authType]);

  // Start Test Round Handlers
  const handleStartRound = (config: RoundConfig) => {
    setRoundConfig(config);
    setIsTestingActive(true);
    setLastRoundSummary(null);
  };

  const handleFinishRound = (summary: RoundSummary, updatedWords: WordItem[]) => {
    recordRound(summary, updatedWords);
    setLastRoundSummary(summary);
    setIsTestingActive(false);
    addToast('success', '回合測驗完成！', '學習進度與反應時間已自動儲存');
  };

  const handleExitTesting = () => {
    if (confirm('確定要結束本次測驗回合嗎？未完成的題目將不會計入。')) {
      setIsTestingActive(false);
      setRoundConfig(null);
    }
  };

  const handleRetryStruggling = (strugglingWordIds: string[]) => {
    const strugglingWords = words.filter((w) => strugglingWordIds.includes(w.id));
    if (strugglingWords.length === 0) return;

    setRoundConfig({
      wordCount: strugglingWords.length,
      filterMode: 'struggling',
      inputMode: settings.defaultInputMode || 'keyboard',
      autoPlayAudio: true,
      showPhoneticHint: false,
      handwritingSelfGrade: true,
    });
    setLastRoundSummary(null);
    setIsTestingActive(true);
  };

  // Sync Action
  const handleManualSync = async () => {
    if (authState.authType !== 'google' || !authState.accessToken) {
      setIsUserLoginModalOpen(true);
      return;
    }
    const success = await syncNow();
    if (success) {
      addToast('success', '同步成功', '已與 Google Drive 雲端同步最新單字庫');
    } else {
      addToast('error', '同步失敗', '請確認網路連線或重新登入 Google');
    }
  };

  const handleLocalLogin = (name: string, avatar: string) => {
    loginLocal(name, avatar);
    addToast('success', `歡迎，${name}！`, '已切換為本地使用者模式');
  };

  const handleGoogleLogin = async (clientId: string) => {
    try {
      await loginGoogle(clientId);
      addToast('success', 'Google 雲端同步已連線', '已載入最新雲端單字庫');
    } catch (err: any) {
      addToast('error', 'Google 登入失敗', err.message);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (isTestingActive) {
            if (confirm('正在進行測驗，切換分頁將會離開測驗回合，確定嗎？')) {
              setIsTestingActive(false);
              setRoundConfig(null);
              setActiveTab(tab);
            }
          } else {
            setActiveTab(tab);
            setLastRoundSummary(null);
          }
        }}
        syncStatus={syncStatus}
        authState={authState}
        onSyncClick={handleManualSync}
        onUserClick={() => setIsUserLoginModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        dueWordCount={stats.dueCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'test' && (
          <>
            {isTestingActive && roundConfig ? (
              <TestingView
                config={roundConfig}
                allWords={words}
                settings={settings}
                onFinishRound={handleFinishRound}
                onExit={handleExitTesting}
              />
            ) : lastRoundSummary ? (
              <RoundResultView
                summary={lastRoundSummary}
                settings={settings}
                onRetryStruggling={handleRetryStruggling}
                onStartNewRound={() => setIsSetupModalOpen(true)}
                onGoToBank={() => {
                  setLastRoundSummary(null);
                  setActiveTab('bank');
                }}
              />
            ) : (
              <TestDashboard
                words={words}
                roundHistory={roundHistory}
                settings={settings}
                onOpenSetupModal={() => setIsSetupModalOpen(true)}
                onQuickStart={handleStartRound}
                onGoToBank={() => setActiveTab('bank')}
              />
            )}
          </>
        )}

        {activeTab === 'bank' && (
          <WordBankView
            words={words}
            allTags={stats.allTags}
            settings={settings}
            onAddWord={() => {
              setWordToEdit(null);
              setIsWordEditOpen(true);
            }}
            onBatchAdd={() => setIsBatchAddOpen(true)}
            onImportExport={() => setIsImportExportOpen(true)}
            onEditWord={(w) => {
              setWordToEdit(w);
              setIsWordEditOpen(true);
            }}
            onDeleteWord={(id) => {
              deleteWord(id);
              addToast('info', '單字已刪除');
            }}
            onResetWordProgress={(id) => {
              resetWordProgress(id);
              addToast('info', '單字學習進度已重設');
            }}
            onStartRoundWithFiltered={(filtered) => {
              handleStartRound({
                wordCount: Math.min(20, filtered.length),
                filterMode: 'all',
                inputMode: settings.defaultInputMode || 'keyboard',
                autoPlayAudio: true,
                showPhoneticHint: false,
                handwritingSelfGrade: true,
              });
              setActiveTab('test');
            }}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            words={words}
            roundHistory={roundHistory}
            settings={settings}
            onStartRound={() => {
              setActiveTab('test');
              setIsSetupModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/60 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
        <div>SpeedVocab · 拼寫反應時間英文單字記憶 Web App · Serverless & 本地/雲端同步</div>
        <div className="text-slate-600 text-[11px]">支援一般使用者免設定本機使用、離線 PWA、Canvas 手寫與 Web Speech API 語音拼讀</div>
      </footer>

      {/* User Login & Profile Modal */}
      <UserLoginModal
        isOpen={isUserLoginModalOpen}
        onClose={() => setIsUserLoginModalOpen(false)}
        authState={authState}
        googleClientId={settings.googleClientId || ''}
        onLoginLocal={handleLocalLogin}
        onLoginGoogle={handleGoogleLogin}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Modals */}
      <TestSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onStartRound={handleStartRound}
        words={words}
        allTags={stats.allTags}
      />

      <BatchAddModal
        isOpen={isBatchAddOpen}
        onClose={() => setIsBatchAddOpen(false)}
        existingWords={words}
        onBatchAddSuccess={(newWords, addedCount) => {
          replaceAllWords(newWords);
          addToast('success', '批次新增成功', `已將 ${addedCount} 個單字新增至單字庫`);
        }}
      />

      <WordEditModal
        isOpen={isWordEditOpen}
        onClose={() => {
          setIsWordEditOpen(false);
          setWordToEdit(null);
        }}
        wordToEdit={wordToEdit}
        onSaveWord={(wordData) => {
          if (wordToEdit) {
            updateWord(wordToEdit.id, wordData);
            addToast('success', '更新成功', `單字「${wordData.word}」資料已更新`);
          } else {
            addWord(wordData as any);
            addToast('success', '新增成功', `單字「${wordData.word}」已加入字庫`);
          }
        }}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        words={words}
        onImportPresets={(bankType) => {
          const count = importPresetBank(bankType);
          addToast('success', '預設題庫匯入成功', `已匯入 ${count} 個${bankType === 'elementary' ? '國小必備' : '國中核心'}單字`);
        }}
        onRestoreBackup={(restoredWords) => {
          replaceAllWords(restoredWords);
          addToast('success', '備份還原成功', `已載入 ${restoredWords.length} 個單字`);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          updateSettings(newSettings);
          addToast('success', '設定已儲存');
        }}
        onResetAllData={() => {
          storageService.resetAllData();
          addToast('info', '資料已重設為初始狀態');
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
