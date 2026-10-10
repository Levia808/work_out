import { useEffect, useMemo, useState } from 'react';

type ReasoningTextProps = {
  phrases?: string[];
  interval?: number;
};

const DEFAULT_PHRASES = ['正在读取你的记录', '正在连接训练与作息', '正在整理关键变化', '正在生成可执行建议'];

export function ReasoningText({ phrases = DEFAULT_PHRASES, interval = 1800 }: ReasoningTextProps) {
  const safePhrases = useMemo(() => phrases.length ? phrases : DEFAULT_PHRASES, [phrases]);
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (reduced || safePhrases.length < 2) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % safePhrases.length), Math.max(900, interval));
    return () => window.clearInterval(timer);
  }, [interval, reduced, safePhrases.length]);

  const phrase = safePhrases[index % safePhrases.length];
  return <div className="reasoning-text" role="status" aria-live="polite">
    <span className="reasoning-loader" aria-hidden="true"><i /><i /><i /></span>
    <span className="reasoning-phrase" key={`${index}-${phrase}`}>{phrase}…</span>
    <span className="sr-only">{phrase}</span>
  </div>;
}
