import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,test,vi} from 'vitest';
import {AccountView} from '../../src/features/account/AccountView';
const state=vi.hoisted(()=>({user:null as any,login:vi.fn(),register:vi.fn(),logout:vi.fn(),password:vi.fn(),update:vi.fn(),get:vi.fn(),save:vi.fn()}));
vi.mock('../../src/app/useAuth',()=>({useAuth:()=>({user:state.user,requireLogin:state.login,openRegistration:state.register,logout:state.logout,changePassword:state.password,updateProfile:state.update})}));
vi.mock('../../src/features/account/api',()=>({getMyProfile:(...args:any[])=>state.get(...args),updateClassCode:(...args:any[])=>state.save(...args)}));
const profile={id:31,email:'fixture@jiayou.test',fullName:'Nguyễn Ánh 汉字 nǚ',role:'ROLE_USER',classCode:'LỚP-01',createdAt:'2026-10-31T00:00:00Z',isActive:true};
beforeEach(()=>{vi.clearAllMocks();state.user=null;state.get.mockResolvedValue({success:true,data:profile});state.save.mockResolvedValue({...profile,classCode:'LỚP-02'});});
const signIn=()=>{state.user={userId:31,fullName:'Cached profile must not be displayed',role:'ROLE_USER'};};
test('guest account has separate login/register actions and makes no private request',()=>{
 render(<AccountView/>);fireEvent.click(screen.getByRole('button',{name:'Đăng nhập'}));fireEvent.click(screen.getByRole('button',{name:'Đăng ký'}));expect(state.login).toHaveBeenCalledOnce();expect(state.register).toHaveBeenCalledOnce();expect(state.get).not.toHaveBeenCalled();expect(screen.queryByText(profile.email)).toBeNull();
});
test('server profile is read-only, Vietnamese-first and contains no auth metadata',async()=>{
 signIn();state.get.mockResolvedValue({success:true,data:{...profile,passwordHash:'MUST_NOT_RENDER',accessToken:'SECRET_TEST_ONLY'}});render(<AccountView/>);
 expect(await screen.findByText(profile.fullName)).toBeTruthy();expect(screen.getByText('Học viên')).toBeTruthy();expect(screen.getByText('31/10/2026')).toBeTruthy();expect(screen.getByText(profile.email)).toBeTruthy();expect(screen.queryByText('MUST_NOT_RENDER')).toBeNull();expect(screen.queryByText('SECRET_TEST_ONLY')).toBeNull();expect(screen.queryByText(state.user.fullName)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Đổi mật khẩu'}));expect(state.password).toHaveBeenCalledOnce();
 fireEvent.change(screen.getByLabelText('Mã lớp'),{target:{value:' LỚP-02 '}});fireEvent.click(screen.getByRole('button',{name:'Lưu mã lớp'}));await screen.findByText('Đã lưu mã lớp.');expect(state.save.mock.calls[0][0]).toBe('LỚP-02');
});
test('profile with another owner is rejected even if the API reports success',async()=>{
 signIn();state.get.mockResolvedValue({success:true,data:{...profile,id:32,email:'other@jiayou.test'}});render(<AccountView/>);await screen.findByRole('button',{name:'Thử lại'});expect(screen.queryByText('other@jiayou.test')).toBeNull();expect(screen.queryByLabelText('Mã lớp')).toBeNull();
});

test('malformed profile fails closed while session management remains available',async()=>{
 signIn();state.get.mockResolvedValue({success:true,data:{id:31,email:profile.email,fullName:null,role:'ROLE_USER'}});render(<AccountView/>);
 await screen.findByRole('button',{name:'Thử lại'});expect(screen.queryByText(profile.email)).toBeNull();expect(screen.queryByLabelText('Mã lớp')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Đăng xuất'}));expect(state.logout).toHaveBeenCalledOnce();
});
test('late response from the previous account never appears after account switching',async()=>{
 signIn();let first!:(data:unknown)=>void;state.get.mockImplementationOnce(()=>new Promise(resolve=>{first=resolve;}));const view=render(<AccountView/>);
 state.user={userId:32,role:'ROLE_USER'};state.get.mockResolvedValue({success:true,data:{...profile,id:32,email:'second@jiayou.test',fullName:'Người thứ hai'}});view.rerender(<AccountView/>);await screen.findByText('Người thứ hai');first({success:true,data:profile});await waitFor(()=>expect(screen.queryByText(profile.email)).toBeNull());
});
