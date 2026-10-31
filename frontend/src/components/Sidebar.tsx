import {useEffect,useRef} from 'react';
import {ChevronLeft,X} from 'lucide-react';
import {Link,NavLink} from 'react-router-dom';
import type {AuthResponse} from '../lib/api/types';
import {ThemeToggle} from './ThemeToggle';
import {BrandLogo} from './BrandLogo';

interface SidebarProps {
  onNavigate?:()=>void;
  user:AuthResponse|null;
  isOpen?:boolean;
  isOverlay?:boolean;
  onClose?:()=>void;
  onToggleSidebar?:()=>void;
  onOpenAuthModal?:()=>void;
  onLogout?:()=>void;
  onChangePassword?:()=>void;
  streakCount?:number;
}
const stations=[['/','Hôm nay'],['/pinyin','Pinyin'],['/hanzi','Chữ Hán'],['/vocabulary','Từ vựng'],['/dictionary','Từ điển'],['/grammar','Ngữ pháp'],['/exam','Luyện tập'],['/toi','Tôi']] as const;

export function Sidebar({user,isOpen=true,isOverlay=false,onNavigate,onClose,onToggleSidebar,onOpenAuthModal,streakCount=0}:SidebarProps){
  const aside=useRef<HTMLElement>(null),toggle=useRef<HTMLButtonElement>(null),close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(isOverlay&&isOpen)close.current?.focus();
    if(!isOverlay&&!isOpen&&aside.current?.contains(document.activeElement)&&document.activeElement!==toggle.current)toggle.current?.focus();
  },[isOverlay,isOpen]);
  return <aside ref={aside} aria-label="Thanh điều hướng chính" inert={isOverlay&&!isOpen?true:undefined}
    className={`fixed inset-y-0 left-0 z-20 flex w-[216px] flex-col overflow-visible bg-card pb-6 pl-6 pr-4 pt-6 transition-transform duration-150 max-[900px]:z-[100] max-[900px]:w-[min(280px,82vw)] max-[900px]:overflow-y-auto ${isOpen?'translate-x-0':'-translate-x-full'}`}>
    {!isOverlay&&onToggleSidebar&&<button ref={toggle} type="button" onClick={()=>{onToggleSidebar();requestAnimationFrame(()=>toggle.current?.focus());}}
      aria-label={isOpen?'Thu gọn thanh điều hướng':'Mở thanh điều hướng'} className="absolute -right-6 top-8 z-40 flex h-11 w-6 items-center justify-center border border-l-0 border-rule bg-card text-fg-60"><ChevronLeft size={14} className={isOpen?'':'rotate-180'}/></button>}
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" inert={!isOpen?true:undefined}>
      <div className="flex items-center justify-between gap-2">
        <Link to="/" aria-label="Jiayou — Trang chủ" onClick={onNavigate}><BrandLogo /></Link>
        {isOverlay&&onClose&&<button ref={close} type="button" onClick={onClose} aria-label="Đóng thanh điều hướng" className="flex h-11 w-11 shrink-0 items-center justify-center text-fg-60"><X size={18}/></button>}
      </div>
      <nav className="mt-6 flex flex-col gap-1" aria-label="Các mục chính">
        {[...stations,...(user?.role==='ROLE_ADMIN'?[['/admin','Quản trị'] as const]:[])].map(([to,label])=><NavLink key={to} to={to} end={to==='/'} onClick={onNavigate}
          className={({isActive})=>`flex min-h-10 items-center border-l-2 px-3 text-[13.5px] transition-colors ${isActive?'border-jade bg-tint font-semibold text-fg':'border-transparent text-fg-60 hover:bg-tint hover:text-fg'}`}>{label}</NavLink>)}
      </nav>
      <div className="mt-auto space-y-3 pt-6">
        {user&&<Link to="/toi" onClick={onNavigate} className="block min-w-0 text-sm text-fg"><span className="block truncate" title={user.fullName}>{user.fullName}</span><span className="mt-1 block text-xs text-fg-60">{user.role==='ROLE_ADMIN'?'Quản trị viên':'Học viên'} · Chuỗi học: {streakCount} ngày</span></Link>}
        <div className="flex items-center justify-between gap-2">
          {!user&&onOpenAuthModal&&<button type="button" onClick={onOpenAuthModal} className="min-h-11 border border-fg bg-fg px-3 text-sm text-bg">Đăng nhập</button>}
          <ThemeToggle />
        </div>
      </div>
    </div>
  </aside>;
}
