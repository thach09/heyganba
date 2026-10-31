import {useEffect,useState} from 'react';
import {useAuth} from '../../app/useAuth';
import {useRequestScope} from '../../lib/hooks/useRequestScope';
import {ThemeToggle} from '../../components/ThemeToggle';
import {getMyProfile,updateClassCode} from './api';
import type {UserProfileResponse} from '../../lib/api/types';

const isMyProfile=(value:UserProfileResponse|null|undefined,owner:number):value is UserProfileResponse=>Boolean(value&&value.id===owner&&typeof value.fullName==='string'&&typeof value.email==='string'&&typeof value.role==='string');

export function AccountView(){
  const {user}=useAuth();
  return <AccountSession key={user?.userId??'guest'} />;
}
function AccountSession(){
  const {user,requireLogin,openRegistration,changePassword,logout,updateProfile}=useAuth();
  const {run,isActive}=useRequestScope(user?.userId);
  const [profile,setProfile]=useState<UserProfileResponse|null>(null);
  const [loading,setLoading]=useState(Boolean(user));
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const [classCode,setClassCode]=useState('');
  const [busy,setBusy]=useState<'save'|'logout'|null>(null);
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    if(!user)return;
    let active=true;
    void run('account.profile',signal=>getMyProfile(signal)).then(res=>{
      if(!active||!res)return;
      setLoading(false);
      if(res.success&&isMyProfile(res.data,user.userId)){setProfile(res.data);setClassCode(res.data.classCode??'');setError('');}
      else {setProfile(null);setError(res.message||'Chưa tải được tài khoản. Vui lòng thử lại.');}
    }).catch(()=>{if(active){setLoading(false);setError('Chưa tải được tài khoản. Vui lòng thử lại.');}});
    return()=>{active=false;};
  },[run,user,retry]);
  const button='min-h-11 cursor-pointer border border-rule-strong px-4 py-2 text-sm disabled:opacity-50';
  if(!user)return <section className="space-y-6 py-8 text-fg">
    <h1 className="text-[30px] font-semibold">Tôi</h1>
    <p className="text-sm text-fg-60">Đăng nhập để lưu tiến độ và quản lý tài khoản của bạn.</p>
    <div className="flex flex-wrap gap-3"><button className={`${button} bg-fg text-bg`} onClick={requireLogin}>Đăng nhập</button><button className={button} onClick={openRegistration??requireLogin}>Đăng ký</button></div>
  </section>;
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(busy)return;setBusy('save');setNotice('');
    const updated=await run('account.class-code',signal=>updateClassCode(classCode.trim(),signal));
    if(!isActive())return;setBusy(null);
    if(isMyProfile(updated,user.userId)){setProfile(updated);setClassCode(updated.classCode??'');setNotice('Đã lưu mã lớp.');updateProfile({...user,classCode:updated.classCode});}
    else setNotice('Chưa lưu được mã lớp. Vui lòng thử lại.');
  };
  return <section className="space-y-8 text-fg">
    <h1 className="text-[30px] font-semibold">Tôi</h1>
    {loading&&<p role="status" className="text-sm text-fg-60">Đang tải tài khoản…</p>}
    {error&&<div className="space-y-4"><p role="status" className="text-sm text-fg-60">{error}</p><button className={button} onClick={()=>{setLoading(true);setError('');setRetry(v=>v+1);}}>Thử lại</button><button className={`${button} ml-3`} onClick={requireLogin}>Đăng nhập lại</button></div>}
    {profile&&<>
      <div className="flex flex-wrap items-center gap-5 bg-card p-6">
        <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center bg-tint text-xl font-semibold">{profile.fullName.trim().split(/\s+/).slice(-2).map(s=>s[0]).join('').toLocaleUpperCase('vi')}</span>
        <div className="min-w-0"><h2 className="break-words text-xl font-semibold">{profile.fullName}</h2><p className="mt-1 break-all text-sm text-fg-60">{profile.email}</p></div>
      </div>
      <dl className="grid gap-5 text-sm sm:grid-cols-2">
        <div><dt className="text-fg-60">Vai trò</dt><dd className="mt-2">{profile.role==='ROLE_ADMIN'?'Quản trị viên':'Học viên'}</dd></div>
        <div><dt className="text-fg-60">Ngày tham gia</dt><dd className="mt-2">{profile.createdAt&&!Number.isNaN(Date.parse(profile.createdAt))?new Date(profile.createdAt).toLocaleDateString('vi-VN'):'Chưa có thông tin'}</dd></div>
      </dl>
      <form onSubmit={save} className="space-y-3 bg-card p-6"><label htmlFor="account-class-code" className="block text-sm font-semibold">Mã lớp</label><div className="flex flex-wrap gap-3"><input id="account-class-code" value={classCode} onChange={e=>setClassCode(e.target.value)} maxLength={50} className="min-h-11 min-w-0 flex-1 border border-rule-strong bg-bg px-3 text-sm"/><button disabled={busy!==null} type="submit" className={button}>{busy==='save'?'Đang lưu…':'Lưu mã lớp'}</button></div></form>
      {notice&&<p role="status" className="text-sm text-fg-60">{notice}</p>}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-6"><span className="text-sm font-semibold">Giao diện sáng / tối</span><ThemeToggle /></div>
    </>}
    <div className="space-y-4"><h2 className="text-lg font-semibold">Quản lý tài khoản</h2><div className="flex flex-wrap gap-3"><button className={button} disabled={busy!==null} onClick={changePassword}>Đổi mật khẩu</button><button className={button} disabled={busy!==null} onClick={async()=>{setBusy('logout');await logout();if(isActive())setBusy(null);}}>{busy==='logout'?'Đang đăng xuất…':'Đăng xuất'}</button></div></div>
  </section>;
}
