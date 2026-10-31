import { Link } from 'react-router-dom';
import { OrientalCard } from '../../components/OrientalCard';

const stages = [
  { tag: 'Chặng 1', title: 'Nhập môn Ngữ âm', subtitle: 'Pinyin & Thanh điệu',
    description: 'Làm quen âm đọc, thanh điệu và luyện phát âm trước khi học từ.', levels: [] },
  { tag: 'Chặng 2', title: 'HSK 1 · Nội dung chọn lọc', subtitle: 'Nhóm học liệu nội bộ',
    description: 'Học liệu hiện có là nhóm nội bộ chọn lọc, đang được bổ sung và chưa bao phủ toàn cấp.', levels: [1] },
  { tag: 'Chặng 3', title: 'HSK 2 · Nội dung chọn lọc', subtitle: 'Nhóm học liệu nội bộ',
    description: 'Học liệu hiện có là nhóm nội bộ chọn lọc, đang được bổ sung và chưa bao phủ toàn cấp.', levels: [2] },
  { tag: 'Chặng 4', title: 'HSK 3–6 · Đang bổ sung', subtitle: 'Bộ học liệu chọn lọc',
    description: 'Các nhóm bài học là tuyển chọn nội bộ, đang được bổ sung và chưa hoàn chỉnh.', levels: [3, 4, 5, 6] },
];

const linkClass = 'inline-flex min-w-0 items-center justify-center border border-rule-strong px-3 py-2 text-center text-[12.5px] leading-relaxed text-fg-60 hover:bg-fg hover:text-bg';

export function HskRoadmap() {
  return (
    <section className="mt-12 min-w-0" aria-labelledby="hsk-roadmap-title">
      <h2 id="hsk-roadmap-title" className="text-[24px] font-semibold leading-relaxed text-fg">Lộ trình học tiếng Trung theo cấp</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-fg-60">HSK 1–6 · Học liệu chọn lọc, đang bổ sung.</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-fg-60">Nhóm bài học là phân nhóm nội bộ, không xác nhận độ phủ chương trình HSK chính thức.</p>
      <div data-hsk-roadmap className="mt-6 grid min-w-0 grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage, index) => (
          <OrientalCard key={stage.tag} tag={stage.tag} className="flex min-w-0 flex-col">
            <h3 className="text-[18px] font-semibold leading-relaxed text-fg">{stage.title}</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-fg-60">{stage.subtitle}</p>
            <p className="mt-4 text-[13.5px] leading-relaxed text-fg-60">{stage.description}</p>
            <div className="mt-auto flex flex-col gap-2 pt-7">
              {index === 0 && <Link className={linkClass} to="/pinyin">Học Pinyin →</Link>}
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
