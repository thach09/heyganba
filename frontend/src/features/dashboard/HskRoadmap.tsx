import { Link } from 'react-router-dom';
import { OrientalCard } from '../../components/OrientalCard';

const stages = [
  { tag: 'Chặng 1 · 拼音入门', title: 'Nhập môn Ngữ âm', subtitle: 'Pinyin & Thanh điệu',
    description: 'Làm quen âm đọc, thanh điệu và luyện phát âm trước khi học từ.', levels: [] },
  { tag: 'Chặng 2 · 初级', title: 'Sơ cấp HSK 1 – HSK 2', subtitle: 'Nền tảng giao tiếp · Thang 200đ',
    description: 'Học từ theo chủ đề, chữ Hán và các mẫu câu giao tiếp hằng ngày.', levels: [1, 2] },
  { tag: 'Chặng 3 · 中级', title: 'Trung cấp HSK 3 – HSK 4', subtitle: 'Đời sống & Công việc · Thang 300đ',
    description: 'Mở rộng cách diễn đạt, đọc hiểu và luyện cấu trúc trong ngữ cảnh.', levels: [3, 4] },
  { tag: 'Chặng 4 · 高级', title: 'Cao cấp & Tinh thông HSK 5 – HSK 6', subtitle: 'Thành ngữ & Học thuật · Thang 300đ',
    description: 'Luyện lập luận, văn viết, thành ngữ và làm bài thi thử theo cấp độ.', levels: [5, 6] },
];

const linkClass = 'inline-flex min-w-0 items-center justify-center border border-rule-strong px-3 py-2 text-center text-[12.5px] leading-relaxed text-fg-60 hover:bg-fg hover:text-bg';

export function HskRoadmap() {
  return (
    <section className="mt-12 min-w-0" aria-labelledby="hsk-roadmap-title">
      <h2 id="hsk-roadmap-title" className="text-[24px] font-semibold leading-relaxed text-fg">Bản đồ Lộ trình Chinh phục HSK</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-fg-60">Từ Pinyin đến HSK 6 · Từ vựng, ngữ pháp, chữ Hán, đọc hiểu và thi thử.</p>
      <div data-hsk-roadmap className="mt-6 grid min-w-0 grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage, index) => (
          <OrientalCard key={stage.tag} tag={stage.tag} className="flex min-w-0 flex-col">
            <h3 className="text-[18px] font-semibold leading-relaxed text-fg">{stage.title}</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-fg-60">{stage.subtitle}</p>
            <p className="mt-4 text-[13.5px] leading-relaxed text-fg-60">{stage.description}</p>
            <div className="mt-auto flex flex-col gap-2 pt-7">
              {index === 0 && <Link className={linkClass} to="/pinyin">Vào Trạm Pinyin →</Link>}
              {stage.levels.map(level => <Link key={level} className={linkClass} to={`/vocabulary?level=HSK${level}`}>Học từ vựng HSK {level} →</Link>)}
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
