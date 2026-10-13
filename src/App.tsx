import React, { useState, useEffect } from 'react';
import { Trophy, Zap } from 'lucide-react';
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
import { DebugPanel } from './components/debug/DebugPanel';
import { useVocabulary } from './hooks/useVocabulary';
import { useAuth } from './hooks/useAuth';
import { RoundConfig, RoundSummary, WordItem } from './types/vocabulary';
import { storageService } from './services/storageService';
import { speechService } from './services/speechService';
import { ShareTagModal } from './components/share/ShareTagModal';
import { SharedPackModal } from './components/share/SharedPackModal';
import { CreateOnlineChallengeModal } from './components/challenge/CreateOnlineChallengeModal';
import { ChallengeLobbyModal } from './components/challenge/ChallengeLobbyModal';
import {
  ChallengeDoc,
  CurrentPlayer,
  subscribeAuth,
  getChallenge,
  importChallengeWords,
  submitChallengeScore,
  subscribeMyChallenges,
  loginWithGoogle,
  logoutFirebase,
} from './services/firebaseChallengeService';
import {
  SharedPack,
  ChallengeScore,
  decodePackFromHash,
  clearShareHash,
  importPack,
  computeChallengeScore,
} from './services/shareService';

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

  // ── Sharing / challenge links (#/s/... and #/c/...) ──
  const [sharedPack, setSharedPack] = useState<SharedPack | null>(null);
  const [shareTag, setShareTag] = useState<string | null>(null);
  const [onlineChallengeTag, setOnlineChallengeTag] = useState<string | null>(null);
  const [activeOnlineChallenge, setActiveOnlineChallenge] = useState<ChallengeDoc | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null);
  const [lastChallenge, setLastChallenge] = useState<{
    title: string;
    score: ChallengeScore;
    onlineChallengeId?: string;
  } | null>(null);

  const [myChallenges, setMyChallenges] = useState<ChallengeDoc[]>([]);

  // Subscribe to Firebase Auth for challenges
  useEffect(() => {
    const unsub = subscribeAuth((player) => {
      setCurrentPlayer(player);
    });
    return () => unsub();
  }, []);

  // Subscribe to user's created challenges when logged in with Google
  useEffect(() => {
    if (currentPlayer && !currentPlayer.isAnonymous) {
      const unsub = subscribeMyChallenges(currentPlayer.uid, (list) => {
        setMyChallenges(list);
      });
      return () => unsub();
    } else {
      setMyChallenges([]);
    }
  }, [currentPlayer]);

  // Listen to hash routes (#/s/... and #/c/CODE)
  useEffect(() => {
    const checkHash = async () => {
      const hash = window.location.hash;
      if (!hash) return;

      if (hash.startsWith('#/s/')) {
        try {
          const pack = decodePackFromHash(hash);
          if (pack) setSharedPack(pack);
        } catch (e) {
          addToast('error', '分享連結無法讀取', '連結可能不完整，請重新複製');
        }
        clearShareHash();
      } else if (hash.startsWith('#/c/')) {
        const code = hash.slice(4).trim().toUpperCase();
        if (code) {
          try {
            const ch = await getChallenge(code);
            if (ch) {
              setActiveOnlineChallenge(ch);
            } else {
              addToast('error', '找不到競賽', `查無競賽代碼「${code}」`);
            }
          } catch (e: any) {
            addToast('error', '讀取競賽失敗', e.message);
          }
        }
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleStartOnlineChallenge = (ch: ChallengeDoc) => {
    const { words: merged, wordIds, addedCount } = importChallengeWords(words, ch);
    replaceAllWords(merged);
    setActiveOnlineChallenge(null);
    setIsTestingActive(false);
    setActiveTab('test');

    if (addedCount > 0) {
      addToast('info', '題庫已載入', `已將 ${addedCount} 個競賽單字匯入至您的「${ch.tag}」標籤庫`);
    }

    handleStartRound({
      wordCount: wordIds.length,
      filterMode: 'all',
      wordIds,
      seed: ch.seed,
      challengeTitle: ch.title,
      challengeSlowMs: ch.slowMs,
      onlineChallengeId: ch.id,
      inputMode: 'keyboard',
      autoPlayAudio: true,
      showPhoneticHint: false,
      handwritingSelfGrade: false,
      chineseDelaySeconds: ch.chineseDelaySeconds,
    });
  };

  const handleOpenChallengeByPrompt = async () => {
    const code = prompt('請輸入 6 碼競賽邀請碼 (例: K7Q2XM)：');
    if (!code || !code.trim()) return;
    try {
      const ch = await getChallenge(code.trim().toUpperCase());
      if (ch) {
        setActiveOnlineChallenge(ch);
      } else {
        addToast('error', '查無競賽', `找不到代碼「${code.trim().toUpperCase()}」的競賽`);
      }
    } catch (err: any) {
      addToast('error', '查詢失敗', err.message);
    }
  };

  const handleImportPack = (pack: SharedPack, startChallenge: boolean) => {
    const { words: merged, packWordIds, addedCount } = importPack(words, pack);
    replaceAllWords(merged);
    setSharedPack(null);
    addToast('success', `已匯入「${pack.title}」`, `新增 ${addedCount} 個單字，共 ${packWordIds.length} 個加入標籤「${pack.tag}」`);
    if (startChallenge && pack.challenge) {
      setIsTestingActive(false);
      setActiveTab('test');
      handleStartRound({
        wordCount: packWordIds.length,
        filterMode: 'all',
        wordIds: packWordIds,
        seed: pack.challenge.seed,
        challengeTitle: pack.title,
        challengeSlowMs: pack.challenge.slowMs,
        inputMode: 'keyboard',
        autoPlayAudio: true,
        showPhoneticHint: false,
        handwritingSelfGrade: false,
        chineseDelaySeconds: pack.challenge.chineseDelaySeconds,
      });
    } else {
      setActiveTab('bank');
    }
  };

  // Start Test Round Handlers
  const handleStartRound = (config: RoundConfig) => {
    speechService.unlockIOSAudio();
    setRoundConfig(config);
    setIsTestingActive(true);
    setLastRoundSummary(null);
    setLastChallenge(null);
  };

  const handleFinishRound = async (summary: RoundSummary, updatedWords: WordItem[]) => {
    recordRound(summary, updatedWords);
    setLastRoundSummary(summary);
    setIsTestingActive(false);

    if (roundConfig?.seed !== undefined) {
      const score = computeChallengeScore(summary, {
        seed: roundConfig.seed,
        slowMs: roundConfig.challengeSlowMs ?? 15000,
        chineseDelaySeconds: roundConfig.chineseDelaySeconds,
      });

      setLastChallenge({
        title: roundConfig.challengeTitle || '挑戰',
        score,
        onlineChallengeId: roundConfig.onlineChallengeId,
      });

      // If this was an online challenge with Firestore leaderboard, upload the score
      if (roundConfig.onlineChallengeId) {
        try {
          const ch = await getChallenge(roundConfig.onlineChallengeId);
          if (ch) {
            const playerName = currentPlayer?.displayName || localStorage.getItem('speedvocab_player_name') || '挑戰者';
            await submitChallengeScore({
              code: roundConfig.onlineChallengeId,
              summary,
              challenge: ch,
              displayName: playerName,
            });
            addToast('success', '成績已登錄雲端排行榜！', `目前得分：${score.score} 分`);
          }
        } catch (err: any) {
          console.error(err);
          addToast('error', '排行榜上傳未完成', err.message);
        }
      }
    }

    addToast('success', '回合測驗完成！', '學習進度與反應時間已自動儲存至您的單字庫');
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

    speechService.unlockIOSAudio();
    setRoundConfig({
      wordCount: strugglingWords.length,
      filterMode: 'struggling',
      inputMode: settings.defaultInputMode || 'keyboard',
      autoPlayAudio: true,
      showPhoneticHint: false,
      handwritingSelfGrade: true,
      chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
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
      const errDetail = storageService.getLastSyncError();
      addToast('error', '同步異常', errDetail || '請確認網路連線或重新登入 Google');
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
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{
        background: 'var(--bg)',
        color: 'var(--text-1)',
        '--tw-ring-color': 'var(--accent)',
      } as React.CSSProperties}
    >
      {/* Debug Panel (floating 🐛 button — single tap opens logs, double tap enables recording) */}
      <DebugPanel />
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
                challenge={lastChallenge}
                onRetryStruggling={handleRetryStruggling}
                onStartNewRound={() => setIsSetupModalOpen(true)}
                onGoToBank={() => {
                  setLastRoundSummary(null);
                  setActiveTab('bank');
                }}
                onOpenLeaderboard={async (code) => {
                  try {
                    const ch = await getChallenge(code);
                    if (ch) setActiveOnlineChallenge(ch);
                  } catch (e: any) {
                    addToast('error', '讀取排行榜失敗', e.message);
                  }
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
                wordCount: filtered.length,
                filterMode: 'all',
                wordIds: filtered.map(w => w.id),
                inputMode: settings.defaultInputMode || 'keyboard',
                autoPlayAudio: true,
                showPhoneticHint: false,
                handwritingSelfGrade: true,
                chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
              });
              setActiveTab('test');
            }}
          />
        )}

        {activeTab === 'challenge' && (
          <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 px-4 py-8 animate-fade-in">
            <div className="text-center flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-sm">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">單字競賽排行榜</h2>
              <p className="text-sm text-slate-500 max-w-md">
                挑選特定標籤發起線上拼寫挑戰賽，好友輸入代碼即可在同個即時排行榜切磋！
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className="p-5 rounded-2xl border flex flex-col justify-between gap-4"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    發起新競賽
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    挑選你的單字庫標籤，自訂為期 1 週或無限制的線上競賽（需 Google 登入）
                  </p>
                </div>
                <button
                  onClick={() => setOnlineChallengeTag(stats.allTags[0] || '國小必備')}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all"
                  style={{ background: 'var(--accent)' }}
                >
                  發起標籤競賽
                </button>
              </div>

              <div
                className="p-5 rounded-2xl border flex flex-col justify-between gap-4"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    參加競賽 / 查看榜單
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    輸入好友給你的 6 碼代碼，即刻下載題目挑戰排位
                  </p>
                </div>
                <button
                  onClick={handleOpenChallengeByPrompt}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 transition-all hover:bg-slate-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }}
                >
                  輸入 6 碼代碼
                </button>
              </div>
            </div>

            {/* My Created Challenges Section */}
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  我發起的競賽列表
                  {myChallenges.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-normal text-slate-600">
                      {myChallenges.length}
                    </span>
                  )}
                </h3>
                {(!currentPlayer || currentPlayer.isAnonymous) ? (
                  <button
                    onClick={async () => {
                      try {
                        await loginWithGoogle();
                        addToast('success', 'Google 登入成功！');
                      } catch (err: any) {
                        addToast('error', '登入失敗', err.message);
                      }
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    登入 Google 查看我的競賽
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      已登入：<strong className="text-slate-800">{currentPlayer.displayName}</strong>
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await logoutFirebase();
                          addToast('info', '已登出 Google 帳號');
                        } catch (err: any) {
                          addToast('error', '登出失敗', err.message);
                        }
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      登出
                    </button>
                  </div>
                )}
              </div>

              {(!currentPlayer || currentPlayer.isAnonymous) ? (
                <div className="p-6 rounded-2xl border border-dashed text-center text-xs text-slate-500 bg-slate-50/50 flex flex-col items-center gap-2.5">
                  <p className="max-w-md">
                    {currentPlayer?.isAnonymous
                      ? `您目前是以「${currentPlayer.displayName}（匿名身分）」參賽。`
                      : '尚未登入 Google 帳號。'}
                    若要「發起新競賽」或「在不同裝置管理查看自己發起的競賽清單」，請先登入 Google 帳號。
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await loginWithGoogle();
                        addToast('success', 'Google 登入成功！');
                      } catch (err: any) {
                        addToast('error', '登入失敗', err.message);
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all"
                  >
                    立即使用 Google 帳號登入
                  </button>
                </div>
              ) : myChallenges.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed text-center text-xs text-slate-500 bg-slate-50/50">
                  您目前尚未發起過任何競賽。點擊上方「發起標籤競賽」即可開始！
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {myChallenges.map((ch) => {
                    const isExpired = ch.endsAt ? new Date().getTime() > new Date(ch.endsAt).getTime() : false;
                    return (
                      <div
                        key={ch.id}
                        onClick={() => setActiveOnlineChallenge(ch)}
                        className="p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-200 transition-all shadow-sm"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{ch.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {ch.id}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            標籤「{ch.tag}」・{ch.words.length} 個單字・
                            {ch.endsAt ? (isExpired ? '已截止' : `${new Date(ch.endsAt).toLocaleDateString()} 截止`) : '無截止日'}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 shrink-0"
                        >
                          查看排行榜
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
      <footer
        className="py-5 text-center text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }}
      >
        <span>SpeedVocab</span>
        <span className="mx-2" style={{ color: 'var(--border)' }}>·</span>
        <a
          href="./privacy.html"
          target="_blank"
          rel="noreferrer"
          className="transition-colors"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          隱私權政策
        </a>
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
        onStartTest={(newWords, importedTag) => {
          replaceAllWords(newWords);
          setIsBatchAddOpen(false);
          setActiveTab('test');
          // Use wordIds to precisely target the just-imported words
          const taggedWords = newWords.filter(w => w.tags.includes(importedTag));
          handleStartRound({
            wordCount: taggedWords.length || 999,
            filterMode: 'custom_tag',
            customTag: importedTag,
            wordIds: taggedWords.map(w => w.id),
            inputMode: settings.defaultInputMode || 'keyboard',
            autoPlayAudio: true,
            showPhoneticHint: false,
            handwritingSelfGrade: true,
            chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
          });
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

      <ShareTagModal
        isOpen={!!shareTag}
        onClose={() => setShareTag(null)}
        tag={shareTag || ''}
        words={words}
        settings={settings}
        onToast={addToast}
      />

      <SharedPackModal
        pack={sharedPack}
        onClose={() => setSharedPack(null)}
        onImport={handleImportPack}
      />

      <CreateOnlineChallengeModal
        isOpen={!!onlineChallengeTag}
        onClose={() => setOnlineChallengeTag(null)}
        tag={onlineChallengeTag || ''}
        allTags={stats.allTags}
        words={words}
        settings={settings}
        currentPlayer={currentPlayer}
        onToast={addToast}
        onChallengeCreated={async (code) => {
          setOnlineChallengeTag(null);
          const ch = await getChallenge(code);
          if (ch) setActiveOnlineChallenge(ch);
        }}
      />

      <ChallengeLobbyModal
        challenge={activeOnlineChallenge}
        isOpen={!!activeOnlineChallenge}
        onClose={() => setActiveOnlineChallenge(null)}
        currentPlayer={currentPlayer}
        onStartChallenge={handleStartOnlineChallenge}
        onToast={addToast}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
