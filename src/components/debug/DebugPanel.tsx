import React, { useState, useEffect, useCallback } from 'react';
import { dbg } from '../../utils/debugLogger';
import { X, Trash2, Bug } from 'lucide-react';

export const DebugPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState(dbg.getLogs());
  const [enabled, setEnabled] = useState(dbg.enabled);

  const refresh = useCallback(() => setLogs(dbg.getLogs()), []);

  useEffect(() => {
    dbg.subscribe(refresh);
    return () => dbg.unsubscribe(refresh);
  }, [refresh]);

  const toggleEnabled = () => {
    dbg.enabled = !dbg.enabled;
    setEnabled(dbg.enabled);
    if (dbg.enabled) dbg.info('Debug 模式已開啟');
  };

  return (
    <>
      {/* Floating toggle button — only visible in debug mode or when tapped */}
      <button
        onClick={() => { setOpen(o => !o); }}
        onDoubleClick={toggleEnabled}
        className={`fixed bottom-20 right-3 z-[9999] w-9 h-9 rounded-full flex items-center justify-center text-xs shadow-lg transition-all ${
          enabled ? 'bg-amber-500 text-black' : 'bg-slate-700/60 text-slate-400'
        }`}
        title="單擊開關面板 / 雙擊啟用Debug"
      >
        <Bug className="w-4 h-4" />
      </button>

      {/* Log panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[9998] h-64 bg-slate-950/97 border-t border-slate-700 flex flex-col text-[10px] font-mono">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 shrink-0">
            <span className="text-slate-300 font-bold text-xs">
              🐛 Debug Log {enabled ? '(記錄中)' : '(已停用 — 雙擊 🐛 啟用)'}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => dbg.clear()} className="text-slate-500 hover:text-rose-400 p-0.5" title="清除">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {/* Logs */}
          <div className="overflow-y-auto flex-1 px-2 py-1 space-y-0.5">
            {logs.length === 0
              ? <div className="text-slate-600 py-4 text-center">（無記錄）</div>
              : logs.map((l, i) => (
                <div key={i} className="flex gap-1.5 leading-tight">
                  <span className="text-slate-600 shrink-0">{l.time}</span>
                  <span style={{ color: l.color }}>{l.msg}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </>
  );
};
