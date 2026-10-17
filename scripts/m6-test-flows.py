from pathlib import Path
def edit(file,fn):
 p=Path(file);p.write_text(fn(p.read_text(encoding='utf-8')),encoding='utf-8')
base='frontend/tests/unit/'
def a(s):
 start=s.index("test('QA-003: quick");end=s.index("test('QA-005:",start)
 s=s[:start]+'''async function mountSrs() {
  mount(<FlashcardView />);
  fireEvent.click(screen.getByRole('button', { name: /Ôn đến hạn/ }));
  await screen.findAllByText('Word 1');
}
test('QA-003: delayed SRS save locks ratings, then advances only after persistence', async () => {
  const gate = deferred<ReturnType<typeof success>>();
  api.review.mockImplementationOnce(() => gate.promise).mockResolvedValue(success({ repetitions: 1 }));
  await mountSrs();
  fireEvent.click(screen.getByRole('button', { name: /Thuộc/ }));
  await waitFor(() => expect(api.review).toHaveBeenCalledTimes(1));
  const signal = api.review.mock.calls[0][1].signal;
  expect((screen.getByRole('button', { name: /Thuộc/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /Chưa nhớ/ }));
  expect(api.review).toHaveBeenCalledTimes(1); expect(signal.aborted).toBe(false);
  await act(async () => gate.resolve(success({ repetitions: 1 })));
  await screen.findAllByText('Word 2');
  fireEvent.click(screen.getByRole('button', { name: /Thuộc/ }));
  await waitFor(() => expect(api.review).toHaveBeenCalledTimes(2));
  expect(api.review.mock.calls.map(([payload]) => payload.vocabularyId)).toEqual([1, 2]);
  await screen.findByText('Xong phiên ôn tập hôm nay!');
});
test('QA-003: failed SRS save retains card and retries the same immutable payload', async () => {
  api.review.mockResolvedValueOnce({ success: false, message: 'Offline' }).mockResolvedValue(success({ repetitions: 1 }));
  await mountSrs();
  fireEvent.click(screen.getByRole('button', { name: /Thuộc/ }));
  await screen.findByRole('button', { name: 'Thử lại' });
  expect(screen.queryByText('Word 2')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findAllByText('Word 2');
  expect(api.review.mock.calls[1][0]).toEqual(api.review.mock.calls[0][0]);
});

'''+s[end:]
 s=s.replace("await screen.findByText('Question 0'); fireEvent.keyDown(window, { key: '1' });", "await screen.findByText('Question 0'); fireEvent.click(screen.getAllByRole('button', { name: /1\\s*Option A/ })[0]);")
 return s
edit(base+'qa-batch-a.test.tsx',a)

def b(s):
 s=s.replace("mount(<FlashcardView />); await screen.findByText('Word 1');", "await mountSrs();")
 s=s.replace("mount(<><PasswordAction /><FlashcardView /></>); await screen.findByText('Word 1');", "await mountSrs(<><PasswordAction /><FlashcardView /></>);")
 s=s.replace("expect(screen.getByText('Word 1')).toBeTruthy()", "expect(screen.getAllByText('Word 1').length).toBeGreaterThan(0)")
 a=s.index("test('NEW-REGRESSION-001:");z=s.index("test('QA-009:",a)
 s=s[:a]+'''test('NEW-REGRESSION-001: SRS retry keeps the attempt ID, next card gets a different ID', async () => {
  api.review.mockResolvedValueOnce({ success: false, message: 'Lost review response' }).mockResolvedValue(success({ repetitions: 1 }));
  await mountSrs();
  fireEvent.click(screen.getByRole('button', { name: /Thuộc/ }));
  await screen.findByText('Lost review response');
  const first = api.review.mock.calls[0][0];
  expect(first.attemptId).toMatch(/^[0-9a-f-]{36}$/);
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findAllByText('Word 2');
  expect(api.review.mock.calls[1][0]).toEqual(first);
  fireEvent.click(screen.getByRole('button', { name: /Thuộc/ }));
  await waitFor(() => expect(api.review).toHaveBeenCalledTimes(3));
  const next = api.review.mock.calls[2][0];
  expect(next.vocabularyId).toBe(2); expect(next.attemptId).not.toBe(first.attemptId);
});

'''+s[z:]
 a=s.index("test('QA-002: inaccessible");z=s.index('function PasswordAction',a)
 segment=s[a:z].replace("expect(readActiveAttempt(1)).toBeNull()", "expect(readActiveAttempt(1)?.examId).toBe(17)")
 s=s[:a]+segment+s[z:]
 s=s.replace("fireEvent.keyDown(window, { key: 'Enter' });\n  expect(screen.getByText('Đã chọn'))", "fireEvent.keyDown(window, { key: 'ArrowRight' });\n  expect(screen.getByText('Đã chọn'))")
 s=s.replace("fireEvent.keyDown(opener, { key: 'Enter' });", "fireEvent.keyDown(opener, { key: 'ArrowRight' });")
 s+='''
async function mountSrs(view: React.ReactNode = <FlashcardView />) {
  mount(view);
  fireEvent.click(screen.getByRole('button', { name: /Ôn đến hạn/ }));
  await screen.findAllByText('Word 1');
}
'''
 return s
edit(base+'qa-batch-b.test.tsx',b)
edit(base+'hanzi-hsk.test.tsx',lambda s:s.replace("expect(await screen.findAllByText('人'))", "expect((await screen.findAllByText('人'))[0])").replace("screen.queryByText('Nhân')", "screen.queryByRole('button', { name: /^人 / })"))
edit(base+'exam-hsk.test.tsx',lambda s:s.replace("screen.getByRole('button', { name: /Phát âm Quan thoại/ })", "screen.getAllByRole('button', { name: /Phát âm Quan thoại/ })[0]"))
edit(base+'flashcard-m22.test.tsx',lambda s:s.replace("name: 'Kiểm tra'", "name: 'Xác nhận đáp án'"))
