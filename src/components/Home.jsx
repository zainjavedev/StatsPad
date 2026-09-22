import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Check, Copy, Download, Moon, Search, Share2, Sun, X } from 'lucide-react';
import { toPng } from 'html-to-image';

const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const TEAM_COLORS = {ATL:'#e03a3e',BOS:'#007a33',BKN:'#777',BRK:'#777',CHA:'#1d1160',CHO:'#1d1160',CHI:'#ce1141',CLE:'#860038',DAL:'#00538c',DEN:'#0e2240',DET:'#c8102e',GSW:'#1d428a',HOU:'#ce1141',IND:'#002d62',LAC:'#c8102e',LAL:'#552583',MEM:'#5d76a9',MIA:'#98002e',MIL:'#00471b',MIN:'#0c2340',NOP:'#0c2340',NYK:'#f58426',OKC:'#007ac1',ORL:'#0077c0',PHI:'#006bb6',PHO:'#1d1160',PHX:'#1d1160',POR:'#e03a3e',SAC:'#5a2d81',SAS:'#8a8d8f',TOR:'#ce1141',UTA:'#6cace4',WAS:'#002b5c'};
const EXTRA_PLAYER_IDS = {'Bez Mbeng':1643016,'Cason Wallace':1641717,'Victor Wembanyama':1641705,'Cade Cunningham':1630595,'Josh Giddey':1630581,'Donovan Clingan':1642270,'Dyson Daniels':1630700,'Ausar Thompson':1641708,'Chet Holmgren':1631096,'Alex Sarr':1642258,'Jalen Williams':1631114,'Jaden McDaniels':1630183,'Jericho Sims':1630579,'Ryan Kalkbrenner':1642267,'Bobby Portis':1626171,'Rui Hachimura':1629060,'Anthony Davis':203076,'Jay Huff':1630643};
const PLAYER_AVATARS = {'Bez Mbeng':'/avatars/bez-mbeng.png','Cason Wallace':'/avatars/cason-wallace.png'};
const JERSEY_COLORS = {LAL:'#FDB927',DEN:'#0E2240',SAS:'#C4CED4',GSW:'#1D428A',UTA:'#F9A01B',MIN:'#236192',OKC:'#007AC1',BOS:'#007A33',BKN:'#111111',NYK:'#F58426',MIA:'#98002E',MIL:'#00471B',PHI:'#006BB6',CLE:'#860038',DAL:'#00538C',HOU:'#CE1141',TOR:'#CE1141',ATL:'#E03A3E',CHI:'#CE1141',DET:'#C8102E',ORL:'#0077C0',IND:'#002D62',MEM:'#5D76A9',NOP:'#0C2340',PHX:'#E56020',POR:'#E03A3E',SAC:'#5A2D81',WAS:'#002B5C',LAC:'#D71920',CHA:'#1D1160'};
const PLAYER_COLOR_OVERRIDES = {'Luke Kennard':['#FDB927','#171717']};
const CARD_THEMES = [['#e06455','#fff'],['#167f88','#fff'],['#5268c9','#fff'],['#d48a3d','#171717']];
const SEASON_BUNDLES = new Map();
function loadSeasonBundle(seasonType){
  if(!SEASON_BUNDLES.has(seasonType)){const suffix=seasonType==='playoffs'?'playoffs':'regular-season';SEASON_BUNDLES.set(seasonType,Promise.all([fetch(`/data/2025-26/${suffix}.json`).then(response=>response.json()),fetch(`/data/2025-26/teams-${suffix}.json`).then(response=>response.json()),fetch(`/data/2025-26/splits-${suffix}.json`).then(response=>response.ok?response.json():null).catch(()=>null)]).then(([players,teams,splits])=>({players,teams,splits})));}
  return SEASON_BUNDLES.get(seasonType);
}
function playerTheme(player,index){if(PLAYER_COLOR_OVERRIDES[player.playerName])return PLAYER_COLOR_OVERRIDES[player.playerName];const background=JERSEY_COLORS[player.team]||CARD_THEMES[index%CARD_THEMES.length][0];const hex=background.replace('#','');const red=parseInt(hex.slice(0,2),16),green=parseInt(hex.slice(2,4),16),blue=parseInt(hex.slice(4,6),16);return [background,(red*299+green*587+blue*114)>145000?'#171717':'#fff']}
const STAT_GROUPS = {
  impact: [['points','PTS'],['assists','AST'],['totalRebounds','REB'],['trueShootingPercentage','TS%'],['steals','STL'],['blocks','BLK']],
  offense: [['points','PTS'],['assists','AST'],['fieldGoalPercentage','FG%'],['threePointPercentage','3P%'],['trueShootingPercentage','TS%'],['turnovers','TOV',true]],
  defense: [['steals','STL'],['blocks','BLK'],['totalRebounds','REB'],['defensiveRebounds','DREB'],['personalFouls','PF',true],['turnovers','TOV',true]],
};
const TABLE_STATS = [['points','Points / game'],['assists','Assists / game'],['totalRebounds','Rebounds / game'],['steals','Steals / game'],['blocks','Blocks / game'],['fieldGoalPercentage','Field goal %'],['threePointPercentage','Three-point %'],['freeThrowPercentage','Free throw %'],['trueShootingPercentage','True shooting %'],['effectiveFieldGoalPercentage','Effective FG %'],['turnovers','Turnovers / game',true]];
const pctKeys = new Set(['fieldGoalPercentage','threePointPercentage','freeThrowPercentage','trueShootingPercentage','effectiveFieldGoalPercentage']);
const valueOf = (player,key) => player?.stats?.[key] ?? 0;
const metricValue = (player,key) => key==='trueShootingPercentage' ? (player?.stats?.fieldGoalsAttempted ? Number((player.stats.points/(2*(player.stats.fieldGoalsAttempted+.44*player.stats.freeThrowsAttempted))*100).toFixed(1)) : 0) : key==='stocks' ? valueOf(player,'steals')+valueOf(player,'blocks') : player?.stats?.[key] ?? player?.[key] ?? 0;
const format = (value,key) => `${Number(value).toFixed(1)}${pctKeys.has(key)?'%':''}`;
const initials = name => name.split(' ').map(part=>part[0]).slice(-2).join('');
const ordinal = value => { const tens = value % 100, ones = value % 10; return `${value}${tens > 10 && tens < 14 ? 'th' : ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th'}`; };
const normalizedName = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace('ć','c');
function EntityArt({entity,playerIds,className=''}){
  const[step,setStep]=useState(0);
  const sources=useMemo(()=>{
    if(entity.entityType==='team')return [`https://cdn.nba.com/logos/nba/${entity.teamId}/global/L/logo.svg`];
    const nbaId=playerIds[normalizedName(entity.playerName)]||playerIds[entity.playerName]||EXTRA_PLAYER_IDS[entity.playerName];
    return [
      PLAYER_AVATARS[entity.playerName],
      nbaId&&`https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`,
    ].filter(Boolean);
  },[entity,playerIds]);
  useEffect(()=>{setStep(0)},[sources]);
  const src=sources[step];
  if(!src)return <img className={`${className} art-fallback-image`} alt={`${entity.playerName} avatar`}
    src={`https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(entity.playerName)}&backgroundColor=${(TEAM_COLORS[entity.team]||'#3b3b45').replace('#','')}&size=512`}/>;
  return <img className={className} src={src} alt="" loading="lazy" onError={()=>setStep(current=>current+1)}/>;
}
function percentile(players,key,value,inverse=false){const values=players.map(p=>valueOf(p,key)).filter(Number.isFinite).sort((a,b)=>a-b);if(!values.length)return 0;const below=values.filter(v=>v<value).length,equal=values.filter(v=>v===value).length,score=Math.round(((below+equal*.5)/values.length)*100);return inverse?100-score:score}

