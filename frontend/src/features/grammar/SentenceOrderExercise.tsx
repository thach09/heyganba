import { useState } from 'react';

export function SentenceOrderExercise({ tokens, disabled, onSubmit }: { tokens: string[]; disabled: boolean; onSubmit: (answer: string) => void }) {
  const [order, setOrder] = useState<number[]>([]);
  return <div className="mt-5 space-y-4">
    <p className="text-sm text-fg-60">连词成句 · Chọn từ theo thứ tự. Bấm từ trong câu để bỏ chọn.</p>
    <div aria-label="Câu đã sắp xếp" className="flex min-h-16 flex-wrap gap-2 border border-rule p-3">
      {order.map((id) => <button key={id} type="button" disabled={disabled} onClick={() => setOrder(order.filter(i => i !== id))} className="border border-jade bg-jade/10 px-3 py-2 font-serif text-lg text-fg">{tokens[id]}</button>)}
    </div>
    <div aria-label="Các từ cần sắp xếp" className="flex flex-wrap gap-2">
      {tokens.map((token, id) => <button key={id} type="button" disabled={disabled || order.includes(id)} onClick={() => setOrder([...order, id])} className="border border-rule-strong px-3 py-2 font-serif text-lg text-fg disabled:opacity-40">{token}</button>)}
    </div>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={disabled || order.length !== tokens.length} onClick={() => onSubmit(order.map(id => tokens[id]).join(''))} className="border border-jade bg-jade px-4 py-2 text-on-accent disabled:opacity-40">Chấm câu</button>
      <button type="button" disabled={disabled || !order.length} onClick={() => setOrder([])} className="border border-rule-strong px-4 py-2 text-fg">Xếp lại</button>
    </div>
  </div>;
}
