import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Brand, Icon } from './ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export interface NavItem { to: string; label: string; icon: string; end?: boolean }
export interface NavGroup { label?: string; items: NavItem[] }

export function Shell({ groups, title, crumb, actions, children }: { groups: NavGroup[]; title: string; crumb?: string; actions?: ReactNode; children: ReactNode }) {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  async function logout() { await supabase.auth.signOut(); nav('/login'); }
  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`side ${open ? 'open' : ''}`}>
        <Brand small />
        {groups.map((g, i) => (
          <nav className="nav" key={i}>
            {g.label && <div className="nav-label">{g.label}</div>}
            {g.items.map(it => (
              <NavLink key={it.to} to={it.to} end={it.end} onClick={() => setOpen(false)}>
                <Icon name={it.icon} />{it.label}
              </NavLink>
            ))}
          </nav>
        ))}
        <div className="side-foot">
          <b>{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Usuário'}</b>
          {profile?.email}
          <br /><button onClick={logout}>Sair da conta</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="row" style={{ gap: 12, flexWrap: 'nowrap', minWidth: 0 }}>
            <button className="mobile-nav-toggle" onClick={() => setOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button>
            <div style={{ minWidth: 0 }}>
              {crumb && <div className="crumb">{crumb}</div>}
              <h1 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
            </div>
          </div>
          <div className="row">{actions}</div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