function PercentileBars({entity,population,metrics}){
  return <div className="pct-bars">{metrics.map(([key,label,inverse],row)=>{
    const score=percentile(population,key,valueOf(entity,key),inverse);
    return <div className="pct-bar-row" key={key} style={{'--row':row}}>
      <span className="pct-bar-label">{label}</span>
      <span className="pct-bar-track"><i style={{width:`${score}%`}}></i></span>
      <b>{score}</b>
    </div>})}
    <div className="pct-bar-axis"><span>0</span><span>50</span><span>100</span></div>
  </div>
}

const VS_SECTIONS = [
  ['Season', [['gamesPlayed','Games played',false,0],['minutesPerGame','Minutes per game']]],
  ['Per game', [['points','Points'],['totalRebounds','Rebounds'],['assists','Assists'],['steals','Steals'],['blocks','Blocks'],['turnovers','Turnovers',true]]],
  ['Shooting', [['fieldGoalPercentage','Field goal %'],['threePointPercentage','Three-point %'],['freeThrowPercentage','Free throw %'],['trueShootingPercentage','True shooting %'],['effectiveFieldGoalPercentage','Effective field goal %']]],
];
const TEAM_SECTIONS = [
  ['Per game', [['points','Points'],['assists','Assists'],['totalRebounds','Rebounds'],['offensiveRebounds','Offensive rebounds'],['defensiveRebounds','Defensive rebounds'],['steals','Steals'],['blocks','Blocks'],['turnovers','Turnovers',true],['personalFouls','Fouls',true]]],
  ['Shooting', [['fieldGoalPercentage','Field goal %'],['threePointPercentage','Three-point %'],['threePointersMade','Threes made'],['freeThrowPercentage','Free throw %'],['effectiveFieldGoalPercentage','Effective field goal %'],['trueShootingPercentage','True shooting %']]],
];
const statValue = (entity,key) => entity?.stats?.[key] ?? entity?.[key] ?? 0;
const statText = (value,key,places) => `${Number(value).toFixed(places ?? 1)}${pctKeys.has(key) ? '%' : ''}`;

/* One table row: a value per entity either side of the category name, the
   leader's cell tinted. Percentile rank rides along in the title attribute. */
