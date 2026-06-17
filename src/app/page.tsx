"use client";
import { useEffect, useMemo, useState } from 'react';

type Player = { rank:number; player:string; total:number; wins:number; draws:number; losses:number; gf:number; ga:number; gd:number; teams:any[] };
type Match = { id:string; date:string; time:string; group?:string; round:string; stage:string; home:string; away:string; homeScore:number|null; awayScore:number|null; status:string };

type Payload = { standings:{ players:Player[]; meta:{totalMatches:number; playedMatches:number; liveMatches:number}}, matches:Match[] };

function dateLabel(d:string){ return d ? new Intl.DateTimeFormat('en-IE',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(d+'T12:00:00')) : 'TBC'; }
function timeLabel(t:string){ return t ? t.slice(0,5) : 'TBC'; }

export default function Home(){
  const [data,setData]=useState<Payload|null>(null);
  const [refreshed,setRefreshed]=useState('');
  const [error,setError]=useState('');

  async function load(fresh=false){
    try{
      const res=await fetch(fresh?'/api/standings?fresh=1':'/api/standings',{cache:'no-store'});
      if(!res.ok) throw new Error('load failed');
      setData(await res.json());
      setRefreshed(new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
      setError('');
    }catch(e){setError('Live feed unavailable. Try refresh again.');}
  }

  useEffect(()=>{load(); const id=setInterval(()=>load(),60000); return()=>clearInterval(id);},[]);

  const owners=useMemo(()=>{const o:Record<string,string>={}; data?.standings.players.forEach(p=>p.teams.forEach(t=>o[t.team]=p.player)); return o;},[data]);
  const leader=data?.standings.players[0];

  return <main className="page">
    <section className="hero">
      <div><p className="eyebrow">FIFA World Cup 2026 · Live Sweepstake</p><h1>World Cup Sweepstake</h1><p className="sub">Original live scoring rules restored: goals, group wins/draws and cumulative progression bonuses. Updated with your six contestants and teams.</p><button className="btn" onClick={()=>load(true)}>Refresh live scores</button><span className="btn">Auto-refresh: 60 sec</span>{refreshed&&<span className="btn">Updated {refreshed}</span>}{error&&<p className="error">{error}</p>}</div>
      <div className="card"><span>Current Leader</span><strong>{leader?.player||'Loading'}</strong><p>{leader?.total||0} points</p></div>
    </section>
    <section className="grid"><div className="card"><span>Contestants</span><strong>{data?.standings.players.length||6}</strong></div><div className="card"><span>Teams</span><strong>48</strong></div><div className="card"><span>Live</span><strong>{data?.standings.meta.liveMatches||0}</strong></div><div className="card"><span>Played</span><strong>{data?`${data.standings.meta.playedMatches}/${data.standings.meta.totalMatches}`:'0/0'}</strong></div></section>
    <section className="section"><h2>Leaderboard</h2><p>Ranked by total points, wins, goal difference, then goals scored.</p><div className="tableWrap"><table><thead><tr><th>Rank</th><th>Player</th><th>Pts</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th></tr></thead><tbody>{data?.standings.players.map(p=><tr key={p.player}><td>#{p.rank}</td><td><strong>{p.player}</strong></td><td>{p.total}</td><td>{p.wins}</td><td>{p.draws}</td><td>{p.losses}</td><td>{p.gf}</td><td>{p.ga}</td><td>{p.gd}</td></tr>)}</tbody></table></div></section>
    <section className="section"><h2>Contestants & Teams</h2><div className="players">{data?.standings.players.map(p=><div className="player" key={p.player}><h3>{p.player}</h3><div className="chips">{p.teams.map(t=><span className="chip" key={t.team}>{t.team} · {t.total} pts</span>)}</div></div>)}</div></section>
    <section className="section"><h2>Fixtures & Results</h2><div className="matches">{(data?.matches||[]).map(m=><article className="match" key={m.id}><div><strong>{timeLabel(m.time)}</strong><div className="small">{dateLabel(m.date)} · {m.round==='group'?`Group ${m.group}`:m.stage}</div></div><div className="teams"><div><strong>{m.home}</strong><div className="small">{owners[m.home]||'TBC'}</div></div><em>vs</em><div><strong>{m.away}</strong><div className="small">{owners[m.away]||'TBC'}</div></div></div><div className="score"><span className={m.status==='LIVE'?'live':''}>{m.homeScore==null?'—':`${m.homeScore}-${m.awayScore}`} {m.status}</span></div></article>)}</div></section>
    <section className="section rules"><h2>Rules</h2><p>Goal scored by your team: +1. Group-stage win: +3. Group-stage draw: +1.</p><p>Progression bonuses are cumulative: Round of 32 +2, Round of 16 +3, quarter-final +4, semi-final +5, tournament winner +6.</p></section>
  </main>;
}
