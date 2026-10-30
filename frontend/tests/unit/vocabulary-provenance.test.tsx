import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { VocabularyProvenanceEditor } from '../../src/features/admin/VocabularyProvenanceEditor';
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/lib/api/client', () => ({ apiRequest: mock.request, isRequestCancelled: () => false }));
const evidence = { curriculumVersion: 'QA_ONLY', sourceVersion: 'fixture-v1', lexicalSourceRef: 'Fixture lexical source', meaningSourceRef: 'Fixture meaning source', hanVietSourceRef: 'Fixture reading source', exampleSourceRef: 'Fixture example source', hskLevel: 2 };
beforeEach(() => { mock.request.mockReset(); });

test('loads explicit provenance with accessible field labels and level', async () => {
  mock.request.mockResolvedValue({ success: true, data: { evidence } });
  render(<VocabularyProvenanceEditor id={9} label="QA fixture" onClose={() => {}} />);
  await screen.findByRole('button', { name: 'Lưu nguồn, giữ chờ duyệt' });
  expect((screen.getByLabelText('Nguồn nghĩa tiếng Việt') as HTMLInputElement).value).toBe(evidence.meaningSourceRef);
  expect((screen.getByLabelText(/Cấp tham chiếu nội bộ/) as HTMLInputElement).value).toBe('2');
});

test('failed save never claims publication or successful persistence', async () => {
  mock.request.mockImplementation((_url, options) => Promise.resolve(options.method === 'PUT' ? { success: false, message: 'QA network failure' } : { success: true, data: { evidence } }));
  render(<VocabularyProvenanceEditor id={9} label="QA fixture" onClose={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Lưu nguồn, giữ chờ duyệt' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('QA network failure'));
  expect(screen.queryByText(/Đã lưu nguồn/)).not.toBeInTheDocument();
});

test('source save is separate from approval and preserves the supplied level', async () => {
  mock.request.mockResolvedValue({ success: true, data: { evidence } });
  render(<VocabularyProvenanceEditor id={9} label="QA fixture" onClose={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Lưu nguồn, giữ chờ duyệt' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('nội dung vẫn chờ duyệt'));
  const write = mock.request.mock.calls.find(([, options]) => options.method === 'PUT');
  expect(JSON.parse(write![1].body).hskLevel).toBe(2);
  expect(mock.request.mock.calls.some(([url]) => url.includes('/approve'))).toBe(false);
});

test('editing other metadata preserves every existing web source and withheld optional field', async () => {
  const source = { provider: 'Fixture dictionary', dataFamily: 'CC_CEDICT', reference: 'https://www.mdbg.net/', entryId: 'fixture-only', subjectWord: 'QA_ONLY', subjectReading: 'qa', accessedAt: '2026-10-19T00:00:00Z', accessStatus: 'RETRIEVED', supports: ['WORD', 'READING', 'MEANING', 'PART_OF_SPEECH'], observation: 'Synthetic test evidence only', snapshotSha256: 'a'.repeat(64) };
  mock.request.mockResolvedValue({ success: true, data: { evidence: { ...evidence, verificationMethod: 'WEB_CROSS_CHECKED', verificationPolicyVersion: 'WEB_CROSS_CHECKED_2026_10_20_V1', sources: [source], publishHanViet: false, publishExamples: false } } });
  render(<VocabularyProvenanceEditor id={9} label="QA fixture" onClose={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Lưu nguồn, giữ chờ duyệt' }));
  await waitFor(() => expect(mock.request.mock.calls.some(([, options]) => options.method === 'PUT')).toBe(true));
  const write = mock.request.mock.calls.find(([, options]) => options.method === 'PUT');
  expect(JSON.parse(write![1].body)).toMatchObject({ sources: [source], publishHanViet: false, publishExamples: false });
});
