import { Link } from 'react-router-dom';
import { OrientalCard } from '../../components/OrientalCard';

const stages = [
  { tag: 'Chặng 1 · 拼音入门', title: 'Nhập môn Ngữ âm', subtitle: 'Pinyin & Thanh điệu',
    description: 'Làm quen âm đọc, thanh điệu và luyện phát âm trước khi học từ.', levels: [] },
  { tag: 'Chặng 2 · 初级', title: 'HSK 1 · Nội dung chọn lọc', subtitle: 'CTI 3.0: 244/300 ID xác nhận duy nhất',
    description: 'Còn 56 ID chưa ghép. Các ID có cùng chữ và Pinyin nhưng khác cấp chưa tính vào độ phủ. Học liệu hiện có là nhóm nội bộ chọn lọc, chưa bao phủ toàn cấp.', levels: [1] },
  { tag: 'Chặng 3 · 初级', title: 'HSK 2 · Nội dung chọn lọc', subtitle: 'CTI 3.0: 86/200 ID xác nhận duy nhất',
    description: 'Còn 114 ID chưa ghép. Nội dung hiện có là nhóm nội bộ chọn lọc, đang được mở rộng; chưa đại diện đầy đủ cấp này.', levels: [2] },
  { tag: 'Chặng 4 · 中高级', title: 'HSK 3–6 · Đang bổ sung', subtitle: 'CTI 3.0 · Bộ học liệu chọn lọc',
    description: 'ID từ-và-cách-đọc CTI xác nhận duy nhất: HSK 3 59/500, HSK 4 43/1.000, HSK 5 38/1.600, HSK 6 13/1.800. Các nhóm bài học là tuyển chọn nội bộ và chưa hoàn chỉnh.', levels: [3, 4, 5, 6] },
];

const linkClass = 'inline-flex min-w-0 items-center justify-center border border-rule-strong px-3 py-2 text-center text-[12.5px] leading-relaxed text-fg-60 hover:bg-fg hover:text-bg';

export function HskRoadmap() {
  return (
    <section className="mt-12 min-w-0" aria-labelledby="hsk-roadmap-title">
      <h2 id="hsk-roadmap-title" className="text-[24px] font-semibold leading-relaxed text-fg">Lộ trình học tiếng Trung theo cấp</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-fg-60">HSK 1–6 · Học liệu chọn lọc, đang bổ sung theo CTI HSK 3.0 (2025-11).</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-fg-60">Số liệu CTI chỉ đếm ID có chữ/Pinyin khớp duy nhất, không phải tỷ lệ hoàn thành bài học. Bộ lọc bài học bên dưới vẫn dùng nhóm nội bộ cũ, không được xem là phân loại CTI 3.0.</p>
      <div data-hsk-roadmap className="mt-6 grid min-w-0 grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage, index) => (
          <OrientalCard key={stage.tag} tag={stage.tag} className="flex min-w-0 flex-col">
            <h3 className="text-[18px] font-semibold leading-relaxed text-fg">{stage.title}</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-fg-60">{stage.subtitle}</p>
            <p className="mt-4 text-[13.5px] leading-relaxed text-fg-60">{stage.description}</p>
            <div className="mt-auto flex flex-col gap-2 pt-7">
              {index === 0 && <Link className={linkClass} to="/pinyin">Vào Trạm Pinyin →</Link>}
              {stage.levels.map(level => <Link key={level} className={linkClass} to={`/vocabulary?level=HSK${level}`}>Học nhóm chọn lọc {level} →</Link>)}
              {index === 3 && <Link className={linkClass} to="/exam">Vào phòng Thi thử HSK →</Link>}
            </div>
          </OrientalCard>
        ))}
      </div>
      <div className="mt-7 flex flex-wrap gap-5 text-[12.5px] leading-relaxed text-fg-60">
        <Link to="/hanzi">Chữ Hán & Bộ thủ →</Link><Link to="/grammar">Ngữ pháp →</Link><Link to="/dictionary">Đọc hiểu & Sổ từ →</Link>
      </div>
    </section>
  );
}
