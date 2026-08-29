import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, HelpCircle, SkipForward, ArrowLeft, CheckCircle2, XCircle, RotateCcw, Headphones, Eye } from 'lucide-react';
import { WordItem, RoundConfig, WordTestResult, RoundSummary, AppSettings, InputMode } from '../../types/vocabulary';
import { calculateSpacedRepetition, getSpeedCategory, isWordDueForReview } from '../../services/spacedRepetition';
import { useSpeech } from '../../hooks/useSpeech';
import { useAudioFx } from '../../hooks/useAudioFx';
import { SpeedGauge } from './SpeedGauge';
import { KeyboardInput } from './KeyboardInput';
import { HandwritingInput } from './HandwritingInput';
import { VoiceInput } from './VoiceInput';
import { normalizeWord } from '../../utils/textUtils';

interface TestingViewProps {
  config: RoundConfig;
  allWords: WordItem[];
  settings: AppSettings;
  onFinishRound: (summary: RoundSummary, updatedWords: WordItem[]) => void;
  onExit: () => void;
}

interface TestQueueItem {
  word: WordItem;
  isRetry: boolean;
  attemptNumber: number;
}

export const TestingView: React.FC<TestingViewProps> = ({
  config,
  allWords,
  settings,
  onFinishRound,
  onExit,
}) => {
  // Test queue: contains initial words plus dynamically appended struggling words
  const [queue, setQueue] = useState<TestQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalInitialCount, setTotalInitialCount] = useState<number>(0);
  const [results, setResults] = useState<WordTestResult[]>([]);
  const [updatedWordsMap, setUpdatedWordsMap] = useState<Map<string, WordItem>>(new Map());

  // Input method state (can be switched on the fly)
  const [currentInputMode, setCurrentInputMode] = useState<InputMode>(config.inputMode);

  // Timing state (high precision)
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const timerAnimationRef = useRef<number | null>(null);

  // Feedback state between words
  const [feedback, setFeedback] = useState<{
    show: boolean;
    isCorrect: boolean;
    timeMs: number;
    targetWord: string;
    translation: string;
    speedLabel: string;
    speedRating: string;
    isRetryQueued: boolean;
  } | null>(null);

  const [showHint, setShowHint] = useState<boolean>(false);
  const [isInputError, setIsInputError] = useState<boolean>(false);
  const [forceShowChinese, setForceShowChinese] = useState<boolean>(false);

  const roundStartedAtRef = useRef<string>(new Date().toISOString());

  const { speak, isSpeaking } = useSpeech(settings);
  const { playCorrect, playWrong, playFanfare } = useAudioFx(settings);

  // Initialize test queue based on config
  useEffect(() => {
    let candidateWords = [...allWords];

    // Apply filter mode
    if (config.filterMode === 'due') {
      candidateWords = candidateWords.filter(w => {
        if (!w.nextReviewAt) return true;
        return Date.now() >= new Date(w.nextReviewAt).getTime();
      });
      if (candidateWords.length === 0) candidateWords = [...allWords];
    } else if (config.filterMode === 'struggling') {
      candidateWords = candidateWords.filter(w => w.familiarity === 'struggling');
      if (candidateWords.length === 0) candidateWords = [...allWords];
    } else if (config.filterMode === 'new') {
      candidateWords = candidateWords.filter(w => w.familiarity === 'new');
      if (candidateWords.length === 0) candidateWords = [...allWords];
    } else if (config.filterMode === 'elementary') {
      candidateWords = candidateWords.filter(w => w.tags.includes('國小必備'));
    } else if (config.filterMode === 'junior_high') {
      candidateWords = candidateWords.filter(w => w.tags.includes('國中核心'));
    } else if (config.filterMode === 'custom_tag' && config.customTag) {
      candidateWords = candidateWords.filter(w => w.tags.includes(config.customTag!));
    }

    // Prioritized Intelligent Sampling:
    // 1. Due words (need review according to SM-2 interval)
    // 2. Struggling words (error / latency > slow threshold)
    // 3. New words (never practiced)
    // 4. Learning words
    // 5. Familiar / Mastered words
    const dueList = candidateWords.filter(w => isWordDueForReview(w)).sort(() => Math.random() - 0.5);
    const dueIds = new Set(dueList.map(w => w.id));

    const strugglingList = candidateWords
      .filter(w => w.familiarity === 'struggling' && !dueIds.has(w.id))
      .sort(() => Math.random() - 0.5);
    const strugglingIds = new Set(strugglingList.map(w => w.id));

    const newList = candidateWords
      .filter(w => w.familiarity === 'new' && !dueIds.has(w.id) && !strugglingIds.has(w.id))
      .sort(() => Math.random() - 0.5);
    const newIds = new Set(newList.map(w => w.id));

    const learningList = candidateWords
      .filter(w => w.familiarity === 'learning' && !dueIds.has(w.id) && !strugglingIds.has(w.id) && !newIds.has(w.id))
      .sort(() => Math.random() - 0.5);
    const learningIds = new Set(learningList.map(w => w.id));

    const familiarList = candidateWords
      .filter(w => !dueIds.has(w.id) && !strugglingIds.has(w.id) && !newIds.has(w.id) && !learningIds.has(w.id))
      .sort(() => Math.random() - 0.5);

    const prioritizedCandidates = [
      ...dueList,
      ...strugglingList,
      ...newList,
      ...learningList,
      ...familiarList,
    ];

    const selected = prioritizedCandidates.slice(0, Math.min(prioritizedCandidates.length, config.wordCount));

    const initialQueue: TestQueueItem[] = selected.map(word => ({
      word,
      isRetry: false,
      attemptNumber: 1,
    }));

    setQueue(initialQueue);
    setTotalInitialCount(initialQueue.length);
    setCurrentIndex(0);
    roundStartedAtRef.current = new Date().toISOString();
  }, [config, allWords]);

  const currentItem = queue[currentIndex];
  const currentWord = currentItem?.word;

  // Stopwatch timer ticker using requestAnimationFrame for smooth millisecond updates
  const startStopwatch = useCallback(() => {
    startTimeRef.current = performance.now();

    const updateTimer = () => {
      const current = performance.now();
      setElapsedMs(Math.round(current - startTimeRef.current));
      timerAnimationRef.current = requestAnimationFrame(updateTimer);
    };

    if (timerAnimationRef.current) {
      cancelAnimationFrame(timerAnimationRef.current);
    }
    timerAnimationRef.current = requestAnimationFrame(updateTimer);
  }, []);

  const stopStopwatch = useCallback((): number => {
    if (timerAnimationRef.current) {
      cancelAnimationFrame(timerAnimationRef.current);
      timerAnimationRef.current = null;
    }
    const finalElapsed = Math.round(performance.now() - startTimeRef.current);
    setElapsedMs(finalElapsed);
    return finalElapsed;
  }, []);

  // When new word comes up in queue
  useEffect(() => {
    if (!currentWord) return;

    setShowHint(false);
    setIsInputError(false);
    setForceShowChinese(false);
    setFeedback(null);
    setElapsedMs(0);

    // Auto play audio pronunciation if configured
    if (config.autoPlayAudio) {
      speak(currentWord.word);
    }

    // Start precision timer
    startStopwatch();

    return () => {
      if (timerAnimationRef.current) {
        cancelAnimationFrame(timerAnimationRef.current);
      }
    };
  }, [currentIndex, currentWord, config.autoPlayAudio, speak, startStopwatch]);

  // Handle Hotkeys (Space for Audio, Esc for Skip, Ctrl+H for Hint)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (feedback?.show) return;

      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (currentWord) speak(currentWord.word);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowHint(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWord, feedback, speak]);

  // Process submission
  const handleAnswerSubmit = (isCorrect: boolean, userTyped?: string) => {
    if (!currentWord || feedback?.show) return;

    const timeSpentMs = stopStopwatch();
    const speedCat = getSpeedCategory(timeSpentMs, settings);

    // SM-2 Spaced repetition & familiarity calculation
    const baseWord = updatedWordsMap.get(currentWord.id) || currentWord;
    const sm2Result = calculateSpacedRepetition(baseWord, isCorrect, timeSpentMs, settings);

    // Sound effect
    if (isCorrect) {
      playCorrect(speedCat.rating === 'lightning' ? 'fast' : speedCat.rating === 'good' ? 'normal' : 'slow');
    } else {
      playWrong();
      setIsInputError(true);
    }

    // Determine if dynamic review queue should re-append this word
    const isSlow = timeSpentMs > settings.speedThresholds.slowMs;
    const shouldRequeue = !isCorrect || isSlow;

    if (shouldRequeue) {
      setQueue(prev => [
        ...prev,
        {
          word: sm2Result.updatedWord,
          isRetry: true,
          attemptNumber: currentItem.attemptNumber + 1,
        },
      ]);
    }

    // Save updated word in map
    setUpdatedWordsMap(prev => {
      const next = new Map(prev);
      next.set(currentWord.id, sm2Result.updatedWord);
      return next;
    });

    // Record test result
    const testResult: WordTestResult = {
      wordId: currentWord.id,
      word: currentWord.word,
      translation: currentWord.translation,
      isCorrect,
      responseTimeMs: timeSpentMs,
      inputMethod: currentInputMode,
      userTyped,
      previousFamiliarity: sm2Result.previousFamiliarity,
      newFamiliarity: sm2Result.newFamiliarity,
      isRetry: currentItem.isRetry,
      timestamp: new Date().toISOString(),
    };

    setResults(prev => [...prev, testResult]);

    // Show instant feedback card
    setFeedback({
      show: true,
      isCorrect,
      timeMs: timeSpentMs,
      targetWord: currentWord.word,
      translation: currentWord.translation,
      speedLabel: speedCat.label,
      speedRating: speedCat.rating,
      isRetryQueued: shouldRequeue,
    });

    // Delay before transitioning to next question
    const delayTime = isCorrect ? (speedCat.rating === 'lightning' ? 900 : 1200) : 2200;

    setTimeout(() => {
      advanceToNextQuestion();
    }, delayTime);
  };

  const handleKeyboardSubmit = (typed: string) => {
    const isCorrect = normalizeWord(typed) === normalizeWord(currentWord.word);
    handleAnswerSubmit(isCorrect, typed);
  };

  const handleHandwritingGrade = (isCorrect: boolean) => {
    handleAnswerSubmit(isCorrect, '[手寫評分]');
  };

  const handleVoiceSubmit = (spelled: string) => {
    const isCorrect = normalizeWord(spelled) === normalizeWord(currentWord.word);
    handleAnswerSubmit(isCorrect, spelled);
  };

  const handleSkip = () => {
    handleAnswerSubmit(false, '[跳過/放棄]');
  };

  const advanceToNextQuestion = () => {
    if (currentIndex + 1 < queue.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Round Complete!
      finishRound();
    }
  };

  const finishRound = () => {
    if (timerAnimationRef.current) {
      cancelAnimationFrame(timerAnimationRef.current);
    }

    playFanfare();

    const endedAt = new Date().toISOString();
    const totalTested = results.length;
    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracyRate = totalTested > 0 ? Math.round((correctCount / totalTested) * 100) : 0;
    
    let totalTime = 0;
    let fastestTime: number | null = null;
    const uniqueWordIds = new Set<string>();
    const strugglingIds = new Set<string>();
    const masteredIds = new Set<string>();

    results.forEach(r => {
      uniqueWordIds.add(r.wordId);
      totalTime += r.responseTimeMs;
      if (r.isCorrect) {
        if (fastestTime === null || r.responseTimeMs < fastestTime) {
          fastestTime = r.responseTimeMs;
        }
      }
      if (!r.isCorrect || r.responseTimeMs > settings.speedThresholds.slowMs) {
        strugglingIds.add(r.wordId);
      }
      if (r.newFamiliarity === 'mastered') {
        masteredIds.add(r.wordId);
      }
    });

    const averageTimeMs = totalTested > 0 ? Math.round(totalTime / totalTested) : 0;

    const summary: RoundSummary = {
      id: 'round_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
      startedAt: roundStartedAtRef.current,
      endedAt,
      totalTested,
      totalUniqueWords: uniqueWordIds.size,
      correctCount,
      accuracyRate,
      averageTimeMs,
      fastestTimeMs: fastestTime,
      results,
      strugglingWordIds: Array.from(strugglingIds),
      masteredWordIds: Array.from(masteredIds),
    };

    onFinishRound(summary, Array.from(updatedWordsMap.values()));
  };

  if (!currentWord) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        正在準備測驗題目...
      </div>
    );
  }

  // Progress calculations
  const progressPercent = Math.min(100, Math.round(((currentIndex) / Math.max(1, queue.length)) * 100));

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 px-4 py-3 sm:py-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>退出回合</span>
        </button>

        {/* Dynamic Queue Badge */}
        <div className="flex items-center gap-2">
          {currentItem.isRetry && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 animate-pulse">
              <RotateCcw className="w-3 h-3" />
              <span>複習重測中</span>
            </span>
          )}

          <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            第 <span className="text-indigo-400 font-mono text-sm">{currentIndex + 1}</span> / {queue.length} 題
            {queue.length > totalInitialCount && (
              <span className="text-amber-400/90 text-[11px] ml-1.5">
                (含複習 +{queue.length - totalInitialCount})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Round Progress Bar */}
      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Speed Gauge & Stopwatch */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg">
        <SpeedGauge elapsedMs={elapsedMs} settings={settings} />
      </div>

      {/* Main Prompt Card */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl flex flex-col items-center text-center gap-3">
        {/* Category Tags */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {currentWord.pos && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-mono font-semibold">
              {currentWord.pos}
            </span>
          )}
          {(currentWord.tags || []).slice(0, 2).map((tag, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs">
              {tag}
            </span>
          ))}
        </div>

        {/* Visual Prompt: Chinese Translation vs. Listening Delay Card */}
        {(() => {
          const chineseDelaySec = config.chineseDelaySeconds ?? settings.chineseDelaySeconds ?? 10;
          const delayRemainingSec = Math.max(0, Math.ceil(chineseDelaySec - elapsedMs / 1000));
          const isChineseRevealed = forceShowChinese || delayRemainingSec === 0 || chineseDelaySec === 0;

          if (isChineseRevealed) {
            return (
              <div className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-wide my-1 transition-all duration-300 animate-fade-in">
                {currentWord.translation}
              </div>
            );
          }

          return (
            <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-center gap-1.5 my-1 w-full max-w-sm">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <Headphones className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>聽音拼寫挑戰中...</span>
                <span className="font-mono bg-indigo-900/80 px-2 py-0.5 rounded-lg border border-indigo-400/40 text-indigo-200 text-xs">
                  {delayRemainingSec}s
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                前 {chineseDelaySec} 秒聽音拼寫，倒數結束後自動顯示中文釋義
              </div>
              <button
                type="button"
                onClick={() => setForceShowChinese(true)}
                className="text-[11px] text-slate-400 hover:text-indigo-300 underline mt-0.5 flex items-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>提前顯示中文釋義</span>
              </button>
            </div>
          );
        })()}

        {/* Audio Pronunciation Button */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => speak(currentWord.word)}
            disabled={isSpeaking}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold transition-all transform active:scale-95"
            title="播放發音 (快速鍵：空白鍵)"
          >
            <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce text-indigo-400' : ''}`} />
            <span>{isSpeaking ? '播放中...' : '聆聽發音 (Space)'}</span>
          </button>
        </div>

        {/* Phonetic Hint / Example Prompt */}
        {config.showPhoneticHint && currentWord.phonetic && (
          <div className="text-xs font-mono text-slate-400 bg-slate-800/50 px-3 py-1 rounded-lg">
            音標：{currentWord.phonetic}
          </div>
        )}

        {showHint && currentWord.exampleZh && (
          <div className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl animate-fade-in mt-1">
            提示例句：{currentWord.exampleZh}
          </div>
        )}

        {/* Instant Result Feedback Overlay Banner */}
        {feedback?.show && (
          <div
            className={`absolute inset-0 rounded-3xl backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 animate-pop ${
              feedback.isCorrect
                ? 'bg-slate-950/90 border-2 border-emerald-500/50'
                : 'bg-slate-950/90 border-2 border-rose-500/50'
            }`}
          >
            {feedback.isCorrect ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
                <span className="text-3xl font-extrabold text-white font-mono tracking-wider">
                  {feedback.targetWord}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm">
                    {feedback.speedLabel}
                  </span>
                  <span className="text-slate-300 font-mono text-sm">
                    {(feedback.timeMs / 1000).toFixed(2)} 秒
                  </span>
                </div>
                {feedback.isRetryQueued && (
                  <span className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    反應略顯生疏，已安排在稍後再次複習
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <XCircle className="w-14 h-14 text-rose-400 animate-shake" />
                <div className="text-xs font-semibold text-rose-300">拼寫錯誤 / 放棄</div>
                <div className="text-3xl font-extrabold text-white font-mono tracking-wider mt-1">
                  {feedback.targetWord}
                </div>
                <div className="text-sm text-slate-400">{feedback.translation}</div>
                <span className="text-xs text-rose-300/90 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30 mt-2 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  已自動加入本回合複習池！
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Method Switcher Bar */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-slate-500">切換模式：</span>
        <button
          onClick={() => setCurrentInputMode('keyboard')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            currentInputMode === 'keyboard'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          鍵盤打字
        </button>
        <button
          onClick={() => setCurrentInputMode('handwriting')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            currentInputMode === 'handwriting'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          手寫繪圖
        </button>
        <button
          onClick={() => setCurrentInputMode('voice')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            currentInputMode === 'voice'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          語音拼讀
        </button>
      </div>

      {/* Input Area */}
      <div className="w-full">
        {currentInputMode === 'keyboard' && (
          <KeyboardInput
            targetWord={currentWord.word}
            onSubmit={handleKeyboardSubmit}
            disabled={feedback?.show}
            isError={isInputError}
          />
        )}

        {currentInputMode === 'handwriting' && (
          <HandwritingInput
            targetWord={currentWord.word}
            onGradeSubmit={handleHandwritingGrade}
            disabled={feedback?.show}
          />
        )}

        {currentInputMode === 'voice' && (
          <VoiceInput
            targetWord={currentWord.word}
            onSubmit={handleVoiceSubmit}
            disabled={feedback?.show}
          />
        )}
      </div>

      {/* Action Footer: Hint & Skip buttons */}
      <div className="flex items-center justify-between pt-2 px-2 text-xs">
        <button
          onClick={() => setShowHint(true)}
          disabled={showHint || feedback?.show}
          className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 disabled:opacity-30 transition-colors"
          title="顯示提示 (Ctrl+H)"
        >
          <HelpCircle className="w-4 h-4" />
          <span>提示例句 (Ctrl+H)</span>
        </button>

        <button
          onClick={handleSkip}
          disabled={feedback?.show}
          className="flex items-center gap-1.5 text-slate-400 hover:text-rose-300 transition-colors"
          title="放棄這題，加入複習池 (Esc)"
        >
          <SkipForward className="w-4 h-4" />
          <span>跳過/放棄 (Esc)</span>
        </button>
      </div>
    </div>
  );
};
