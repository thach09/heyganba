import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api/client';
import { useRequestScope } from '../../lib/hooks/useRequestScope';

type TextField = 'curriculumVersion' | 'sourceVersion' | 'lexicalSourceRef' | 'meaningSourceRef' | 'hanVietSourceRef' | 'exampleSourceRef';
type Source = { provider: string; dataFamily: string; reference: string; entryId: string; subjectWord: string; subjectReading: string; accessedAt: string; accessStatus: string; supports: string[]; observation: string };
type Evidence = Record<TextField, string> & { hskLevel: number | null; verificationMethod: string; verificationPolicyVersion: string; sources: Source[]; publishHanViet: boolean; publishExamples: boolean };
type Snapshot = { evidence: Partial<Evidence>; completeForCurrentContent: boolean };
const fields: [TextField, string][] = [
  ['curriculumVersion', 'Phiên bản giáo trình (giữ nhãn nội bộ nếu chưa đối chiếu)'],
  ['sourceVersion', 'Phiên bản tài liệu nguồn'], ['lexicalSourceRef', 'Nguồn chữ Hán, Pinyin và cấp'],
  ['meaningSourceRef', 'Nguồn nghĩa tiếng Việt'], ['hanVietSourceRef', 'Nguồn Hán Việt (nếu có nội dung)'],
  ['exampleSourceRef', 'Nguồn câu ví dụ và bản dịch (nếu có nội dung)'],
];
const coreFields = ['WORD', 'READING', 'MEANING', 'PART_OF_SPEECH'];
const newSource = (word: string): Source => ({ provider: '', dataFamily: 'CC_CEDICT', reference: '', entryId: '', subjectWord: word, subjectReading: '', accessedAt: '', accessStatus: 'UNAVAILABLE', supports: [], observation: '' });
const empty: Evidence = { curriculumVersion: '', sourceVersion: '', lexicalSourceRef: '', meaningSourceRef: '', hanVietSourceRef: '', exampleSourceRef: '', hskLevel: null, verificationMethod: 'WEB_CROSS_CHECKED', verificationPolicyVersion: 'WEB_CROSS_CHECKED_2026_10_20_V1', sources: [], publishHanViet: false, publishExamples: false };