function VsRow({players,population,metric,row}){
  const[key,label,inverse,places]=metric,values=players.map(player=>statValue(player,key));
  const tied=values[0]===values[1],best=inverse?Math.min(...values):Math.max(...values);
  const cell=index=><span
    className={!tied&&values[index]===best?'vs-cell lead':'vs-cell'}
    key={players[index].playerId||players[index].teamId}
    title={`${players[index].playerName} · ${label}: ${statText(values[index],key,places)} (${ordinal(percentile(population,key,values[index],inverse))} percentile)`}
  >{statText(values[index],key,places)}</span>;
  return <div className="vs-row" style={{'--row':row}}>{cell(0)}<span className="vs-cat">{label}</span>{cell(1)}</div>
}

/* Each side of the card header is also its own picker: a cross to clear the
   slot, an add button and search popover when it is empty. */
function VsSlot({index,entity,options,playerIds,noun,onPick,onRemove}){
  const[open,setOpen]=useState(false),[query,setQuery]=useState('');
  const results=options.filter(option=>`${option.playerName} ${option.team}`.toLowerCase().includes(query.toLowerCase())).slice(0,8);
  const choose=option=>{onPick(option);setOpen(false);setQuery('')};
  return <div className={entity?'vs-person':'vs-person is-empty'} style={{'--player-color':COLORS[index]}}>
    {entity?<>
      <button className="vs-remove" onClick={onRemove} aria-label={`Remove ${entity.playerName}`}><X size={14}/></button>
      <EntityArt entity={entity} playerIds={playerIds} className="vs-art"/>
      <strong>{entity.playerName}</strong>
    </>:
      <button className="vs-add" onClick={()=>setOpen(!open)}><span>+</span> Add {noun}</button>
    }
    {open&&<div className="picker-popover">
      <label><Search size={16}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder={`Search ${noun}s`}/></label>
      <div>{results.map(option=><button key={option.playerId||option.teamId} onClick={()=>choose(option)}>
        <EntityArt entity={option} playerIds={playerIds} className="mini-avatar"/>
        <span><b>{option.playerName}</b><small>{option.team} · {option.stats.points} PPG</small></span>
      </button>)}</div>
    </div>}
  </div>
}

