import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, PenTool, Trash2, CheckCircle2, XCircle, Eye } from 'lucide-react';

interface HandwritingInputProps {
  targetWord: string;
  onGradeSubmit: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export const HandwritingInput: React.FC<HandwritingInputProps> = ({
  targetWord,
  onGradeSubmit,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  // Clear and reset canvas when target word changes
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    clearCanvas();
    setIsRevealed(false);
  }, [targetWord, clearCanvas]);

  // Adjust canvas resolution for high-DPI displays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || isRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 20;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#818cf8'; // Indigo 400
      ctx.lineWidth = 4;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled || isRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleRevealAnswer = () => {
    setIsRevealed(true);
  };

  const handleGrade = (isCorrect: boolean) => {
    onGradeSubmit(isCorrect);
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Canvas Tool Bar */}
      <div className="flex items-center justify-between w-full max-w-lg px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              tool === 'pen'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>畫筆</span>
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              tool === 'eraser'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>橡皮擦</span>
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-slate-800 text-slate-400 hover:text-rose-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空</span>
          </button>
        </div>

        <span className="text-xs text-slate-500">
          {isRevealed ? '核對答案中' : '請在下方手寫單字'}
        </span>
      </div>

      {/* Canvas Drawing Area */}
      <div className="relative w-full max-w-lg h-48 sm:h-56 rounded-2xl border-2 border-slate-700/80 bg-slate-900/90 shadow-inner overflow-hidden touch-none">
        {/* Lined notebook guide lines */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-evenly opacity-15">
          <div className="border-b border-indigo-400 w-full" />
          <div className="border-b border-indigo-400 w-full border-dashed" />
          <div className="border-b border-indigo-400 w-full" />
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full cursor-crosshair relative z-10"
        />

        {!hasDrawn && !isRevealed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-600 text-sm font-medium">
            在此手寫英文單字...
          </div>
        )}

        {/* Revealed Answer Overlay */}
        {isRevealed && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 animate-pop">
            <span className="text-xs font-medium text-slate-400 mb-1">正確拼寫為：</span>
            <span className="text-3xl font-extrabold text-indigo-300 font-mono tracking-wider">
              {targetWord}
            </span>
          </div>
        )}
      </div>

      {/* Action / Self Grading Buttons */}
      <div className="w-full max-w-lg mt-1">
        {!isRevealed ? (
          <button
            onClick={handleRevealAnswer}
            disabled={!hasDrawn || disabled}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
          >
            <Eye className="w-5 h-5" />
            <span>完成書寫，顯示答案並評分</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3 animate-pop">
            <button
              onClick={() => handleGrade(false)}
              className="py-3 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-300 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>我拼錯了 (重練)</span>
            </button>

            <button
              onClick={() => handleGrade(true)}
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>我拼對了！</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
