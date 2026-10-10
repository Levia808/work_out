import { useState } from 'react';
import { Button, Input } from '@heroui/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const submit = async () => {
    setMessage('');
    if (!email || password.length < 6) {
      setMessage('请输入邮箱，密码至少 6 位。');
      return;
    }
    const result = mode === 'login' ? await auth.signIn(email, password) : await auth.signUp(email, password);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(mode === 'signup' && auth.configured ? '注册成功，请检查邮箱后登录。' : '');
    if (mode === 'login' || !auth.configured) navigate(from, { replace: true });
  };
  return <div className="install-page page-transition"><main className="card install-card"><div className="install-mark">＋</div><p className="eyebrow">FITTRACK ACCOUNT</p><h1 className="fit-title" style={{ fontSize: '2.7rem', marginTop: 8 }}>{mode === 'login' ? '欢迎回来。' : '开始记录。'}</h1><p className="fit-subtitle" style={{ marginTop: 14 }}>{auth.configured ? '使用邮箱登录，同步你的健康数据。' : '当前为演示模式，配置 Supabase 后即可同步。'}</p><div className="stack" style={{ marginTop: 24 }}><Input label="邮箱" type="email" value={email} onValueChange={setEmail} variant="flat" classNames={{ inputWrapper: 'input-field', label: 'muted' }} /><Input label="密码" type="password" value={password} onValueChange={setPassword} variant="flat" classNames={{ inputWrapper: 'input-field', label: 'muted' }} />{message ? <p className="card-copy" style={{ color: '#fff' }}>{message}</p> : null}<Button className="primary-btn" onPress={submit}>{mode === 'login' ? '登录 FitTrack' : '创建账号'}</Button><button className="secondary-btn" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? '没有账号？注册' : '已有账号？登录'}</button><Link to="/install" className="muted" style={{ textAlign: 'center', fontSize: '.82rem' }}>先看看安装引导</Link></div></main></div>;
}