function PlayerPicker({index,player,players,onPick,onRemove,playerIds}){
  const[open,setOpen]=useState(false),[query,setQuery]=useState('');
  const results=players.filter(p=>`${p.playerName} ${p.team}`.toLowerCase().includes(query.toLowerCase())).slice(0,8);
  if(player)return <div className="player-chip" style={{'--accent':COLORS[index]}}><EntityArt entity={player} playerIds={playerIds} className="avatar"/><span><strong>{player.playerName}</strong><small>{player.entityType==='team'?'NBA team':`${player.team} · ${player.position}`} · {player.gamesPlayed} GP</small></span><button onClick={onRemove} aria-label={`Remove ${player.playerName}`}><X size={17}/></button></div>;
  return <div className="picker"><button className="add-player" onClick={()=>setOpen(!open)}><span>+</span> Add {players[0]?.entityType==='team'?'team':'player'}</button>{open&&<div className="picker-popover"><label><Search size={16}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search the league"/></label><div>{results.map(p=><button key={p.playerId||p.teamId} onClick={()=>{onPick(p);setOpen(false);setQuery('')}}><EntityArt entity={p} playerIds={playerIds} className="mini-avatar"/><span><b>{p.playerName}</b><small>{p.team} · {p.stats.points} PPG</small></span></button>)}</div></div>}</div>
}

function SiteHeader({page,onHome,onCompare,theme,onToggleTheme}){
  return <header><button className="brand brand-button" onClick={onHome}><span className="brand-mark">S</span><span>STATSPAD<small>NBA numbers, visualized</small></span></button><nav><button className={page==='home'?'active':''} onClick={onHome}>Home</button><button className={page==='compare'?'active':''} onClick={onCompare}>Compare</button></nav><div className="header-end"><div className="season-pill"><span className="live-dot"></span>2025–26 season complete</div><button className="theme-toggle" onClick={onToggleTheme} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'} title={theme==='dark'?'Light theme':'Dark theme'}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button></div></header>
}

function QuickCompareRail({players,playerIds,onCompare}){
  const[picks,setPicks]=useState([]);
  useEffect(()=>{setPicks(current=>{const names=current.length?current.map(player=>player.playerName):['Luka Dončić','Nikola Jokić'];return names.map(name=>players.find(player=>player.playerName===name)).filter(Boolean).slice(0,2)})},[players]);
  const presets=[['Luka Dončić','Nikola Jokić'],['Shai Gilgeous-Alexander','Anthony Edwards'],['Victor Wembanyama','Chet Holmgren']];
  const choosePreset=names=>setPicks(names.map(name=>players.find(player=>player.playerName===name)).filter(Boolean));
  return <aside className="quick-compare-rail"><small>QUICK COMPARE</small><h2>Pick the matchup.</h2><p>Choose two players, then open the full head-to-head.</p><div className="quick-pickers">{[0,1].map(index=><PlayerPicker key={index} index={index} player={picks[index]} playerIds={playerIds} players={players.filter(player=>!picks.some(selected=>selected.playerName===player.playerName))} onPick={player=>setPicks(current=>{const next=[...current];next[index]=player;return next.slice(0,2)})} onRemove={()=>setPicks(current=>current.filter((_,pickIndex)=>pickIndex!==index))}/>)}</div><button className="quick-compare-go" disabled={picks.length<2} onClick={()=>onCompare(picks)}><BarChart3 size={17}/><span>Compare now<small>{picks.length===2?`${initials(picks[0].playerName)} vs ${initials(picks[1].playerName)}`:'Choose two players'}</small></span><ArrowRight size={17}/></button><div className="quick-presets"><span>POPULAR</span>{presets.map(names=><button key={names.join('|')} onClick={()=>choosePreset(names)}>{names.map(initials).join(' vs ')}</button>)}</div></aside>
}

function Discovery({players,teams,playerIds,onOpen,onCompare,seasonType,onSeasonTypeChange,splits,seasonChanging}){
  const[listCard,setListCard]=useState(null);
  const leaderGroups=[['Scoring leader','points','PPG','scoring'],['Assist leader','assists','APG','playmaking'],['Rebound leader','totalRebounds','RPG','rebounding'],['Offensive-rebound leader','offensiveRebounds','ORB','rebounding'],['Defensive-rebound leader','defensiveRebounds','DRB','rebounding'],['Steal leader','steals','SPG','defense'],['Block leader','blocks','BPG','defense'],['Stocks leader','stocks','STK','defense'],['Field-goal leader','fieldGoalPercentage','FG%','shooting'],['Three-point leader','threePointPercentage','3P%','shooting'],['Free-throw leader','freeThrowPercentage','FT%','shooting'],['True-shooting leader','trueShootingPercentage','TS%','shooting'],['Turnover leader','turnovers','TOV','volume'],['Effective-FG leader','effectiveFieldGoalPercentage','eFG%','shooting'],['Field-goals-made leader','fieldGoalsMade','FGM','volume'],['Three-pointers-made leader','threePointersMade','3PM','volume'],['Free-throws-made leader','freeThrowsMade','FTM','volume'],['Minutes leader','minutesPerGame','MPG','volume'],['Field-goals-attempted leader','fieldGoalsAttempted','FGA','volume'],['Three-pointers-attempted leader','threePointersAttempted','3PA','volume'],['Free-throws-attempted leader','freeThrowsAttempted','FTA','volume'],['Foul leader','personalFouls','PF','defense']];
  const qualifiedPlayers=players.filter(player=>player.gamesPlayed>=15&&player.minutesPerGame>=10);
  const leaderPool=qualifiedPlayers.length?qualifiedPlayers:players;
  const leaderCards=leaderGroups.map(([label,key,suffix,category])=>{const pool=key==='threePointPercentage'?leaderPool.filter(player=>player.stats.threePointersAttempted>=3):key==='freeThrowPercentage'?leaderPool.filter(player=>player.stats.freeThrowsAttempted>=2):leaderPool;const leaders=[...(pool.length?pool:leaderPool)].sort((a,b)=>metricValue(b,key)-metricValue(a,key)).slice(0,5);return {label,key,suffix,category,player:leaders[0],leaders}}).filter(card=>card.player);
  const visibleCards=leaderCards;
  const playerById=new Map(players.map(player=>[player.playerId,player]));
  const situationCards=splits?[...Object.entries(splits.quarters).map(([quarter,leaders])=>({label:`${quarter} scoring leader`,suffix:'PTS',valueKey:'pts',leaders,player:leaders[0],value:leaders[0]?.pts})),...(splits.clutch?.length?[{label:'Clutch scoring leader',suffix:'CLUTCH PTS',valueKey:'clutchPoints',leaders:splits.clutch,player:splits.clutch[0],value:splits.clutch[0]?.clutchPoints}]:[])].filter(card=>card.player):[];
  return <div className="muse-layout"><div className={`muse-main ${seasonChanging?'season-changing':''}`}>
    <div className="home-dashboard"><section className="muse-home-grid"><div className="story-feed"><div className="feed-heading"><h2>NBA stat cards</h2><div className="season-toggle" role="group" aria-label="Season type"><button className={seasonType==='regular-season'?'active':''} onClick={()=>onSeasonTypeChange('regular-season')}>Regular season</button><button className={seasonType==='playoffs'?'active':''} onClick={()=>onSeasonTypeChange('playoffs')}>Playoffs</button></div></div>{visibleCards.map((card,index)=><StoryCard key={`${card.key}-${card.player.playerId}`} player={card.player} leaders={card.leaders} index={index} label={card.label} statKey={card.key} suffix={card.suffix} playerIds={playerIds} onOpen={onOpen} onOpenList={setListCard}/>)}{situationCards.map((card,index)=><SituationCard key={card.label} card={card} index={index} player={playerById.get(card.player.playerId)||card.player} playerIds={playerIds} onOpen={onOpen} onOpenList={setListCard}/>)}</div></section><QuickCompareRail players={players} playerIds={playerIds} onCompare={onCompare}/></div>{splits&&<SplitGrid splits={splits} playerIds={playerIds} players={players} onOpen={onOpen}/>} {listCard&&<StatListModal card={listCard} playerIds={playerIds} onOpen={onOpen} onClose={()=>setListCard(null)}/>}
    <section className="trend-panels"><TrendPanel title="Top players by scoring" items={players.slice(0,5)} playerIds={playerIds} onOpen={onOpen}/><TrendPanel title="Top teams by scoring" items={teams.slice(0,5)} playerIds={playerIds} onOpen={onOpen}/><TrendPanel title="Quick comparisons" items={players.slice(0,5).map(p=>({...p,searchName:`${p.playerName} vs ${players[(p.rank||1)%players.length]?.playerName}`}))} playerIds={playerIds} onOpen={onOpen}/></section>
    <section className="discovery-content"><div className="section-title"><div><small>BROWSE PLAYERS</small><h2>Open a player profile</h2></div><span>2025–26 regular season</span></div><div className="player-scroll">{players.slice(0,10).map((player,index)=><button className="visual-player-card" key={player.playerId} onClick={()=>onOpen(player)} style={{'--team':TEAM_COLORS[player.team]||'#333'}}><span className="trend-rank">0{index+1}</span><EntityArt entity={player} playerIds={playerIds} className="card-player-art"/><div><small>{player.team} · {player.position}</small><h3>{player.playerName}</h3><p><b>{format(player.stats.points,'points')}</b> PTS <b>{format(player.stats.assists,'assists')}</b> AST</p></div></button>)}</div>
      <div className="dashboard-grid"><section className="leaders-panel"><div className="section-title compact"><div><small>THE NUMBERS</small><h2>League leaders</h2></div></div><div className="leader-tabs">{leaderGroups.map(([title,key,suffix])=><article key={key}><h3>{title}</h3>{[...players].sort((a,b)=>valueOf(b,key)-valueOf(a,key)).slice(0,5).map((player,i)=><button key={player.playerId} onClick={()=>onOpen(player)}><span>{i+1}</span><EntityArt entity={player} playerIds={playerIds} className="tiny-art"/><b>{player.playerName}</b><strong>{format(valueOf(player,key),key)} <small>{suffix}</small></strong></button>)}</article>)}</div></section>
        <section className="teams-panel"><div className="section-title compact"><div><small>ALL 30 CLUBS</small><h2>Browse teams</h2></div></div><div className="team-cloud">{teams.map(team=><button key={team.teamId} onClick={()=>onOpen(team)} title={team.playerName}><EntityArt entity={team} playerIds={playerIds} className="team-cloud-logo"/><span>{team.team}</span></button>)}</div><button className="compare-cta" onClick={onCompare}><BarChart3 size={18}/><span><b>Build a comparison</b><small>Players or teams, side by side</small></span><ArrowRight size={18}/></button></section></div>
    </section></div></div>
}

function TrendPanel({title,items,playerIds,onOpen}){return <section className="trend-panel"><h2>{title}</h2>{items.map((item,index)=><button key={item.playerId||item.teamId||index} onClick={()=>onOpen(item)}><span>{index+1}</span><EntityArt entity={item} playerIds={playerIds} className="trend-art"/><b>{item.searchName||item.playerName}</b><strong>{item.entityType==='team'?item.team:`${format(item.stats.points,'points')} PPG`}</strong></button>)}</section>}
function SituationCard({card,index,player,playerIds,onOpenList}){const cardRef=useRef(null),[background,text]=playerTheme(player,index+3),openList=()=>onOpenList({title:card.label,player,leaders:card.leaders,statKey:card.valueKey,suffix:card.suffix});return <article ref={cardRef} className="story-card situation-card" style={{'--story-color':background,'--story-text':text}} onClick={openList} role="button" tabIndex={0}><span className="story-watermark" aria-hidden="true">{initials(player.playerName)}</span><div className="story-copy"><small>{card.label.toUpperCase()}</small><h2>{player.playerName}</h2><strong className="story-stat">{card.value.toFixed(0)} {card.suffix}</strong><div className="leader-list">{card.leaders.slice(1,5).map((leader,position)=><span key={leader.playerId}><small>{position+2}</small><b>{leader.playerName}</b><strong>{Number(leader[card.valueKey]).toFixed(0)} {card.suffix}</strong></span>)}</div></div><EntityArt entity={player} playerIds={playerIds} className="story-art"/><button className="card-download" aria-label={`Download ${card.label}`} onClick={event=>{event.stopPropagation();downloadCard(cardRef.current,`${player.playerName}-${card.suffix}`)}}><Download size={16}/></button></article>}
function SplitGrid({splits,playerIds,players,onOpen}){const byId=new Map(players.map(player=>[player.playerId,player]));return <section className="split-grid-wrap"><div className="split-heading"><div><small>SITUATIONAL STATS</small><h2>Quarter & clutch leaders</h2></div><span>SportsFBI split feed · 2025–26 regular season</span></div><div className="split-grid"><section className="split-panel quarter-panel"><h3>Most points by quarter</h3><div className="quarter-columns">{Object.entries(splits.quarters).map(([quarter,leaders])=><div key={quarter}><b>{quarter}</b>{leaders.slice(0,5).map((leader,index)=><button key={leader.playerId} onClick={()=>byId.has(leader.playerId)&&onOpen(byId.get(leader.playerId))}><span>{index+1}</span><EntityArt entity={byId.get(leader.playerId)||leader} playerIds={playerIds} className="split-avatar"/><strong>{leader.playerName}</strong><em>{leader.pts.toFixed(1)} PTS</em></button>)}</div>)}</div></section><section className="split-panel clutch-panel"><h3>Clutch scoring leaders</h3><p>Close games: final margin of five points or fewer.</p>{splits.clutch.slice(0,6).map((leader,index)=><button key={leader.playerId} onClick={()=>byId.has(leader.playerId)&&onOpen(byId.get(leader.playerId))}><span>{index+1}</span><EntityArt entity={byId.get(leader.playerId)||leader} playerIds={playerIds} className="split-avatar"/><strong>{leader.playerName}</strong><em>{leader.clutchPoints.toLocaleString()} PTS · {leader.pts.toFixed(1)} PPG</em></button>)}</section></div></section>}
async function downloadCard(node,name){const dataUrl=await toPng(node,{pixelRatio:2,cacheBust:true});const link=document.createElement('a');link.download=`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;link.href=dataUrl;link.click()}
function StoryCard({player,leaders,index,label,statKey,suffix,playerIds,onOpenList}){const cardRef=useRef(null),stat=format(metricValue(player,statKey),statKey),[background,text]=playerTheme(player,index),openList=()=>onOpenList({title:label,player,leaders,statKey,suffix});return <article ref={cardRef} className={`story-card story-${index}`} style={{'--story-color':background,'--story-text':text}} onClick={openList} role="button" tabIndex={0} onKeyDown={event=>event.key==='Enter'&&openList()}><span className="story-watermark" aria-hidden="true">{initials(player.playerName)}</span><div className="story-copy"><small>{label.toUpperCase()}</small><h2>{player.playerName}</h2><strong className="story-stat">{stat} {suffix}</strong><div className="leader-list">{leaders.slice(1).map((leader,position)=><span key={leader.playerId}><small>{position+2}</small><b>{leader.playerName}</b><strong>{format(metricValue(leader,statKey),statKey)} {suffix}</strong></span>)}</div></div><EntityArt entity={player} playerIds={playerIds} className="story-art"/><button className="card-download" aria-label={`Download ${label}`} onClick={event=>{event.stopPropagation();downloadCard(cardRef.current,`${player.playerName}-${suffix}`)}}><Download size={16}/></button></article>}
function StatListModal({card,playerIds,onOpen,onClose}){return <div className="stat-modal-backdrop" onClick={onClose}><section className="stat-modal" onClick={event=>event.stopPropagation()}><button className="stat-modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button><small>FULL LEADERBOARD</small><h2>{card.title}</h2><p>2025–26 regular season · top {card.leaders.length}</p>{card.leaders.map((leader,index)=><button className="stat-modal-row" key={leader.playerId} onClick={()=>onOpen(leader)}><span>{index+1}</span><EntityArt entity={leader} playerIds={playerIds} className="split-avatar"/><b>{leader.playerName}</b><strong>{format(metricValue(leader,card.statKey),card.statKey)} {card.suffix}</strong></button>)}</section></div>}

function Profile({entity,allEntities,playerIds,onBack,onCompare}){
  const stats=[['points','PTS'],['totalRebounds','REB'],['assists','AST'],['steals','STL'],['blocks','BLK'],['trueShootingPercentage','TS%']];
  const enriched={...entity,stats:{...entity.stats,trueShootingPercentage:entity.stats.fieldGoalsAttempted?entity.stats.points/(2*(entity.stats.fieldGoalsAttempted+.44*entity.stats.freeThrowsAttempted))*100:0}};
  const population=allEntities.map(item=>({...item,stats:{...item.stats,trueShootingPercentage:item.stats.fieldGoalsAttempted?item.stats.points/(2*(item.stats.fieldGoalsAttempted+.44*item.stats.freeThrowsAttempted))*100:0}}));
  return <section className="profile-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/> Back to explore</button><div className="profile-hero" style={{'--team':TEAM_COLORS[entity.team]||'#333'}}><div className="profile-copy"><small>{entity.entityType==='team'?'NBA TEAM':`${entity.team} · ${entity.position}`} · 2025–26</small><h1>{entity.playerName}</h1><p>{entity.entityType==='team'?`${entity.gamesPlayed} games · ${format(entity.stats.points,'points')} points per game`:`Age ${entity.age} · ${entity.gamesPlayed} games · ${entity.gamesStarted} starts`}</p><button onClick={()=>onCompare(entity)}><BarChart3 size={17}/> Compare {entity.entityType==='team'?'team':'player'}</button></div><div className="profile-art-wrap"><div></div><EntityArt entity={entity} playerIds={playerIds} className="profile-art"/></div></div>
    <div className="profile-grid"><section className="profile-main"><div className="section-title compact"><div><small>SEASON SNAPSHOT</small><h2>At a glance</h2></div></div><div className="big-stats">{stats.slice(0,3).map(([key,label])=><article key={key}><strong>{format(valueOf(enriched,key),key)}</strong><span>{label}</span><small>{percentile(population,key,valueOf(enriched,key))}th percentile</small></article>)}</div></section>
      <aside className="profile-side"><small>PLAYER PROFILE</small><h2>League percentile</h2><PercentileBars entity={enriched} population={population} metrics={STAT_GROUPS.impact}/></aside></div>
  </section>
}

function ComparisonPage({data,entityType,setEntityType,seasonType,switchSeason,enriched,setSelected,playerIds,enrichedPopulation,chartRef,onHome,onShare,onDownload,onCopy,toast,theme,onToggleTheme}){
  const ready=enriched.length>=2,noun=entityType==='team'?'teams':'players';
  return <main className="h2h-main"><SiteHeader page="compare" onHome={onHome} onCompare={()=>{}} theme={theme} onToggleTheme={onToggleTheme}/><section className="h2h-page">
    <div className="h2h-bar">
      <div className="segmented mode"><button className={entityType==='player'?'active':''} onClick={()=>setEntityType('player')}>Players</button><button className={entityType==='team'?'active':''} onClick={()=>setEntityType('team')}>Teams</button></div>
      <div className="segmented season"><button className={seasonType==='regular-season'?'active':''} onClick={()=>switchSeason('regular-season')}>Regular season</button><button className={seasonType==='playoffs'?'active':''} onClick={()=>switchSeason('playoffs')}>Playoffs</button></div>
      <div className="h2h-bar-actions">
        <button className="ghost-button" onClick={onShare} title="Copy a link to this comparison"><Share2 size={15}/> Share</button>
        <button className="ghost-button" onClick={onCopy} disabled={!ready} title="Copy the verdict as text"><Copy size={15}/> Copy</button>
        <button className="ghost-button" onClick={onDownload} disabled={!ready} title="Save this comparison as an image"><Download size={15}/> Save</button>
      </div>
    </div>
    <section className="vs-card" ref={chartRef}>
      <div className="vs-head">
        {[0,1].map(index=><VsSlot key={index} index={index} entity={enriched[index]} playerIds={playerIds} noun={entityType==='team'?'team':'player'}
          options={data.players.filter(option=>!enriched.some(selected=>selected.playerName===option.playerName))}
          onPick={option=>setSelected([...enriched,option].slice(0,2))}
          onRemove={()=>setSelected(enriched.filter((_,position)=>position!==index))}/>)}
        <span className="vs-badge">VS</span>
      </div>
      {ready?<><div className="vs-table" key={enriched.map(player=>player.playerName).join('|')}>
        {(entityType==='team'?TEAM_SECTIONS:VS_SECTIONS).map(([title,metrics])=><React.Fragment key={title}>
          <div className="vs-section">{title}</div>
          {metrics.map((metric,row)=><VsRow key={metric[0]} players={enriched} population={enrichedPopulation} metric={metric} row={row}/>)}
        </React.Fragment>)}
      </div>
      <p className="vs-note">Highlighted cell leads the category; fewer turnovers counts as leading. Hover any value for its league percentile among {enrichedPopulation.length} qualified {noun}.</p></>
      :<p className="vs-empty">Pick two {noun} above and the comparison builds itself.</p>}
    </section>
  </section><footer><span>StatsPad · made for smarter hoops arguments</span><span>2025–26 data from <a href={data.source.url} target="_blank" rel="noreferrer">Basketball Reference</a> · Updated {data.lastUpdated}</span></footer>{toast&&<div className="toast"><Check size={16}/>{toast}</div>}</main>
}

export default function Home(){
  const paramsOnLoad=useMemo(()=>new URLSearchParams(location.search),[]);
  const[seasonType,setSeasonType]=useState(()=>paramsOnLoad.get('type')||'regular-season'),[seasonChanging,setSeasonChanging]=useState(false),[entityType,setEntityType]=useState(()=>paramsOnLoad.get('mode')||'player'),[data,setData]=useState(null),[splits,setSplits]=useState(null),[selected,setSelected]=useState([]),[toast,setToast]=useState(''),[playerIds,setPlayerIds]=useState({}),[catalog,setCatalog]=useState({players:[],teams:[]}),[page,setPage]=useState(paramsOnLoad.has('players')?'compare':paramsOnLoad.has('profile')?'profile':'home'),[profile,setProfile]=useState(null);
  const chartRef=useRef(null),seasonTransitionRef=useRef(0);
  const[theme,setTheme]=useState(()=>{try{return localStorage.getItem('statspad-theme')||'light'}catch{return 'light'}});
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('statspad-theme',theme)}catch{/* private mode */}},[theme]);
  const toggleTheme=()=>setTheme(current=>current==='dark'?'light':'dark');
  useEffect(()=>{fetch('/data/player-ids.json').then(r=>r.json()).then(ids=>setPlayerIds(Object.fromEntries(Object.entries(ids).map(([name,id])=>[normalizedName(name),id]))))},[]);
  useEffect(()=>{loadSeasonBundle('regular-season');loadSeasonBundle('playoffs')},[]);
  useEffect(()=>{let active=true;loadSeasonBundle(seasonType).then(bundle=>{if(!active)return;setCatalog({players:bundle.players.players,teams:bundle.teams.players});setSplits(bundle.splits);setData(entityType==='team'?bundle.teams:bundle.players)});return()=>{active=false}},[seasonType,entityType]);
  useEffect(()=>{const name=paramsOnLoad.get('profile');if(!name||profile)return;const match=[...catalog.players,...catalog.teams].find(item=>item.playerName===name);if(match)setProfile(match)},[catalog,paramsOnLoad,profile]);
  useEffect(()=>{if(!data)return;const params=new URLSearchParams(location.search),names=params.get('players')?.split('|').filter(Boolean);const defaults=names?.length?names:(entityType==='team'?['Oklahoma City Thunder','New York Knicks']:['Luka Dončić','Shai Gilgeous-Alexander']);setSelected(defaults.map(name=>data.players.find(p=>p.playerName===name)).filter(Boolean).slice(0,2))},[data,entityType]);
  const population=useMemo(()=>data?.players.filter(p=>entityType==='team'||(p.gamesPlayed>=(seasonType==='playoffs'?3:15)&&p.minutesPerGame>=10))||[],[data,seasonType,entityType]);
  const enrich=p=>({...p,stats:{...p.stats,trueShootingPercentage:p.stats.fieldGoalsAttempted?Number((p.stats.points/(2*(p.stats.fieldGoalsAttempted+.44*p.stats.freeThrowsAttempted))*100).toFixed(1)):0}});
  const enriched=useMemo(()=>selected.map(enrich),[selected]);
  const enrichedPopulation=useMemo(()=>population.map(enrich),[population]);
  const notify=message=>{setToast(message);setTimeout(()=>setToast(''),2200)};
  const switchSeason=async next=>{if(next===seasonType||seasonChanging)return;const transition=++seasonTransitionRef.current;setSeasonChanging(true);try{const[bundle]=await Promise.all([loadSeasonBundle(next),new Promise(resolve=>window.setTimeout(resolve,180))]);if(transition!==seasonTransitionRef.current)return;setCatalog({players:bundle.players.players,teams:bundle.teams.players});setSplits(bundle.splits);setData(entityType==='team'?bundle.teams:bundle.players);setSeasonType(next);window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>setSeasonChanging(false)))}catch{setSeasonChanging(false)}};
  const share=async()=>{const params=new URLSearchParams({players:enriched.map(p=>p.playerName).join('|'),type:seasonType,mode:entityType}),url=`${location.origin}${location.pathname}?${params}`;await navigator.clipboard.writeText(url);notify('Comparison link copied')};
  const copyTake=async()=>{const leaders=TABLE_STATS.slice(0,5).map(([key,label,inverse])=>{const ordered=[...enriched].sort((a,b)=>(valueOf(b,key)-valueOf(a,key))*(inverse?-1:1));return `${label}: ${ordered[0]?.playerName} (${format(valueOf(ordered[0],key),key)})`});await navigator.clipboard.writeText(`${enriched.map(p=>p.playerName).join(' vs ')} — 2025-26 ${data.seasonType}\n\n${leaders.join('\n')}\n\nMade with StatsPad`);notify('Debate-ready take copied')};
  const download=()=>{if(chartRef.current)downloadCard(chartRef.current,`${enriched.map(p=>p.playerName).join('-vs-')}-comparison`)};
  if(!data)return <main className="loading"><span></span>Loading the league…</main>;
  const goHome=()=>{setPage('home');setProfile(null);history.replaceState({},'',location.pathname)};
  const openProfile=item=>{setProfile(item);setPage('profile');history.pushState({},'',`?profile=${encodeURIComponent(item.playerName)}`);scrollTo({top:0,behavior:'smooth'})};
  const openCompare=item=>{if(item){const items=Array.isArray(item)?item:[item],isTeam=items[0]?.entityType==='team';setEntityType(isTeam?'team':'player');setSelected(items.slice(0,2))}setPage('compare');setProfile(null);scrollTo({top:0,behavior:'smooth'})};
  if(page==='home')return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} theme={theme} onToggleTheme={toggleTheme}/><Discovery players={catalog.players} teams={catalog.teams} playerIds={playerIds} onOpen={openProfile} onCompare={()=>openCompare()} seasonType={seasonType} onSeasonTypeChange={switchSeason} seasonChanging={seasonChanging} splits={splits}/><footer><span>StatsPad · NBA numbers, visualized</span><span>2025–26 data from <a href={data.source.url} target="_blank" rel="noreferrer">Basketball Reference</a></span></footer></main>;
  if(page==='profile'&&profile){const entities=profile.entityType==='team'?catalog.teams:catalog.players;return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} theme={theme} onToggleTheme={toggleTheme}/><Profile entity={profile} allEntities={entities} playerIds={playerIds} onBack={goHome} onCompare={openCompare}/><footer><span>StatsPad · NBA numbers, visualized</span><span>2025–26 data from <a href={data.source.url} target="_blank" rel="noreferrer">Basketball Reference</a></span></footer></main>}
  return <ComparisonPage data={data} entityType={entityType} setEntityType={setEntityType} seasonType={seasonType} switchSeason={switchSeason} enriched={enriched} setSelected={setSelected} playerIds={playerIds} enrichedPopulation={enrichedPopulation} chartRef={chartRef} onHome={goHome} onShare={share} onDownload={download} onCopy={copyTake} toast={toast} theme={theme} onToggleTheme={toggleTheme}/>;
}
