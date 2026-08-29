export function normalizeWord(word: string): string {
  return word.toLowerCase().trim().replace(/[^a-z0-9\-']/g, '');
}

export function cleanPunctuation(str: string): string {
  return str.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase().trim();
}

/**
 * Familiarity badge metadata
 */
export function getFamiliarityBadge(familiarity: string): {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description: string;
} {
  switch (familiarity) {
    case 'mastered':
      return {
        label: '精通',
        bgColor: 'bg-amber-500/15',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
        description: '極速正確，複習間隔大幅拉長',
      };
    case 'familiar':
      return {
        label: '熟練',
        bgColor: 'bg-emerald-500/15',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
        description: '反應迅速且穩定',
      };
    case 'learning':
      return {
        label: '學習中',
        bgColor: 'bg-blue-500/15',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        description: '需加強反應速度',
      };
    case 'struggling':
      return {
        label: '生疏',
        bgColor: 'bg-rose-500/15',
        textColor: 'text-rose-400',
        borderColor: 'border-rose-500/30',
        description: '常超時或拼錯，將優先複習',
      };
    case 'new':
    default:
      return {
        label: '新單字',
        bgColor: 'bg-slate-700/40',
        textColor: 'text-slate-300',
        borderColor: 'border-slate-600/40',
        description: '尚未進行反應時間測驗',
      };
  }
}
