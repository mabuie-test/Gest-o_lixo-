import React, { useState } from 'react';
import { login } from '../api';

export default function Login({ onLogin }){
  const [email, setEmail] = useState('admin@example.com');
  const [pw, setPw] = useState('password');
  const [err, setErr] = useState(null);

  async function submit(e){
    e.preventDefault();
    try {
      const res = await login(email, pw);
      onLogin({ token: res.token, user: res.user });
    } catch(e){ setErr('Erro no login'); }
  }

  return (
    <div style={{ maxWidth:380, margin:'80px auto' }}>
      <h2>Entrar</h2>
      <form onSubmit={submit}>
        <div><input value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div><input type="password" value={pw} onChange={e=>setPw(e.target.value)} /></div>
        <div><button>Login</button></div>
        {err && <div style={{color:'red'}}>{err}</div>}
      </form>
    </div>
  );
}
