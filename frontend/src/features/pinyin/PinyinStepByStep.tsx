import React, { useState, useEffect } from 'react';
import {
  Volume2,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Sparkles,
  BookOpen,
  Check,
  AlertCircle,
} from 'lucide-react';
import { speakChinese, stopChineseSpeech } from '../../services/chineseSpeech';

interface Step {
  id: number;
  title: string;
  badge: string;
  summary: string;
  renderContent: () => React.ReactNode;
}

interface Props {
  onGoToQuiz: () => void;
  onGoToTable: () => void;
}

export const PinyinStepByStep: React.FC<Props> = ({ onGoToQuiz, onGoToTable }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [audioWarning, setAudioWarning] = useState<string | null>(null);

  // Mini check interactive state for current step
  const [miniAnswer, setMiniAnswer] = useState<number | null>(null);
  const [isMiniChecked, setIsMiniChecked] = useState(false);

  useEffect(() => {
    return () => {
      stopChineseSpeech();
    };
  }, []);

  const handlePlay = (voiceText: string) => {
    stopChineseSpeech();
    const result = speakChinese(voiceText);
    if (result === 'no-voice') {
      setAudioWarning('Thiết bị chưa có giọng Quan thoại (zh-CN). Vui lòng kiểm tra cài đặt âm thanh hệ thống.');
    } else if (result === 'unsupported' || result === 'error') {
      setAudioWarning('Trình duyệt chưa hỗ trợ phát âm thanh này.');
    } else {
      setAudioWarning(null);
    }
  };

  const handleNextStep = () => {
    stopChineseSpeech();
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setMiniAnswer(null);
      setIsMiniChecked(false);
      setAudioWarning(null);
    }
  };

  const handlePrevStep = () => {
    stopChineseSpeech();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setMiniAnswer(null);
      setIsMiniChecked(false);
      setAudioWarning(null);
    }
  };

  const STEPS: Step[] = [
    // ----------------------------------------------------
    // BƯỚC 1: Pinyin là gì & Cấu tạo âm tiết
    // ----------------------------------------------------
    {
      id: 1,
      badge: 'Chặng 1 / 6',
      title: 'Pinyin là gì? Cấu tạo một âm tiết tiếng Trung',
      summary: 'Hiểu đúng bản chất Pinyin và nắm chắc công thức cấu tạo âm tiết.',
      renderContent: () => (
        <div className="flex flex-col gap-5 text-sm">
          <div className="rounded border border-cinnabar/20 bg-cinnabar/5 p-4 text-xs leading-relaxed text-fg">
            <b className="text-cinnabar-ink">Khái niệm cốt lõi: </b>
            Pinyin (Hán ngữ Phiên âm / 汉语拼音) là hệ thống ký âm bằng chữ cái Latinh được ban hành chính thức năm 1958, dùng để <b>ghi lại cách đọc</b> của chữ Hán.
            <div className="mt-1 text-fg-60">
              ⚠️ <i>Lưu ý quan trọng:</i> Pinyin <b>không phải là chữ viết</b> của tiếng Trung. Người Trung Quốc đọc và viết bằng <b>Chữ Hán (汉字)</b>; Pinyin chỉ là chiếc cầu nối để học phát âm lúc ban đầu.
            </div>
          </div>

          <div>
            <h4 className="font-serif text-base font-bold text-fg mb-2">
              Công thức cấu tạo 1 âm tiết tiếng Trung:
            </h4>
            <div className="flex flex-wrap items-center justify-center gap-2 rounded border border-rule bg-card p-4 text-center">
              <div className="rounded bg-tint px-3 py-2 border border-rule">
                <span className="block font-sans text-base font-bold text-cinnabar-ink">Thanh mẫu</span>
                <span className="text-[11px] text-fg-38">Phụ âm đầu (21 âm)</span>
              </div>
              <span className="text-lg font-bold text-fg-38">+</span>
              <div className="rounded bg-tint px-3 py-2 border border-rule">
                <span className="block font-sans text-base font-bold text-gold-ink">Vận mẫu</span>
                <span className="text-[11px] text-fg-38">Phần vần (36 âm)</span>
              </div>
              <span className="text-lg font-bold text-fg-38">+</span>
              <div className="rounded bg-tint px-3 py-2 border border-rule">
                <span className="block font-sans text-base font-bold text-jade-ink">Thanh điệu</span>
                <span className="text-[11px] text-fg-38">Dấu thanh (4 thanh)</span>
              </div>
              <span className="text-lg font-bold text-fg-38">=</span>
              <div className="rounded bg-cinnabar/10 px-4 py-2 border border-cinnabar/30">
                <span className="block font-sans text-lg font-bold text-cinnabar-ink">Âm tiết hoàn chỉnh</span>
                <span className="text-[11px] text-fg-60">Ví dụ: m + a + ¯ = mā (妈)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-rule pt-4">
            <h5 className="font-serif text-sm font-semibold text-fg mb-2">Quy tắc đặt dấu thanh:</h5>
            <div className="rounded bg-tint p-3 text-xs leading-relaxed text-fg-60 flex flex-col gap-1.5">
              <div>1. Thứ tự ưu tiên đặt dấu: <b>a → o → e → i → u → ü</b> (Có a thì đặt trên a, không có a tìm o hoặc e).</div>
              <div>2. Nếu nguyên âm <b>i</b> và <b>u</b> cùng xuất hiện (iu hoặc ui), dấu thanh luôn đặt trên chữ cái <b>đứng sau</b> (Ví dụ: <i>jiǔ</i> đặt trên u; <i>duì</i> đặt trên i).</div>
              <div>3. Khi đánh dấu trên chữ <b>i</b>, lược bỏ dấu chấm tròn trên đầu chữ i (Ví dụ: <i>nǐ</i>).</div>
            </div>
          </div>

          {/* Mini Check 1 */}
          <div className="mt-2 rounded border border-rule bg-card p-4">
            <span className="text-[11px] font-sans uppercase tracking-wider text-gold-ink flex items-center gap-1.5 mb-2">
              <Lightbulb size={13} /> Kiểm tra nhỏ:
            </span>
            <p className="text-xs font-medium text-fg mb-3">
              Trong từ "duì" (对 - Đúng), vì sao dấu thanh 4 lại được đánh trên chữ "i" thay vì chữ "u"?
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { id: 0, text: 'Do chữ "i" đọc to hơn chữ "u"' },
                { id: 1, text: 'Theo quy tắc: gặp cặp "ui" hoặc "iu", dấu luôn đánh trên chữ cái đứng sau' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setMiniAnswer(opt.id);
                    setIsMiniChecked(true);
                  }}
                  className={`rounded border p-2.5 text-left text-xs transition-colors cursor-pointer ${
                    miniAnswer === opt.id
                      ? opt.id === 1
                        ? 'border-jade bg-jade/10 text-jade-ink'
                        : 'border-cinnabar bg-cinnabar/10 text-cinnabar-ink'
                      : 'border-rule bg-tint text-fg-60 hover:text-fg'
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
            {isMiniChecked && miniAnswer === 1 && (
              <div className="mt-2 text-xs text-jade-ink flex items-center gap-1">
                <Check size={14} /> Chính xác! Gặp cặp iu/ui thì dấu thanh luôn đặt ở chữ cái đứng phía sau.
              </div>
            )}
          </div>
        </div>
      ),
    },

    // ----------------------------------------------------
    // BƯỚC 2: Bốn thanh điệu chuẩn & Thanh nhẹ
    // ----------------------------------------------------
    {
      id: 2,
      badge: 'Chặng 2 / 6',
      title: 'Bốn thanh điệu chuẩn (Tones) & Thanh nhẹ',
      summary: 'Khám phá cao độ thang 5 bậc của 4 thanh điệu tiếng Trung.',
      renderContent: () => (
        <div className="flex flex-col gap-5 text-sm">
          <p className="text-xs text-fg-60 leading-relaxed">
            Tiếng Trung là ngôn ngữ thanh điệu (Tonal language). Cùng một âm "ma", chỉ cần đổi thanh điệu là nghĩa sẽ hoàn toàn khác biệt.
            <br />
            <i>Ghi chú:</i> So sánh với tiếng Việt dưới đây chỉ là <b>gợi ý gần đúng</b> để bạn dễ hình dung, không đồng nhất 100%.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { num: 1, name: 'Thanh 1 (Âm Bình)', pitch: '55', hanzi: '妈', pinyin: 'mā', meaning: 'Mẹ', desc: 'Cao và phẳng, giữ đều hơi ở nốt cao nhất' },
              { num: 2, name: 'Thanh 2 (Dương Bình)', pitch: '35', hanzi: '麻', pinyin: 'má', meaning: 'Cây gai', desc: 'Vút lên cao, tương tự dấu sắc nhẹ' },
              { num: 3, name: 'Thanh 3 (Thượng Thanh)', pitch: '214 / 211', hanzi: '马', pinyin: 'mǎ', meaning: 'Con ngựa', desc: 'Đơn lẻ: 214 (xuống rồi lên). Trong câu: 211 (Nửa thanh 3 - chỉ hạ thấp, không vút)' },
              { num: 4, name: 'Thanh 4 (Khứ Thanh)', pitch: '51', hanzi: '骂', pinyin: 'mà', meaning: 'Mắng chửi', desc: 'Giáng dứt khoát từ 5 xuống 1, mạnh mẽ' },
            ].map((t) => (
              <div key={t.num} className="rounded border border-rule bg-card p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm font-bold text-cinnabar-ink">Thanh {t.num}</span>
                    <span className="font-sans text-[11px] rounded bg-rule/40 px-1.5 py-0.5 text-fg-38">{t.pitch}</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-serif text-2xl font-bold text-fg">{t.hanzi}</span>
                    <span className="font-sans text-base font-bold text-cinnabar-ink">{t.pinyin}</span>
                    <span className="text-xs text-fg-60">({t.meaning})</span>
                  </div>
                  <p className="mt-1 text-[11px] text-fg-60 leading-normal">{t.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlay(t.hanzi)}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded bg-tint border border-rule px-2 py-1.5 text-xs text-fg hover:border-cinnabar hover:text-cinnabar-ink transition-colors cursor-pointer"
                >
                  <Volume2 size={13} /> Nghe mẫu "{t.pinyin}"
                </button>
              </div>
            ))}
          </div>

          <div className="rounded border border-gold/20 bg-gold/10 p-3 text-xs text-gold-ink leading-relaxed">
            <b>💡 Quy tắc Nửa thanh 3 (Bán Thượng / 半上 - Cao độ 211): </b>
            Trong khẩu ngữ thực tế, khi thanh 3 đi trước thanh 1, thanh 2, thanh 4 hoặc thanh nhẹ, người bản xứ <b>chỉ hạ giọng xuống thấp (211)</b> rồi nói ngay từ tiếp theo, <b>không uốn giọng vút lên đuôi 4</b>. Chỉ đọc đủ 214 khi từ đó đứng một mình ở cuối câu hoặc khi đọc nhấn từng chữ rời rạc.
          </div>

          <div className="rounded border border-rule bg-tint p-3 text-xs text-fg-60">
            <span className="font-semibold text-fg">Thanh nhẹ (轻声 - Neutral tone): </span>
            Đọc thật ngắn, nhẹ, không mang dấu. Ví dụ: <i>māma</i> (chữ ma thứ hai đọc nhẹ), <i>hǎo ma</i> (好吗).
          </div>
        </div>
      ),
    },

    // ----------------------------------------------------
    // BƯỚC 3: Thanh mẫu & Phân biệt âm bật hơi
    // ----------------------------------------------------
    {
      id: 3,
      badge: 'Chặng 3 / 6',
      title: '21 Thanh mẫu phụ âm & 2 Dạng mở đầu y/w',
      summary: 'Làm chủ các cặp âm dễ nhầm lẫn nhất đối với người Việt.',
      renderContent: () => (
        <div className="flex flex-col gap-5 text-sm">
          <p className="text-xs text-fg-60 leading-relaxed">
            Hệ thống gồm <b>21 thanh mẫu phụ âm thực thụ</b> và <b>2 ký hiệu chính tả y, w</b> (dùng mở đầu khi âm tiết không có phụ âm đầu). Điểm người Việt hay mắc lỗi nhất là <b>không phân biệt được âm bật hơi</b> và <b>nhóm âm uốn lưỡi (zh/ch/sh)</b>.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* b vs p */}
            <div className="rounded border border-rule bg-card p-4 flex flex-col gap-2">
              <span className="font-serif text-sm font-bold text-cinnabar-ink">Cặp 1: b [p] vs p [pʰ]</span>
              <p className="text-xs text-fg-60 leading-relaxed">
                • <b>b</b>: Không bật hơi (như "p" nhẹ). Ví dụ: 爸爸 (bàba).<br />
                • <b>p</b>: Bật luồng hơi cực mạnh. Ví dụ: 苹果 (píngguǒ).
              </p>
              <div className="mt-auto flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handlePlay('八')}
                  className="flex-1 rounded bg-tint border border-rule py-1 text-xs text-fg hover:text-cinnabar-ink cursor-pointer"
                >
                  Nghe b (八)
                </button>
                <button
                  type="button"
                  onClick={() => handlePlay('坡')}
                  className="flex-1 rounded bg-tint border border-rule py-1 text-xs text-fg hover:text-cinnabar-ink cursor-pointer"
                >
                  Nghe p (坡)
                </button>
              </div>
            </div>

            {/* d vs t */}
            <div className="rounded border border-rule bg-card p-4 flex flex-col gap-2">
              <span className="font-serif text-sm font-bold text-cinnabar-ink">Cặp 2: d [t] vs t [tʰ]</span>
              <p className="text-xs text-fg-60 leading-relaxed">
                • <b>d</b>: Không bật hơi (đọc như "t"). Ví dụ: 大 (dà).<br />
                • <b>t</b>: Bật hơi mạnh (đọc như "th"). Ví dụ: 他 (tā).
              </p>
              <div className="mt-auto flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handlePlay('得')}
                  className="flex-1 rounded bg-tint border border-rule py-1 text-xs text-fg hover:text-cinnabar-ink cursor-pointer"
                >
                  Nghe d (得)
                </button>
                <button
                  type="button"
                  onClick={() => handlePlay('特')}
                  className="flex-1 rounded bg-tint border border-rule py-1 text-xs text-fg hover:text-cinnabar-ink cursor-pointer"
                >
                  Nghe t (特)
                </button>
              </div>
            </div>

            {/* zh vs z */}
            <div className="rounded border border-rule bg-card p-4 flex flex-col gap-2">
              <span className="font-serif text-sm font-bold text-cinnabar-ink">Cặp 3: zh [tʂ] vs z [ts]</span>
              <p className="text-xs text-fg-60 leading-relaxed">
                • <b>zh</b>: Uốn cong đầu lưỡi lên ngạc cứng. Ví dụ: 中 (zhōng).<br />
                • <b>z</b>: Đầu lưỡi để thẳng áp sau răng. Ví dụ: 再 (zài).
              </p>
              <div className="mt-auto flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handlePlay('中')}
                  className="flex-1 rounded bg-tint border border-rule py-1 text-xs text-fg hover:text-cinnabar-ink cursor-pointer"
                >
                  Nghe zh (中)
                </button>
                <button
                  type="button"
                  onClick={() => handlePlay('再')}
                  className="flex-1 rounded bg-tint border border-rule py-1 text-xs text-fg hover:text-cinnabar-ink cursor-pointer"
                >
                  Nghe z (再)
                </button>
              </div>
            </div>
          </div>

          <div className="rounded bg-gold/10 border border-gold/20 p-3 text-xs text-gold-ink flex items-start gap-2">
            <Sparkles size={15} className="shrink-0 mt-0.5" />
            <span>
              <b>Mẹo thực hành:</b> Đặt một tờ khăn giấy mỏng cách miệng 5cm. Khi phát âm các âm bật hơi (<b>p, t, k, q, ch, c</b>), luồng hơi thoát ra bắt buộc phải làm tờ giấy bay nhẹ!
            </span>
          </div>
        </div>
      ),
    },

    // ----------------------------------------------------
    // BƯỚC 4: Vận mẫu & Ghép vần
    // ----------------------------------------------------
    {
      id: 4,
      badge: 'Chặng 4 / 6',
      title: '36 Vận mẫu & Quy luật ghép âm',
      summary: 'Khám phá 6 vận mẫu đơn và quy luật ghép các vần kép, vần mũi.',
      renderContent: () => (
        <div className="flex flex-col gap-5 text-sm">
          <div>
            <h4 className="font-serif text-sm font-bold text-fg mb-2">6 Vận mẫu đơn nền tảng:</h4>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
              {[
                { py: 'a', hanzi: '八 (bā)', tip: 'Mở rộng miệng' },
                { py: 'o', hanzi: '波 (bō)', tip: 'Tròn môi "ô"' },
                { py: 'e', hanzi: '歌 (gē)', tip: 'Cuống họng "ưa"' },
                { py: 'i', hanzi: '七 (qī)', tip: 'Dẹt môi "i"' },
                { py: 'u', hanzi: '不 (bù)', tip: 'Nhọn môi "u"' },
                { py: 'ü', hanzi: '女 (nǚ)', tip: 'Tròn môi "uy"' },
              ].map((item) => (
                <div key={item.py} className="rounded border border-rule bg-card p-2.5 text-center flex flex-col items-center">
                  <span className="font-sans text-xl font-bold text-cinnabar-ink">{item.py}</span>
                  <span className="text-[11px] text-fg-60">{item.tip}</span>
                  <button
                    type="button"
                    onClick={() => handlePlay(item.hanzi.slice(0, 1))}
                    className="mt-2 text-xs text-cinnabar-ink hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Volume2 size={12} /> {item.hanzi}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-rule bg-tint p-4 text-xs leading-relaxed text-fg-60 flex flex-col gap-2">
            <span className="font-serif font-bold text-fg text-sm">Phân loại 36 vận mẫu chuẩn:</span>
            <div>• <b>6 Vận mẫu đơn:</b> a, o, e, i, u, ü.</div>
            <div>• <b>13 Vận mẫu phức:</b> ai, ei, ao, ou, ia, ie, iao, iu, ua, uo, uai, ui, üe.</div>
            <div>• <b>16 Vận mẫu mũi:</b> an, en, in, ün, ian, uan, un, üan (mũi trước -n); ang, eng, ing, ong, iang, uang, ueng, iong (mũi sau -ng).</div>
            <div>• <b>1 Vận mẫu đặc biệt:</b> er (uốn lưỡi độc lập, không ghép với phụ âm đầu).</div>
          </div>
        </div>
      ),
    },

    // ----------------------------------------------------
    // BƯỚC 5: Quy tắc chính tả & Biến điệu
    // ----------------------------------------------------
    {
      id: 5,
      badge: 'Chặng 5 / 6',
      title: 'Quy tắc chính tả & Biến điệu thiết yếu',
      summary: 'Quy tắc bỏ dấu ü, viết tắt và biến điệu nǐ hǎo, bú shì.',
      renderContent: () => (
        <div className="flex flex-col gap-5 text-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded border border-rule bg-card p-4 flex flex-col gap-2">
              <span className="font-serif text-sm font-bold text-cinnabar-ink">1. Quy tắc ü bỏ 2 chấm</span>
              <p className="text-xs text-fg-60 leading-relaxed">
                Khi <b>ü</b> ghép với <b>j, q, x</b>, lược bỏ 2 chấm viết thành: <b>ju, qu, xu</b> (nhưng vẫn đọc là [y] tròn môi).
                <br />
                Khi ghép với <b>n, l</b>, bắt buộc giữ nguyên: <b>nü, lü</b>.
              </p>
              <div className="text-xs font-sans text-fg mt-1">
                Ví dụ: 去 (qù - đi), 女 (nǚ - nữ).
              </div>
            </div>

            <div className="rounded border border-rule bg-card p-4 flex flex-col gap-2">
              <span className="font-serif text-sm font-bold text-cinnabar-ink">2. Biến điệu hai Thanh 3</span>
              <p className="text-xs text-fg-60 leading-relaxed">
                <b>Thanh 3 + Thanh 3 → Thanh 2 + Thanh 3</b>.
                <br />
                Từ "你好" viết là <i>nǐ hǎo</i> nhưng đọc thực tế là <i>ní hǎo</i>!
              </p>
              <button
                type="button"
                onClick={() => handlePlay('你好')}
                className="mt-auto w-fit text-xs text-cinnabar-ink hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Volume2 size={13} /> Nghe phát âm "你好" (ní hǎo)
              </button>
            </div>
          </div>

          <div className="rounded border border-rule bg-tint p-3 text-xs leading-relaxed text-fg-60">
            <b>Biến điệu của 不 (bù):</b> Đứng trước từ mang thanh 4, "不" đổi thành thanh 2: <b>bú shì (不是)</b>, <b>bú duì (不对)</b>.
          </div>
        </div>
      ),
    },

    // ----------------------------------------------------
    // BƯỚC 6: Sẵn sàng thực chiến
    // ----------------------------------------------------
    {
      id: 6,
      badge: 'Chặng 6 / 6',
      title: 'Chúc mừng bạn đã hoàn thành lộ trình nền tảng!',
      summary: 'Sẵn sàng kiểm tra phản xạ và nhận EXP kinh nghiệm.',
      renderContent: () => (
        <div className="flex flex-col items-center justify-center gap-4 text-center py-6">
          <div className="h-14 w-14 rounded-full bg-cinnabar/10 border border-cinnabar/30 flex items-center justify-center text-cinnabar-ink">
            <Sparkles size={28} />
          </div>
          <h4 className="font-serif text-2xl font-bold text-fg">
            Bạn đã nắm chắc nền tảng phát âm Pinyin!
          </h4>
          <p className="max-w-md text-xs text-fg-60 leading-relaxed">
            Bây giờ hãy thử thách bản thân với <b>Bài luyện nhận biết (Quiz)</b> để kiểm tra khả năng phân biệt thanh điệu, nhận diện âm bật hơi và gõ Pinyin nhận +10 EXP.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoToQuiz}
              className="inline-flex items-center gap-2 rounded bg-cinnabar px-5 py-2.5 font-serif text-sm font-semibold text-on-accent  hover:opacity-90 transition-opacity cursor-pointer"
            >
              Làm bài luyện nhận biết (Nhận EXP) <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={onGoToTable}
              className="inline-flex items-center gap-2 rounded border border-rule bg-card px-4 py-2.5 text-xs font-semibold text-fg hover:border-rule-strong transition-colors cursor-pointer"
            >
              <BookOpen size={14} /> Mở bảng tra cứu âm
            </button>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="flex flex-col gap-6">
      {/* Audio Warning Banner */}
      {audioWarning && (
        <div className="flex items-center gap-2 rounded bg-gold/10 border border-gold/20 px-4 py-2.5 text-xs text-gold-ink">
          <AlertCircle size={15} className="shrink-0" />
          <span>{audioWarning}</span>
        </div>
      )}

      {/* Step Stepper Header */}
      <div className="flex items-center justify-between border-b border-rule pb-4">
        <div>
          <span className="text-[11px] font-sans uppercase tracking-wider text-cinnabar-ink font-semibold">
            {currentStep.badge}
          </span>
          <h3 className="font-serif text-xl font-bold text-fg mt-0.5">
            {currentStep.title}
          </h3>
          <p className="text-xs text-fg-60 mt-1">
            {currentStep.summary}
          </p>
        </div>

        {/* Step dots */}
        <div className="hidden sm:flex items-center gap-1.5">
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                stopChineseSpeech();
                setCurrentStepIndex(idx);
                setMiniAnswer(null);
                setIsMiniChecked(false);
                setAudioWarning(null);
              }}
              title={s.title}
              aria-label={`Chặng ${idx + 1}: ${s.title}`}
              aria-current={idx === currentStepIndex ? 'step' : undefined}
              className="flex h-6 min-w-6 cursor-pointer items-center justify-center"
            ><span aria-hidden="true" className={`h-2.5 rounded-full transition-opacity motion-reduce:transition-none ${
                idx === currentStepIndex
                  ? 'w-7 bg-cinnabar'
                  : idx < currentStepIndex
                  ? 'w-2.5 bg-cinnabar/40'
                  : 'w-2.5 bg-rule'
              }`} /></button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {currentStep.renderContent()}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between border-t border-rule pt-4">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0}
          className={`inline-flex items-center gap-1.5 rounded border border-rule px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            currentStepIndex === 0
              ? 'opacity-40 cursor-not-allowed bg-tint text-fg-38'
              : 'bg-card text-fg hover:border-rule-strong'
          }`}
        >
          <ArrowLeft size={14} /> Chặng trước
        </button>

        {currentStepIndex < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="inline-flex items-center gap-1.5 rounded bg-cinnabar px-5 py-2 text-xs font-semibold text-on-accent hover:opacity-90 transition-opacity cursor-pointer "
          >
            Chặng tiếp theo <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onGoToQuiz}
            className="inline-flex items-center gap-1.5 rounded bg-cinnabar px-5 py-2 text-xs font-semibold text-on-accent hover:opacity-90 transition-opacity cursor-pointer "
          >
            Bắt đầu bài luyện <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
