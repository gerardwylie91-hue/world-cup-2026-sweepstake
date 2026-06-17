import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const draw = {
  players: ['Gerard','Sarah','Barry','Thrish','Fiona','Alan'],
  assignments: {
    Gerard: ['Portugal','Belgium','Mexico','South Korea','Algeria','Sweden','Iraq','Curaçao'],
    Sarah: ['Spain','Morocco','Senegal','Iran','Norway','DR Congo','Jordan','Bosnia-Herzegovina'],
    Barry: ['Brazil','Netherlands','Uruguay','Austria','Ivory Coast','Scotland','South Africa','Cape Verde'],
    Thrish: ['England','Colombia','Japan','Ecuador','Panama','Paraguay','Saudi Arabia','Ghana'],
    Fiona: ['Argentina','Croatia','USA','Turkey','Canada','Tunisia','Qatar','New Zealand'],
    Alan: ['France','Germany','Switzerland','Australia','Egypt','Czech Republic','Uzbekistan','Haiti'],
  }
};

const API = 'https://www.thesportsdb.com/api/v1/json/123';
const rounds = ['1','2','3','125','150','160','170','200','201'];
const stageByRound: Record<string,string> = {'1':'group-1','2':'group-2','3':'group-3','125':'round-32','150':'round-16','160':'semi','170':'final','200':'quarter','201':'semi'};
const groupByTeam: Record<string,string> = {
  Mexico:'A','South Africa':'A','South Korea':'A','Czech Republic':'A',Canada:'B','Bosnia-Herzegovina':'B',Qatar:'B',Switzerland:'B',Brazil:'C',Morocco:'C',Haiti:'C',Scotland:'C',USA:'D',Paraguay:'D',Australia:'D',Turkey:'D',Germany:'E','Curaçao':'E','Ivory Coast':'E',Ecuador:'E',Netherlands:'F',Japan:'F',Sweden:'F',Tunisia:'F',Belgium:'G',Egypt:'G',Iran:'G','New Zealand':'G',Spain:'H','Cape Verde':'H','Saudi Arabia':'H',Uruguay:'H',France:'I',Senegal:'I',Iraq:'I',Norway:'I',Argentina:'J',Algeria:'J',Austria:'J',Jordan:'J',Portugal:'K','DR Congo':'K',Uzbekistan:'K',Colombia:'K',England:'L',Croatia:'L',Ghana:'L',Panama:'L'
};

type Match = { id:string; date:string; time:string; group?:string; round:'group'|'knockout'; stage:string; home:string; away:string; homeScore:number|null; awayScore:number|null; status:'NS'|'LIVE'|'FT' };

function status(s:string|null|undefined): Match['status'] {
  const v = (s || '').toUpperCase();
  if (['FT','AET','PEN','MATCH FINISHED'].includes(v)) return 'FT';
  if (['1H','2H','HT','ET','LIVE','IN PLAY'].includes(v)) return 'LIVE';
  return 'NS';
}

async function matches(fresh=false): Promise<Match[]> {
  const all: Match[] = [];
  await Promise.allSettled(rounds.map(async (r) => {
    const res = await fetch(`${API}/eventsround.php?id=4429&r=${r}&s=2026`, fresh ? {cache:'no-store'} : {next:{revalidate:30}});
    if (!res.ok) return;
    const json = await res.json();
    for (const e of json.events || []) {
      const roundNo = String(e.intRound || r);
      const ko = Number(roundNo) >= 100;
      const home = e.strHomeTeam || 'TBC';
      const away = e.strAwayTeam || 'TBC';
      all.push({ id:String(e.idEvent), date:e.dateEvent || '', time:(e.strTime || '00:00:00').slice(0,8), group:ko ? undefined : (groupByTeam[home] || groupByTeam[away] || ''), round:ko ? 'knockout' : 'group', stage:stageByRound[roundNo] || (ko ? 'knockout' : 'group'), home, away, homeScore:e.intHomeScore === null ? null : Number(e.intHomeScore), awayScore:e.intAwayScore === null ? null : Number(e.intAwayScore), status:status(e.strStatus) });
    }
  }));
  return all.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}

function scorable(m:Match){ return (m.status === 'FT' || m.status === 'LIVE') && m.homeScore !== null && m.awayScore !== null; }
function finished(m:Match){ return m.status === 'FT' && m.homeScore !== null && m.awayScore !== null; }
function progression(team:string, ms:Match[]) { let r32=false,r16=false,q=false,s=false,w=false; for (const m of ms) { if (m.home !== team && m.away !== team) continue; if (m.stage === 'round-32') r32=true; if (m.stage === 'round-16') r16=true; if (m.stage === 'quarter') q=true; if (m.stage === 'semi') s=true; if (m.stage === 'final' && finished(m)) { const homeWon = (m.homeScore as number) > (m.awayScore as number); if ((m.home === team && homeWon) || (m.away === team && !homeWon)) w=true; } } return w?'winner':s?'semi':q?'quarter':r16?'round-16':r32?'group':'none'; }
function progPoints(p:string){ const ladder:any = {group:2,'round-16':5,quarter:9,semi:14,winner:20}; return ladder[p] || 0; }
function build(ms:Match[]) { const players = draw.players.map((player) => { const teams = (draw.assignments as any)[player]; const teamScores = teams.map((team:string) => { let goals=0,wins=0,draws=0,losses=0,ga=0; for (const m of ms) { if (!scorable(m)) continue; const h=m.home===team, a=m.away===team; if (!h && !a) continue; const own = h ? m.homeScore as number : m.awayScore as number; const opp = h ? m.awayScore as number : m.homeScore as number; goals+=own; ga+=opp; if (m.round === 'group') { if (own > opp) wins++; else if (own === opp) draws++; else losses++; } } const prog = progression(team, ms); const goalPoints = goals; const resultPoints = wins*3 + draws; const progressionPoints = progPoints(prog); return {team, goals, ga, gd:goals-ga, wins, draws, losses, progression:prog, goalPoints, resultPoints, progressionPoints, total:goalPoints+resultPoints+progressionPoints}; }); const total=teamScores.reduce((n:any,t:any)=>n+t.total,0); const wins=teamScores.reduce((n:any,t:any)=>n+t.wins,0); const draws=teamScores.reduce((n:any,t:any)=>n+t.draws,0); const losses=teamScores.reduce((n:any,t:any)=>n+t.losses,0); const gf=teamScores.reduce((n:any,t:any)=>n+t.goals,0); const ga=teamScores.reduce((n:any,t:any)=>n+t.ga,0); return {player,total,wins,draws,losses,gf,ga,gd:gf-ga,teams:teamScores}; }).sort((a,b)=>b.total-a.total||b.wins-a.wins||b.gd-a.gd||b.gf-a.gf||a.player.localeCompare(b.player)); return {updatedAt:new Date().toISOString(), players:players.map((p,i)=>({...p,rank:i+1})), meta:{totalMatches:ms.length, playedMatches:ms.filter(finished).length, liveMatches:ms.filter(m=>m.status==='LIVE').length}}; }

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ms = await matches(url.searchParams.get('fresh') === '1');
  return NextResponse.json({standings:build(ms), matches:ms}, {headers:{'Cache-Control':'no-store'}});
}