export function VocabularyProvenanceEditor({ id, label, onClose }: { id: number; label: string; onClose: () => void }) {
  const { run } = useRequestScope();
  const [evidence, setEvidence] = useState<Evidence>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    void run('provenance-load', signal => apiRequest<Snapshot>(`/admin/vocabulary/${id}/provenance`, { signal })).then(res => {
      if (!res) return;
      if (res.success) setEvidence({ ...empty, ...res.data.evidence, ...Object.fromEntries(fields.map(([key]) => [key, res.data.evidence[key] ?? ''])) as Record<TextField, string>, sources: res.data.evidence.sources?.length ? res.data.evidence.sources : [newSource(label), newSource(label)], hskLevel: res.data.evidence.hskLevel ?? null, verificationMethod: 'WEB_CROSS_CHECKED', verificationPolicyVersion: empty.verificationPolicyVersion });
      else setMessage(res.message || 'Không tải được thông tin nguồn.');
      setLoading(false);
    });
  }, [id, label, run]);
  const updateSource = (index: number, patch: Partial<Source>) => setEvidence(previous => ({ ...previous, sources: previous.sources.map((source, i) => i === index ? { ...source, ...patch } : source) }));
  return <section className="border border-rule bg-card p-5" aria-labelledby="provenance-title">
    <div className="flex items-start justify-between gap-4">
      <h3 ref={titleRef} tabIndex={-1} id="provenance-title" className="scroll-mt-20 text-[16px] font-semibold text-fg">Ghi nguồn: {label}</h3>
      <button type="button" onClick={onClose} className="text-[12.5px] text-fg-60 underline">Đóng</button>
    </div>
    <p className="mt-2 text-[12.5px] leading-relaxed text-fg-60">Đối chiếu hai nguồn từ điển độc lập; nghĩa Việt có thể được biên soạn từ định nghĩa đã kiểm tra. Syllabus chỉ xác nhận cấp. Lưu nguồn vẫn giữ chờ duyệt, không phải xác nhận của giáo viên.</p>
    {loading ? <p role="status">Đang tải nguồn...</p> : <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={async event => {
      event.preventDefault(); setSaving(true); setMessage('');
      const res = await run('provenance-save', signal => apiRequest<Snapshot>(`/admin/vocabulary/${id}/provenance`, { method: 'PUT', signal, body: JSON.stringify(evidence) }));
      setSaving(false);
      if (!res) return;
      setMessage(res.success ? 'Đã lưu nguồn, nội dung vẫn chờ duyệt. Kiểm tra nội dung rồi dùng nút Duyệt riêng.' : res.message || 'Chưa lưu được nguồn.');
    }}>
      {fields.map(([key, title], index) => <div key={key}>
        <label htmlFor={`provenance-${key}`} className="text-[12.5px] text-fg-60">{title}</label>
        <input id={`provenance-${key}`} required={index < 4} maxLength={index < 2 ? 100 : 2000} value={evidence[key]}
          onChange={event => setEvidence(previous => ({ ...previous, [key]: event.target.value }))}
          className="mt-1 w-full border border-rule-strong bg-bg px-3 py-2 text-[13px] text-fg" />
      </div>)}
      <div>
        <label htmlFor="provenance-level" className="text-[12.5px] text-fg-60">Cấp tham chiếu nội bộ (1–6; bỏ trống nếu chưa phân cấp)</label>
        <input id="provenance-level" type="number" min={1} max={6} step={1} value={evidence.hskLevel ?? ''}
          onChange={event => setEvidence(previous => ({ ...previous, hskLevel: event.target.value === '' ? null : Number(event.target.value) }))}
          className="mt-1 w-full border border-rule-strong bg-bg px-3 py-2 text-[13px] text-fg" />
      </div>
      <details className="md:col-span-2 text-[12.5px] text-fg">
        <summary className="cursor-pointer">Bằng chứng web ({evidence.sources.length} nguồn)</summary>
        {evidence.sources.map((source, index) => <fieldset key={index} className="mt-4 grid gap-3 border border-rule p-3 md:grid-cols-2">
          <legend>Nguồn {index + 1}</legend>
          {(['provider', 'reference', 'entryId', 'subjectWord', 'subjectReading', 'observation'] as const).map((key, fieldIndex) => <label key={key}>
            {['Nhà cung cấp', 'URL trang hoặc bộ dữ liệu', 'Định danh mục từ', 'Chữ được nguồn xác nhận', 'Pinyin được nguồn xác nhận', 'Kết luận nghĩa và cách dùng'][fieldIndex]}
            <input value={source[key] ?? ''} maxLength={2000} onChange={event => updateSource(index, { [key]: event.target.value })} className="mt-1 w-full border border-rule-strong bg-bg px-3 py-2" />
          </label>)}
          <label>Nguồn gốc dữ liệu
            <select value={source.dataFamily} onChange={event => updateSource(index, { dataFamily: event.target.value })} className="mt-1 w-full border border-rule-strong bg-bg px-3 py-2">
              {['CC_CEDICT', 'TAIWAN_MOE', 'CAMBRIDGE', 'COLLINS', 'WIKTIONARY', 'ZDIC_OWN', 'CTI_HSK_SYLLABUS'].map(family => <option key={family}>{family}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={source.accessStatus === 'RETRIEVED'} onChange={event => updateSource(index, { accessStatus: event.target.checked ? 'RETRIEVED' : 'UNAVAILABLE', accessedAt: event.target.checked ? new Date().toISOString() : '' })} />Đã truy cập và đọc mục từ</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={coreFields.every(field => source.supports.includes(field))} onChange={event => updateSource(index, { supports: event.target.checked ? [...new Set([...source.supports, ...coreFields])] : source.supports.filter(field => !coreFields.includes(field)) })} />Đã xác nhận chữ, cách đọc, nghĩa và loại từ</label>
          {source.dataFamily === 'CTI_HSK_SYLLABUS' && <label className="flex items-center gap-2"><input type="checkbox" checked={source.supports.includes('HSK_LEVEL')} onChange={event => updateSource(index, { supports: event.target.checked ? ['HSK_LEVEL'] : [] })} />Đã xác nhận cấp trong syllabus</label>}
        </fieldset>)}
        <button type="button" disabled={evidence.sources.length >= 8} onClick={() => setEvidence(previous => ({ ...previous, sources: [...previous.sources, newSource(label)] }))} className="mt-3 border border-rule px-3 py-2">Thêm nguồn</button>
        <p className="mt-3 text-fg-60">Hán Việt và ví dụ chưa đủ nguồn được giữ riêng, không hiện cho học viên. Nguồn từ hai website cùng dùng CC-CEDICT chỉ được tính một lần.</p>
      </details>
      <button disabled={saving} type="submit" className="border border-rule-strong px-4 py-2 text-[12.5px] text-fg">{saving ? 'Đang lưu...' : 'Lưu nguồn, giữ chờ duyệt'}</button>
    </form>}
    {message && <p role="status" className="mt-3 text-[12.5px] leading-relaxed text-fg">{message}</p>}
  </section>;
}
