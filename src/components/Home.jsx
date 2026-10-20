import AccountButton from './AccountButton';
import AccountPage from './AccountPage';
import SchedulePage from './SchedulePage';
import StandingsPage from './StandingsPage';
import GamePage from './GamePage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, Check, Copy, Download, Home as HomeIcon, Link2, ListOrdered, Moon, Search, Sun, Trophy, Users, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import TeamPage from './TeamPage';
import TeamsIndex from './TeamsIndex';
import Radar from './Radar';
import TeamLineups from './TeamLineups';
import { CompareSkeleton, HomeSkeleton, PageSkeleton, TeamLoading } from './Skeletons';
import { TEAMS, espnLogoUrl, nickname, teamCodeOf } from '../lib/teams';
import { loadLatest, minGames, pretty, qualified } from '../lib/season';
import { compareUrl, matchesName, playerUrl, routeParams, teamUrl } from '../lib/routes';
import FrontPage from './FrontPage';
import PlayerBody from './PlayerBody';
import { headshotSources, loadHeadshotIds } from '../lib/headshots';
import ShareButton from './ShareButton';

const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const TEAM_COLORS = {ATL:'#e03a3e',BOS:'#007a33',BKN:'#777',BRK:'#777',CHA:'#1d1160',CHO:'#1d1160',CHI:'#ce1141',CLE:'#860038',DAL:'#00538c',DEN:'#0e2240',DET:'#c8102e',GSW:'#1d428a',HOU:'#ce1141',IND:'#002d62',LAC:'#c8102e',LAL:'#552583',MEM:'#5d76a9',MIA:'#98002e',MIL:'#00471b',MIN:'#0c2340',NOP:'#0c2340',NYK:'#f58426',OKC:'#007ac1',ORL:'#0077c0',PHI:'#006bb6',PHO:'#1d1160',PHX:'#1d1160',POR:'#e03a3e',SAC:'#5a2d81',SAS:'#8a8d8f',TOR:'#ce1141',UTA:'#6cace4',WAS:'#002b5c'};
const EXTRA_PLAYER_IDS = {'Bez Mbeng':1643016,'Cason Wallace':1641717,'Victor Wembanyama':1641705,'Cade Cunningham':1630595,'Josh Giddey':1630581,'Donovan Clingan':1642270,'Dyson Daniels':1630700,'Ausar Thompson':1641708,'Chet Holmgren':1631096,'Alex Sarr':1642258,'Jalen Williams':1631114,'Jaden McDaniels':1630183,'Jericho Sims':1630579,'Ryan Kalkbrenner':1642267,'Bobby Portis':1626171,'Rui Hachimura':1629060,'Anthony Davis':203076,'Jay Huff':1630643};
const PLAYER_AVATARS = {'Bez Mbeng':'/avatars/bez-mbeng.png','Cason Wallace':'/avatars/cason-wallace.png'};
const JERSEY_COLORS = {LAL:'#FDB927',DEN:'#0E2240',SAS:'#C4CED4',GSW:'#1D428A',UTA:'#F9A01B',MIN:'#236192',OKC:'#007AC1',BOS:'#007A33',BKN:'#111111',NYK:'#F58426',MIA:'#98002E',MIL:'#00471B',PHI:'#006BB6',CLE:'#860038',DAL:'#00538C',HOU:'#CE1141',TOR:'#CE1141',ATL:'#E03A3E',CHI:'#CE1141',DET:'#C8102E',ORL:'#0077C0',IND:'#002D62',MEM:'#5D76A9',NOP:'#0C2340',PHX:'#E56020',POR:'#E03A3E',SAC:'#5A2D81',WAS:'#002B5C',LAC:'#D71920',CHA:'#1D1160'};
const PLAYER_COLOR_OVERRIDES = {'Luke Kennard':['#FDB927','#171717']};
const CARD_THEMES = [['#e06455','#fff'],['#167f88','#fff'],['#5268c9','#fff'],['#d48a3d','#171717']];
const SEASON_BUNDLES = new Map();
function loadSeasonBundle(seasonType){
  if(!SEASON_BUNDLES.has(seasonType))SEASON_BUNDLES.set(seasonType,loadLatest(seasonType==='playoffs'?'playoffs':'regular-season'));
  return SEASON_BUNDLES.get(seasonType);
}
function playerTheme(player,index){if(PLAYER_COLOR_OVERRIDES[player.playerName])return PLAYER_COLOR_OVERRIDES[player.playerName];const background=JERSEY_COLORS[player.team]||CARD_THEMES[index%CARD_THEMES.length][0];const hex=background.replace('#','');const red=parseInt(hex.slice(0,2),16),green=parseInt(hex.slice(2,4),16),blue=parseInt(hex.slice(4,6),16);return [background,(red*299+green*587+blue*114)>145000?'#171717':'#fff']}
const STAT_GROUPS = {
  impact: [['points','PPG'],['assists','APG'],['totalRebounds','RPG'],['trueShootingPercentage','TS%'],['steals','SPG'],['blocks','BPG']],
  offense: [['points','PPG'],['assists','APG'],['fieldGoalPercentage','FG%'],['threePointPercentage','3P%'],['trueShootingPercentage','TS%'],['turnovers','TOV',true]],
  defense: [['steals','SPG'],['blocks','BPG'],['totalRebounds','RPG'],['defensiveRebounds','DRB'],['personalFouls','PF',true],['turnovers','TOV',true]],
};
const TABLE_STATS = [['points','PPG'],['assists','APG'],['totalRebounds','RPG'],['steals','SPG'],['blocks','BPG'],['fieldGoalPercentage','FG%'],['threePointPercentage','3P%'],['freeThrowPercentage','FT%'],['trueShootingPercentage','TS%'],['effectiveFieldGoalPercentage','eFG%'],['turnovers','TOV',true]];
const pctKeys = new Set(['turnoverPercentage','fieldGoalPercentage','threePointPercentage','freeThrowPercentage','trueShootingPercentage','effectiveFieldGoalPercentage']);
const valueOf = (player,key) => player?.stats?.[key] ?? 0;
const metricValue = (player,key) => key==='trueShootingPercentage' ? (player?.stats?.fieldGoalsAttempted ? Number((player.stats.points/(2*(player.stats.fieldGoalsAttempted+.44*player.stats.freeThrowsAttempted))*100).toFixed(1)) : 0) : key==='stocks' ? valueOf(player,'steals')+valueOf(player,'blocks') : player?.stats?.[key] ?? player?.[key] ?? 0;
const format = (value,key) => `${Number(value).toFixed(1)}${pctKeys.has(key)?'%':''}`;
const initials = name => name.split(' ').map(part=>part[0]).slice(-2).join('');
const ordinal = value => { const tens = value % 100, ones = value % 10; return `${value}${tens > 10 && tens < 14 ? 'th' : ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th'}`; };
function EntityArt({entity,playerIds,className=''}){
  const[step,setStep]=useState(0);
  const sources=useMemo(()=>{
    if(entity.entityType==='team'){const code=teamCodeOf(entity.team);return [`https://cdn.nba.com/logos/nba/${entity.teamId}/global/L/logo.svg`,TEAMS[code]&&espnLogoUrl(code)].filter(Boolean)}
    return [
      PLAYER_AVATARS[entity.playerName],
      ...headshotSources(entity,playerIds,EXTRA_PLAYER_IDS),
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

const metric = (key,label,full,inverse=false,places) => [key,label,inverse,places,full];
const VS_SECTIONS = [
  ['Season', [metric('gamesPlayed','GP','Games played',false,0),metric('minutesPerGame','MPG','Minutes per game')]],
  ['Per game', [metric('points','PPG','Points per game'),metric('totalRebounds','RPG','Rebounds per game'),metric('assists','APG','Assists per game'),metric('steals','SPG','Steals per game'),metric('blocks','BPG','Blocks per game'),metric('turnoverPercentage','TOV%','Turnover rate: turnovers per 100 plays (lower is better)',true)]],
  ['Shooting', [metric('fieldGoalPercentage','FG%','Field goal %'),metric('threePointPercentage','3P%','Three-point % (needs 1+ attempt a game)'),metric('freeThrowPercentage','FT%','Free throw % (needs 1+ attempt a game)'),metric('trueShootingPercentage','TS%','True shooting %'),metric('effectiveFieldGoalPercentage','eFG%','Effective field goal %')]],
];
/* One radar of seven skills. Each axis is one or two box-score stats, scaled from the league's lowest to highest rotation player; a two-stat axis averages them. */
const RADAR_AXES = [
  {label:'Scoring',parts:[['points','PPG']]},
  {label:'Efficiency',parts:[['trueShootingPercentage','TS%']]},
  {label:'FG%',parts:[['fieldGoalPercentage','FG%']]},
  {label:'3P%',parts:[['threePointPercentage','3P%']]},
  {label:'Playmaking',parts:[['assists','APG']]},
  {label:'Rebounding',parts:[['totalRebounds','RPG']]},
  {label:'Defense',parts:[['steals','SPG'],['blocks','BPG']]},
];
const TEAM_SECTIONS = [
  ['Per game', [metric('points','PPG','Points per game'),metric('assists','APG','Assists per game'),metric('totalRebounds','RPG','Rebounds per game'),metric('offensiveRebounds','ORB','Offensive rebounds per game'),metric('defensiveRebounds','DRB','Defensive rebounds per game'),metric('steals','SPG','Steals per game'),metric('blocks','BPG','Blocks per game'),metric('turnoverPercentage','TOV%','Turnover rate: turnovers per 100 plays (lower is better)',true),metric('personalFouls','PF','Fouls per game (fewer is better)',true)]],
  ['Shooting', [metric('fieldGoalPercentage','FG%','Field goal %'),metric('threePointPercentage','3P%','Three-point %'),metric('threePointersMade','3PM','Threes made per game'),metric('freeThrowPercentage','FT%','Free throw %'),metric('effectiveFieldGoalPercentage','eFG%','Effective field goal %'),metric('trueShootingPercentage','TS%','True shooting %')]],
];
const sideColor = entity => TEAMS[teamCodeOf(entity?.team)]?.color || '#3b3b45';
/* Turnovers per 100 plays that end in a shot, free throw or turnover: fairer than raw turnovers, which punish anyone who handles the ball a lot. */
const turnoverRate = stats => {const plays=stats.fieldGoalsAttempted+.44*stats.freeThrowsAttempted+stats.turnovers;return plays?Number((stats.turnovers/plays*100).toFixed(1)):0};
/* A percentage only counts once there is a real sample behind it: a centre who takes 0.1 threes a game has no three-point percentage worth ranking. */
const volumeOk = (entity,key) => key==='threePointPercentage'?(entity.stats?.threePointersAttempted??0)>=1:key==='freeThrowPercentage'?(entity.stats?.freeThrowsAttempted??0)>=1:true;
const teamLabel = code => /^\dTM$/.test(code)?`${code[0]} teams`:code;
const statValue = (entity,key) => entity?.stats?.[key] ?? entity?.[key] ?? 0;
const statText = (value,key,places) => `${Number(value).toFixed(places ?? 1)}${pctKeys.has(key) ? '%' : ''}`;

/* One table row: a value per entity either side of the category name, the
   leader's cell tinted. Percentile rank rides along in the title attribute. */
function leadOf(players,[key,,inverse]){
  const eligible=players.map(player=>volumeOk(player,key));
  if(!eligible[0]&&!eligible[1])return -1;
  if(eligible[0]!==eligible[1])return eligible[0]?0:1;
  const values=players.map(player=>statValue(player,key));
  if(values[0]===values[1])return -1;
  return (inverse?values[0]<values[1]:values[0]>values[1])?0:1;
}

function VsRow({players,population,metric,row,colors}){
  const[key,label,inverse,places,full]=metric,values=players.map(player=>statValue(player,key)),lead=leadOf(players,metric);
  const best=inverse?Math.min(...values):Math.max(...values);
  const ratio=value=>inverse?(value<=0?1:best/value):(best>0?Math.max(0,value)/best:0);
  const cell=index=><span
    className={['vs-cell',lead===index&&'lead',!volumeOk(players[index],key)&&'thin'].filter(Boolean).join(' ')}
    style={{'--wr':Math.max(.04,ratio(values[index])),'--c':colors[index]}}
    key={players[index].playerId||players[index].teamId}
    title={volumeOk(players[index],key)?`${players[index].playerName} · ${full||label}: ${statText(values[index],key,places)} (${ordinal(percentile(population.filter(entity=>volumeOk(entity,key)),key,values[index],inverse))} percentile)`:`${players[index].playerName} · ${full||label}: ${statText(values[index],key,places)}, too few attempts to rank`}
  >{statText(values[index],key,places)}</span>;
  return <div className="vs-row" style={{'--row':row}}>{cell(0)}<span className="vs-cat">{label}</span>{cell(1)}</div>
}

/* Each side of the card header is also its own picker: a cross to clear the
   slot, an add button and search popover when it is empty. */
function VsSlot({index,entity,options,playerIds,noun,onPick,onRemove,color}){
  const[open,setOpen]=useState(false),[query,setQuery]=useState('');
  const results=options.filter(option=>`${option.playerName} ${option.team}`.toLowerCase().includes(query.toLowerCase())).slice(0,8);
  const choose=option=>{onPick(option);setOpen(false);setQuery('')};
  return <div className={entity?'vs-person':'vs-person is-empty'} style={{'--player-color':COLORS[index],'--team':color}}>
    {entity?<>
      <button className="vs-remove" onClick={onRemove} aria-label={`Remove ${entity.playerName}`}><X size={14}/></button>
      <EntityArt entity={entity} playerIds={playerIds} className={entity.entityType==='team'?'vs-art is-logo':'vs-art'}/>
      <strong>{entity.playerName}</strong>
      {entity.entityType!=='team'&&<small>{[teamLabel(entity.team),entity.position].filter(Boolean).join(' · ')}</small>}
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

const NAV_ITEMS = [['home','Home',HomeIcon],['schedule','Schedule',CalendarDays],['standings','Standings',ListOrdered],['leaders','Leaders',Trophy],['compare','Compare',BarChart3],['teams','Teams',Users]];

/* A banner div, not <header>, so none of the old header rules apply. The tab
   bar is a sibling because a blurred parent would trap a fixed child. */
function SiteHeader({page,onHome,onLeaders,onCompare,onTeams,theme,onToggleTheme}){
  const current=page==='team'?'teams':page,go={home:onHome,leaders:onLeaders,compare:onCompare,teams:onTeams,schedule:()=>location.assign('/schedule'),standings:()=>location.assign('/standings')};
  const tabs=className=><nav className={className} aria-label="Main">{NAV_ITEMS.map(([key,label,Icon])=><button key={key} className={current===key?'active':''} aria-current={current===key?'page':undefined} onClick={()=>go[key]()}><Icon size={19} className="nav-icon"/><span>{label}</span></button>)}</nav>;
  return <>
    <div className="site-header" role="banner"><div className="site-header-inner">
      <button className="site-brand" onClick={()=>onHome()}>StatsPads</button>
      {tabs('site-nav')}
      <div className="site-header-end"><AccountButton/><button className="theme-toggle" onClick={onToggleTheme} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'} title={theme==='dark'?'Light theme':'Dark theme'}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button></div>
    </div></div>
    {tabs('tabbar')}
  </>;
}

function QuickCompareRail({players,playerIds,onCompare}){
  const[picks,setPicks]=useState([]);
  useEffect(()=>{setPicks(current=>{const names=current.length?current.map(player=>player.playerName):['Luka Dončić','Nikola Jokić'];return names.map(name=>players.find(player=>player.playerName===name)).filter(Boolean).slice(0,2)})},[players]);
  const presets=[['Luka Dončić','Nikola Jokić'],['Shai Gilgeous-Alexander','Anthony Edwards'],['Victor Wembanyama','Chet Holmgren']];
  const choosePreset=names=>setPicks(names.map(name=>players.find(player=>player.playerName===name)).filter(Boolean));
  return <aside className="quick-compare-rail"><small>QUICK COMPARE</small><h2>Pick the matchup.</h2><p>Choose two players, then open the full head-to-head.</p><div className="quick-pickers">{[0,1].map(index=><PlayerPicker key={index} index={index} player={picks[index]} playerIds={playerIds} players={players.filter(player=>!picks.some(selected=>selected.playerName===player.playerName))} onPick={player=>setPicks(current=>{const next=[...current];next[index]=player;return next.slice(0,2)})} onRemove={()=>setPicks(current=>current.filter((_,pickIndex)=>pickIndex!==index))}/>)}</div><button className="quick-compare-go" disabled={picks.length<2} onClick={()=>onCompare(picks)}><BarChart3 size={17}/><span>Compare now<small>{picks.length===2?`${initials(picks[0].playerName)} vs ${initials(picks[1].playerName)}`:'Choose two players'}</small></span><ArrowRight size={17}/></button><div className="quick-presets"><span>POPULAR</span>{presets.map(names=><button key={names.join('|')} onClick={()=>choosePreset(names)}>{names.map(initials).join(' vs ')}</button>)}</div></aside>
}

function Discovery({players,teams,playerIds,onOpen,onCompare,seasonType,onSeasonTypeChange,splits,seasonChanging,season}){
  const[listCard,setListCard]=useState(null);
  const leaderGroups=[['Scoring leader','points','PPG','scoring'],['Assist leader','assists','APG','playmaking'],['Rebound leader','totalRebounds','RPG','rebounding'],['Offensive-rebound leader','offensiveRebounds','ORB','rebounding'],['Defensive-rebound leader','defensiveRebounds','DRB','rebounding'],['Steal leader','steals','SPG','defense'],['Block leader','blocks','BPG','defense'],['Stocks leader','stocks','STK','defense'],['Field-goal leader','fieldGoalPercentage','FG%','shooting'],['Three-point leader','threePointPercentage','3P%','shooting'],['Free-throw leader','freeThrowPercentage','FT%','shooting'],['True-shooting leader','trueShootingPercentage','TS%','shooting'],['Turnover leader','turnovers','TOV','volume'],['Effective-FG leader','effectiveFieldGoalPercentage','eFG%','shooting'],['Field-goals-made leader','fieldGoalsMade','FGM','volume'],['Three-pointers-made leader','threePointersMade','3PM','volume'],['Free-throws-made leader','freeThrowsMade','FTM','volume'],['Minutes leader','minutesPerGame','MPG','volume'],['Field-goals-attempted leader','fieldGoalsAttempted','FGA','volume'],['Three-pointers-attempted leader','threePointersAttempted','3PA','volume'],['Free-throws-attempted leader','freeThrowsAttempted','FTA','volume'],['Foul leader','personalFouls','PF','defense']];
  const qualifiedPlayers=qualified(players);
  const leaderPool=qualifiedPlayers.length?qualifiedPlayers:players;
  const leaderCards=leaderGroups.map(([label,key,suffix,category])=>{const pool=key==='threePointPercentage'?leaderPool.filter(player=>player.stats.threePointersAttempted>=3):key==='freeThrowPercentage'?leaderPool.filter(player=>player.stats.freeThrowsAttempted>=2):leaderPool;const leaders=[...(pool.length?pool:leaderPool)].sort((a,b)=>metricValue(b,key)-metricValue(a,key)).slice(0,5);return {label,key,suffix,category,player:leaders[0],leaders}}).filter(card=>card.player);
  const visibleCards=leaderCards;
  const playerById=new Map(players.map(player=>[player.playerId,player]));
  const situationCards=splits?[...Object.entries(splits.quarters).map(([quarter,leaders])=>({label:`${quarter} scoring leader`,suffix:'PTS',valueKey:'pts',leaders,player:leaders[0],value:leaders[0]?.pts})),...(splits.clutch?.length?[{label:'Clutch scoring leader',suffix:'CLUTCH PTS',valueKey:'clutchPoints',leaders:splits.clutch,player:splits.clutch[0],value:splits.clutch[0]?.clutchPoints}]:[])].filter(card=>card.player):[];
  return <div className="muse-layout"><div className={`muse-main ${seasonChanging?'season-changing':''}`}>
    <div className="home-dashboard"><section className="muse-home-grid"><div className="story-feed"><div className="feed-heading"><h2>NBA stat cards</h2><div className="season-toggle" role="group" aria-label="Season type"><button className={seasonType==='regular-season'?'active':''} onClick={()=>onSeasonTypeChange('regular-season')}>Regular season</button><button className={seasonType==='playoffs'?'active':''} onClick={()=>onSeasonTypeChange('playoffs')}>Playoffs</button></div></div>{visibleCards.map((card,index)=><StoryCard key={`${card.key}-${card.player.playerId}`} player={card.player} leaders={card.leaders} index={index} label={card.label} statKey={card.key} suffix={card.suffix} playerIds={playerIds} onOpen={onOpen} onOpenList={setListCard}/>)}{situationCards.map((card,index)=><SituationCard key={card.label} card={card} index={index} player={playerById.get(card.player.playerId)||card.player} playerIds={playerIds} onOpen={onOpen} onOpenList={setListCard}/>)}</div></section><QuickCompareRail players={players} playerIds={playerIds} onCompare={onCompare}/></div>{splits&&<SplitGrid splits={splits} playerIds={playerIds} players={players} onOpen={onOpen}/>} {listCard&&<StatListModal card={listCard} season={season} playerIds={playerIds} onOpen={onOpen} onClose={()=>setListCard(null)}/>}
    <section className="trend-panels"><TrendPanel title="Top players by scoring" items={players.slice(0,5)} playerIds={playerIds} onOpen={onOpen}/><TrendPanel title="Top teams by scoring" items={teams.slice(0,5)} playerIds={playerIds} onOpen={onOpen}/><TrendPanel title="Quick comparisons" items={players.slice(0,5).map(p=>({...p,searchName:`${p.playerName} vs ${players[(p.rank||1)%players.length]?.playerName}`}))} playerIds={playerIds} onOpen={onOpen}/></section>
    <section className="discovery-content"><div className="section-title"><div><small>BROWSE PLAYERS</small><h2>Open a player profile</h2></div><span>{season?pretty(season):''} regular season</span></div><div className="player-scroll">{players.slice(0,10).map((player,index)=><button className="visual-player-card" key={player.playerId} onClick={()=>onOpen(player)} style={{'--team':TEAM_COLORS[player.team]||'#333'}}><span className="trend-rank">0{index+1}</span><EntityArt entity={player} playerIds={playerIds} className="card-player-art"/><div><small>{player.team} · {player.position}</small><h3>{player.playerName}</h3><p><b>{format(player.stats.points,'points')}</b> PTS <b>{format(player.stats.assists,'assists')}</b> AST</p></div></button>)}</div>
      <div className="dashboard-grid"><section className="leaders-panel"><div className="section-title compact"><div><small>THE NUMBERS</small><h2>League leaders</h2></div></div><div className="leader-tabs">{leaderGroups.map(([title,key,suffix])=><article key={key}><h3>{title}</h3>{[...players].sort((a,b)=>valueOf(b,key)-valueOf(a,key)).slice(0,5).map((player,i)=><button key={player.playerId} onClick={()=>onOpen(player)}><span>{i+1}</span><EntityArt entity={player} playerIds={playerIds} className="tiny-art"/><b>{player.playerName}</b><strong>{format(valueOf(player,key),key)} <small>{suffix}</small></strong></button>)}</article>)}</div></section>
        <section className="teams-panel"><div className="section-title compact"><div><small>ALL 30 CLUBS</small><h2>Browse teams</h2></div></div><div className="team-cloud">{teams.map(team=><button key={team.teamId} onClick={()=>onOpen(team)} title={team.playerName}><EntityArt entity={team} playerIds={playerIds} className="team-cloud-logo"/><span>{team.team}</span></button>)}</div><button className="compare-cta" onClick={onCompare}><BarChart3 size={18}/><span><b>Build a comparison</b><small>Players or teams, side by side</small></span><ArrowRight size={18}/></button></section></div>
    </section></div></div>
}

function TrendPanel({title,items,playerIds,onOpen}){return <section className="trend-panel"><h2>{title}</h2>{items.map((item,index)=><button key={item.playerId||item.teamId||index} onClick={()=>onOpen(item)}><span>{index+1}</span><EntityArt entity={item} playerIds={playerIds} className="trend-art"/><b>{item.searchName||item.playerName}</b><strong>{item.entityType==='team'?item.team:`${format(item.stats.points,'points')} PPG`}</strong></button>)}</section>}
function SituationCard({card,index,player,playerIds,onOpenList}){const cardRef=useRef(null),[background,text]=playerTheme(player,index+3),openList=()=>onOpenList({title:card.label,player,leaders:card.leaders,statKey:card.valueKey,suffix:card.suffix});return <article ref={cardRef} className="story-card situation-card" style={{'--story-color':background,'--story-text':text}} onClick={openList} role="button" tabIndex={0}><span className="story-watermark" aria-hidden="true">{initials(player.playerName)}</span><div className="story-copy"><small>{card.label.toUpperCase()}</small><h2>{player.playerName}</h2><strong className="story-stat">{card.value.toFixed(0)} {card.suffix}</strong><div className="leader-list">{card.leaders.slice(1,5).map((leader,position)=><span key={leader.playerId}><small>{position+2}</small><b>{leader.playerName}</b><strong>{Number(leader[card.valueKey]).toFixed(0)} {card.suffix}</strong></span>)}</div></div><EntityArt entity={player} playerIds={playerIds} className="story-art"/><button className="card-download" aria-label={`Download ${card.label}`} onClick={event=>{event.stopPropagation();downloadCard(cardRef.current,`${player.playerName}-${card.suffix}`)}}><Download size={16}/></button></article>}
function SplitGrid({splits,playerIds,players,onOpen}){const byId=new Map(players.map(player=>[player.playerId,player]));return <section className="split-grid-wrap"><div className="split-heading"><div><small>SITUATIONAL STATS</small><h2>Quarter & clutch leaders</h2></div><span>SportsFBI split feed · {pretty(splits.season||'2025-26')} regular season</span></div><div className="split-grid"><section className="split-panel quarter-panel"><h3>Most points by quarter</h3><div className="quarter-columns">{Object.entries(splits.quarters).map(([quarter,leaders])=><div key={quarter}><b>{quarter}</b>{leaders.slice(0,5).map((leader,index)=><button key={leader.playerId} onClick={()=>byId.has(leader.playerId)&&onOpen(byId.get(leader.playerId))}><span>{index+1}</span><EntityArt entity={byId.get(leader.playerId)||leader} playerIds={playerIds} className="split-avatar"/><strong>{leader.playerName}</strong><em>{leader.pts.toFixed(1)} PTS</em></button>)}</div>)}</div></section><section className="split-panel clutch-panel"><h3>Clutch scoring leaders</h3><p>Close games: final margin of five points or fewer.</p>{splits.clutch.slice(0,6).map((leader,index)=><button key={leader.playerId} onClick={()=>byId.has(leader.playerId)&&onOpen(byId.get(leader.playerId))}><span>{index+1}</span><EntityArt entity={byId.get(leader.playerId)||leader} playerIds={playerIds} className="split-avatar"/><strong>{leader.playerName}</strong><em>{leader.clutchPoints.toLocaleString()} PTS · {leader.pts.toFixed(1)} PPG</em></button>)}</section></div></section>}
async function downloadCard(node,name){const dataUrl=await toPng(node,{pixelRatio:2,cacheBust:true});const link=document.createElement('a');link.download=`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;link.href=dataUrl;link.click()}
function StoryCard({player,leaders,index,label,statKey,suffix,playerIds,onOpenList}){const cardRef=useRef(null),stat=format(metricValue(player,statKey),statKey),[background,text]=playerTheme(player,index),openList=()=>onOpenList({title:label,player,leaders,statKey,suffix});return <article ref={cardRef} className={`story-card story-${index}`} style={{'--story-color':background,'--story-text':text}} onClick={openList} role="button" tabIndex={0} onKeyDown={event=>event.key==='Enter'&&openList()}><span className="story-watermark" aria-hidden="true">{initials(player.playerName)}</span><div className="story-copy"><small>{label.toUpperCase()}</small><h2>{player.playerName}</h2><strong className="story-stat">{stat} {suffix}</strong><div className="leader-list">{leaders.slice(1).map((leader,position)=><span key={leader.playerId}><small>{position+2}</small><b>{leader.playerName}</b><strong>{format(metricValue(leader,statKey),statKey)} {suffix}</strong></span>)}</div></div><EntityArt entity={player} playerIds={playerIds} className="story-art"/><button className="card-download" aria-label={`Download ${label}`} onClick={event=>{event.stopPropagation();downloadCard(cardRef.current,`${player.playerName}-${suffix}`)}}><Download size={16}/></button></article>}
function StatListModal({card,season,playerIds,onOpen,onClose}){const leaderSpec={kind:'list',eyebrow:`${season?pretty(season):''} leaders`,title:card.title.replace(/ leader$/i,' leaders'),sub:`${card.suffix} · ${season?pretty(season):''} regular season`,color:'#5b8def',rows:card.leaders.slice(0,8).map((leader,index)=>({lead:index+1,person:{name:leader.playerName,playerId:leader.playerId},name:leader.playerName,sub:leader.team&&!/^\dTM$/.test(leader.team)?leader.team:'',value:format(metricValue(leader,card.statKey),card.statKey)})),foot:'Regulars only: 15+ games, 10+ minutes',path:'/leaders'};return <div className="stat-modal-backdrop" onClick={onClose}><section className="stat-modal" onClick={event=>event.stopPropagation()}><button className="stat-modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button><small>FULL LEADERBOARD</small><h2>{card.title}</h2><p>{season?pretty(season):''} regular season · top {card.leaders.length}</p><ShareButton spec={leaderSpec} filename={`${card.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`} title={`${card.title}`} text={`${card.title}: ${card.leaders[0]?.playerName} leads the NBA`} path="/leaders" className="ghost-button stat-modal-share"/>{card.leaders.map((leader,index)=><button className="stat-modal-row" key={leader.playerId} onClick={()=>onOpen(leader)}><span>{index+1}</span><EntityArt entity={leader} playerIds={playerIds} className="split-avatar"/><b>{leader.playerName}</b><strong>{format(metricValue(leader,card.statKey),card.statKey)} {card.suffix}</strong></button>)}</section></div>}

function Profile({entity,season,playoffs,allEntities,playerIds,onBack,backLabel='Back to explore',onCompare,onOpen}){
  const stats=[['points','PPG'],['totalRebounds','RPG'],['assists','APG'],['steals','SPG'],['blocks','BPG'],['trueShootingPercentage','TS%']];
  const enriched={...entity,stats:{...entity.stats,trueShootingPercentage:entity.stats.fieldGoalsAttempted?entity.stats.points/(2*(entity.stats.fieldGoalsAttempted+.44*entity.stats.freeThrowsAttempted))*100:0}};
  const population=allEntities.map(item=>({...item,stats:{...item.stats,trueShootingPercentage:item.stats.fieldGoalsAttempted?item.stats.points/(2*(item.stats.fieldGoalsAttempted+.44*item.stats.freeThrowsAttempted))*100:0}}));
  const rankIn=key=>1+population.filter(item=>valueOf(item,key)>valueOf(enriched,key)).length;
  const teamSpec=entity.entityType==='team'?{kind:'tiles',eyebrow:`Team stats · ${season?pretty(season):''}`,title:entity.playerName,sub:`${entity.gamesPlayed} games · per game, ranked among ${population.length} teams`,color:sideColor(entity),
    tiles:[['points','PPG'],['assists','APG'],['totalRebounds','RPG'],['steals','SPG'],['blocks','BPG'],['fieldGoalPercentage','FG%'],['threePointPercentage','3P%'],['freeThrowPercentage','FT%'],['trueShootingPercentage','TS%']].map(([key,label])=>({label,value:format(valueOf(enriched,key),key),note:`${ordinal(rankIn(key))} in the NBA`})),foot:'Basketball Reference per-game stats',path:`/?profile=${encodeURIComponent(entity.playerName)}`}:null;
  return <section className="profile-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/> {backLabel}</button><div className="profile-hero" style={{'--team':TEAM_COLORS[entity.team]||'#333'}}><div className="profile-copy"><small>{entity.entityType==='team'?'NBA TEAM':`${entity.team} · ${entity.position}`} · {season?pretty(season):''}</small><h1>{entity.playerName}</h1><p>{entity.entityType==='team'?`${entity.gamesPlayed} games · ${format(entity.stats.points,'points')} points per game`:`Age ${entity.age} · ${entity.gamesPlayed} games · ${entity.gamesStarted} starts`}</p><button onClick={()=>onCompare(entity)}><BarChart3 size={17}/> Compare {entity.entityType==='team'?'team':'player'}</button>{entity.entityType==='team'&&<ShareButton spec={teamSpec} filename={`${entity.playerName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-stats`} title={entity.playerName} text={`${entity.playerName} team stats`} path={`/?profile=${encodeURIComponent(entity.playerName)}`} className="profile-share"/>}</div><div className="profile-art-wrap"><div></div><EntityArt entity={entity} playerIds={playerIds} className="profile-art"/></div></div>
    {entity.entityType==='team'?<div className="profile-grid"><section className="profile-main"><div className="section-title compact"><div><small>SEASON SNAPSHOT</small><h2>At a glance</h2></div></div><div className="big-stats">{stats.slice(0,3).map(([key,label])=><article key={key}><strong>{format(valueOf(enriched,key),key)}</strong><span>{label}</span><small>{percentile(population,key,valueOf(enriched,key))}th percentile</small></article>)}</div></section>
      <aside className="profile-side"><small>PLAYER PROFILE</small><h2>League percentile</h2><PercentileBars entity={enriched} population={population} metrics={STAT_GROUPS.impact}/></aside></div>:<PlayerBody entity={entity} season={season} population={playoffs?allEntities.filter(item=>item.gamesPlayed>=3&&item.minutesPerGame>=10):qualified(allEntities)} showCareer={!playoffs} onOpen={onOpen} onCompare={onCompare} bars={<PercentileBars entity={enriched} population={population} metrics={STAT_GROUPS.impact}/>}/>}
  </section>
}

function ComparisonPage({leaguePlayers,onTeams,onLeaders,data,entityType,setEntityType,seasonType,switchSeason,enriched,setSelected,playerIds,enrichedPopulation,chartRef,onHome,onShare,onCopy,toast,theme,onToggleTheme}){
  const ready=enriched.length>=2,noun=entityType==='team'?'teams':'players';
  const colors=[0,1].map(index=>sideColor(enriched[index]));
  const sections=entityType==='team'?TEAM_SECTIONS:VS_SECTIONS;
  /* Each axis runs from the league's lowest rotation player at the centre to its highest at the edge, so the gap between two stars shows (a percentile would put the top two scorers on the same dot). */
  const radarRange=part=>{const values=enrichedPopulation.filter(entity=>volumeOk(entity,part)).map(entity=>valueOf(entity,part)).filter(Number.isFinite);return[Math.min(...values),Math.max(...values)]};
  const radar=ready?RADAR_AXES.map(({label,parts})=>({label,sides:[0,1].map(side=>{
    const entity=enriched[side],thin=parts.some(([key])=>!volumeOk(entity,key));
    const shares=parts.map(([key])=>{const[low,high]=radarRange(key);return high>low?Math.max(0,Math.min(1,(statValue(entity,key)-low)/(high-low))):.5});
    const pct=thin?0:Math.round(shares.reduce((sum,share)=>sum+share,0)/shares.length*100);
    const text=parts.map(([key,short])=>`${statText(statValue(entity,key),key)} ${short}`).join(' · ');
    return{pct,text,rank:thin?'too few attempts to rank':`${pct}% of the league range`};
  })})):[];
  const smallSample=entityType==='team'?[]:enriched.slice(0,2).filter(entity=>!(entity.gamesPlayed>=(seasonType==='playoffs'?3:minGames(data?.players||[]))&&entity.minutesPerGame>=10));
  const radarNotes=['The centre is the lowest rotation player in the league and the edge is the highest, so distance shows how far apart two players really are. 3P% needs at least one attempt a game to count. Defense averages steals and blocks, a box-score stand-in for defending. Turnovers and fouls are in the stat rows below.',...smallSample.map(entity=>`Small sample: ${entity.playerName} played ${entity.gamesPlayed} game${entity.gamesPlayed===1?'':'s'} at ${entity.minutesPerGame} MPG, so these rankings can swing a lot.`)];
  const radarScope=entityType==='team'?'all 30 teams':`${enrichedPopulation.length} ${seasonType==='playoffs'?'playoff':'regular-season'} rotation players`;
  const SHARE_KEYS=['points','totalRebounds','assists','steals','blocks','fieldGoalPercentage','threePointPercentage','trueShootingPercentage'];
  const shareMetrics=SHARE_KEYS.map(key=>sections.flatMap(([,metrics])=>metrics).find(metric=>metric[0]===key)).filter(Boolean);
  const tally=ready?sections.filter(([title])=>title!=='Season').flatMap(([,metrics])=>metrics).reduce((total,metric)=>{const lead=leadOf(enriched,metric);if(lead>=0)total[lead]+=1;return total},[0,0]):[0,0];
  const shareNames=enriched.slice(0,2).map(entity=>entity.playerName);
  const shareTitle=ready?shareNames.join(' vs '):'',shareFile=shareNames.map(name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).join('-vs-')||'comparison';
  const sharePath=ready?compareUrl(shareNames,entityType,seasonType):'/compare';
  const shareSpec=ready?{kind:'versus',eyebrow:`Head to head · ${pretty(data.season)}`,names:shareNames,people:entityType==='team'?undefined:enriched.slice(0,2).map(entity=>({name:entity.playerName,playerId:entity.playerId})),
    subs:enriched.slice(0,2).map(entity=>entityType==='team'?`${entity.gamesPlayed} games`:`${teamLabel(entity.team)} · ${entity.position}`),
    colors:enriched.slice(0,2).map(sideColor),score:tally,
    rows:shareMetrics.map(metric=>({label:metric[1],values:enriched.slice(0,2).map(entity=>statText(statValue(entity,metric[0]),metric[0],metric[3])),lead:leadOf(enriched,metric)})),
    foot:`${pretty(data.season)} ${seasonType==='playoffs'?'playoffs':'regular season'}, per game`,path:sharePath}:null;
  return <main className="h2h-main"><SiteHeader page="compare" onHome={onHome} onCompare={()=>{}} onTeams={onTeams} onLeaders={onLeaders} theme={theme} onToggleTheme={onToggleTheme}/><section className="h2h-page">
    <div className="h2h-bar">
      <div className="segmented mode"><button className={entityType==='player'?'active':''} onClick={()=>setEntityType('player')}>Players</button><button className={entityType==='team'?'active':''} onClick={()=>setEntityType('team')}>Teams</button></div>
      <div className="segmented season"><button className={seasonType==='regular-season'?'active':''} onClick={()=>switchSeason('regular-season')}>Regular season</button><button className={seasonType==='playoffs'?'active':''} onClick={()=>switchSeason('playoffs')}>Playoffs</button></div>
      <div className="h2h-bar-actions">
        <ShareButton spec={shareSpec} filename={shareFile} title={shareTitle} text={`${shareTitle} on StatsPads`} path={sharePath}/>
        <button className="ghost-button" onClick={onShare} title="Copy a link to this comparison"><Link2 size={15}/> Link</button>
        <button className="ghost-button" onClick={onCopy} disabled={!ready} title="Copy the verdict as text"><Copy size={15}/> Copy</button>
      </div>
    </div>
    <section className="vs-card" ref={chartRef}>
      <div className="vs-head">
        {[0,1].map(index=><VsSlot key={index} index={index} entity={enriched[index]} playerIds={playerIds} noun={entityType==='team'?'team':'player'} color={colors[index]}
          options={data.players.filter(option=>!enriched.some(selected=>selected.playerName===option.playerName))}
          onPick={option=>setSelected([...enriched,option].slice(0,2))}
          onRemove={()=>setSelected(enriched.filter((_,position)=>position!==index))}/>)}
        {ready?<span className="vs-score"><b>{tally[0]}</b><i>–</i><b>{tally[1]}</b><small>stat leads</small></span>:<span className="vs-badge">VS</span>}
      </div>
      {ready?<>{entityType==='team'&&<TeamLineups teams={enriched.slice(0,2)} leaguePlayers={leaguePlayers} season={data.season} colors={COLORS}/>}<Radar axes={radar} names={enriched.slice(0,2).map(entity=>entity.playerName)} colors={COLORS} scope={radarScope} notes={radarNotes}/><div className="vs-table" key={enriched.map(player=>player.playerName).join('|')}>
        {sections.map(([title,metrics])=><React.Fragment key={title}>
          <div className="vs-section">{title}</div>
          {metrics.map((metric,row)=><VsRow key={metric[0]} players={enriched} population={enrichedPopulation} metric={metric} row={row} colors={COLORS}/>)}
        </React.Fragment>)}
      </div>
      <p className="vs-note">The coloured bar marks who leads each category; for TOV% and PF, lower leads. GP and MPG are context and are not counted. 3P% and FT% need at least one attempt a game to lead. Bar length shows how close the two are. Hover any value for its league percentile among {enrichedPopulation.length} qualified {noun}.</p></>
      :<p className="vs-empty">Pick two {noun} above and the comparison builds itself.</p>}
    </section>
  </section><footer><span>StatsPads · made for smarter hoops arguments</span><span>{pretty(data.season)} data from <a href={data.source.url} target="_blank" rel="noreferrer">{data.source.name}</a> · Updated {data.lastUpdated}</span></footer>{toast&&<div className="toast"><Check size={16}/>{toast}</div>}</main>
}

export default function Home(){
  const paramsOnLoad=useMemo(()=>routeParams(location.pathname,location.search),[]);
  const[seasonType,setSeasonType]=useState(()=>paramsOnLoad.get('type')||'regular-season'),[seasonChanging,setSeasonChanging]=useState(false),[entityType,setEntityType]=useState(()=>paramsOnLoad.get('mode')||'player'),[data,setData]=useState(null),[splits,setSplits]=useState(null),[selected,setSelected]=useState([]),[toast,setToast]=useState(''),[playerIds,setPlayerIds]=useState({}),[catalog,setCatalog]=useState({players:[],teams:[]}),[page,setPage]=useState(['account','schedule','standings','game'].includes(paramsOnLoad.get('view'))?paramsOnLoad.get('view'):paramsOnLoad.get('view')==='leaders'?'leaders':paramsOnLoad.get('view')==='teams'?'teams':paramsOnLoad.has('team')?'team':paramsOnLoad.has('players')?'compare':paramsOnLoad.has('profile')?'profile':'home'),[regularPlayers,setRegularPlayers]=useState(null),[regularSeason,setRegularSeason]=useState(null),[profileFrom,setProfileFrom]=useState(null),[profile,setProfile]=useState(null),[teamCode,setTeamCode]=useState(()=>TEAMS[paramsOnLoad.get('team')]?paramsOnLoad.get('team'):'PHI');
  const chartRef=useRef(null),seasonTransitionRef=useRef(0);
  const[theme,setTheme]=useState(()=>{try{return localStorage.getItem('statspad-theme')||'dark'}catch{return 'dark'}});
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('statspad-theme',theme)}catch{/* private mode */}},[theme]);
  const toggleTheme=()=>setTheme(current=>current==='dark'?'light':'dark');
  useEffect(()=>{loadHeadshotIds().then(setPlayerIds)},[]);
  useEffect(()=>{loadSeasonBundle('regular-season').then(bundle=>{setRegularPlayers(bundle.players.players);setRegularSeason(bundle.season)})},[]);
  useEffect(()=>{let active=true;loadSeasonBundle(seasonType).then(bundle=>{if(!active)return;setCatalog({players:bundle.players.players,teams:bundle.teams.players});setSplits(bundle.splits);setData(entityType==='team'?bundle.teams:bundle.players)});return()=>{active=false}},[seasonType,entityType]);
  useEffect(()=>{const name=paramsOnLoad.get('profile');if(!name||profile)return;const match=[...catalog.players,...catalog.teams].find(item=>matchesName(item.playerName,name));if(match)setProfile(match)},[catalog,paramsOnLoad,profile]);
  useEffect(()=>{if(!data)return;const params=routeParams(location.pathname,location.search),names=params.get('players')?.split('|').filter(Boolean);const defaults=names?.length?names:(entityType==='team'?['Oklahoma City Thunder','New York Knicks']:['Luka Dončić','Shai Gilgeous-Alexander']);const pick=list=>list.map(name=>data.players.find(p=>matchesName(p.playerName,name))).filter(Boolean);const found=pick(defaults);setSelected((found.length?found:pick(entityType==='team'?['Oklahoma City Thunder','New York Knicks']:['Luka Dončić','Shai Gilgeous-Alexander'])).slice(0,2))},[data,entityType]);
  const population=useMemo(()=>{if(!data)return [];if(entityType==='team')return data.players;return seasonType==='playoffs'?data.players.filter(p=>p.gamesPlayed>=3&&p.minutesPerGame>=10):qualified(data.players)},[data,seasonType,entityType]);
  const enrich=p=>({...p,stats:{...p.stats,trueShootingPercentage:p.stats.fieldGoalsAttempted?Number((p.stats.points/(2*(p.stats.fieldGoalsAttempted+.44*p.stats.freeThrowsAttempted))*100).toFixed(1)):0,turnoverPercentage:turnoverRate(p.stats)}});
  const enriched=useMemo(()=>selected.map(enrich),[selected]);
  /* Keep the address bar and tab title in step with what is on screen, so links and bookmarks are clean. */
  useEffect(()=>{
    if(page!=='compare'||enriched.length<2)return;
    const url=compareUrl(enriched.map(entity=>entity.playerName),entityType,seasonType);
    if(url!==location.pathname+location.search)history.replaceState({},'',url);
  },[page,enriched,entityType,seasonType]);
  useEffect(()=>{
    const names=enriched.slice(0,2).map(entity=>entity.playerName).join(' vs ');
    const titles={home:'StatsPads: NBA player and team comparisons, rosters and stats',leaders:'NBA stat leaders | StatsPads',teams:'NBA teams and rosters | StatsPads',compare:names?`${names}: stats comparison | StatsPads`:'Compare NBA players and teams | StatsPads',team:`${TEAMS[teamCode]?.name} roster and stats | StatsPads`,profile:profile?`${profile.playerName} stats | StatsPads`:'StatsPads'};
    document.title=titles[page]||titles.home;
    let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
    canonical.href=`${location.origin}${location.pathname}`;
  },[page,enriched,teamCode,profile]);
  useEffect(()=>{const back=()=>location.reload();window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back)},[]);
  const enrichedPopulation=useMemo(()=>population.map(enrich),[population]);
  const notify=message=>{setToast(message);setTimeout(()=>setToast(''),2200)};
  const switchSeason=async next=>{if(next===seasonType||seasonChanging)return;const transition=++seasonTransitionRef.current;setSeasonChanging(true);try{const[bundle]=await Promise.all([loadSeasonBundle(next),new Promise(resolve=>window.setTimeout(resolve,180))]);if(transition!==seasonTransitionRef.current)return;setCatalog({players:bundle.players.players,teams:bundle.teams.players});setSplits(bundle.splits);setData(entityType==='team'?bundle.teams:bundle.players);setSeasonType(next);window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>setSeasonChanging(false)))}catch{setSeasonChanging(false)}};
  const share=async()=>{const url=`${location.origin}${compareUrl(enriched.map(p=>p.playerName),entityType,seasonType)}`;await navigator.clipboard.writeText(url);notify('Comparison link copied')};
  const copyTake=async()=>{const leaders=TABLE_STATS.slice(0,5).map(([key,label,inverse])=>{const ordered=[...enriched].sort((a,b)=>(valueOf(b,key)-valueOf(a,key))*(inverse?-1:1));return `${label}: ${ordered[0]?.playerName} (${format(valueOf(ordered[0],key),key)})`});await navigator.clipboard.writeText(`${enriched.map(p=>p.playerName).join(' vs ')} — 2025-26 ${data.seasonType}\n\n${leaders.join('\n')}\n\nMade with StatsPads`);notify('Debate-ready take copied')};
  const goHomeEarly=()=>{location.href='/'};
  if(page==='game')return <main><SiteHeader page='schedule' onHome={goHomeEarly} onCompare={()=>{location.href='/compare'}} onTeams={()=>{location.href='/teams'}} onLeaders={()=>{location.href='/leaders'}} theme={theme} onToggleTheme={toggleTheme}/><GamePage id={paramsOnLoad.get('game')}/><footer><span>StatsPads · NBA numbers, visualized</span></footer></main>;
  if(page==='schedule'||page==='standings')return <main><SiteHeader page={page} onHome={goHomeEarly} onCompare={()=>{location.href='/compare'}} onTeams={()=>{location.href='/teams'}} onLeaders={()=>{location.href='/leaders'}} theme={theme} onToggleTheme={toggleTheme}/>{page==='schedule'?<SchedulePage/>:<StandingsPage/>}<footer><span>StatsPads · NBA numbers, visualized</span></footer></main>;
  if(page==='account')return <main><SiteHeader page={page} onHome={goHomeEarly} onCompare={()=>{location.href='/compare'}} onTeams={()=>{location.href='/teams'}} onLeaders={()=>{location.href='/leaders'}} theme={theme} onToggleTheme={toggleTheme}/><AccountPage onTeams={()=>{location.href='/teams'}}/><footer><span>StatsPads · NBA numbers, visualized</span></footer></main>;
  if(!data){
    const idle=()=>{};
    const skeleton=page==='home'?<HomeSkeleton/>:page==='compare'?<CompareSkeleton/>:page==='team'?<TeamLoading teamCode={teamCode} color={TEAMS[teamCode].color} onPick={idle}/>:<PageSkeleton/>;
    return <main><SiteHeader page={page} onHome={idle} onCompare={idle} onTeams={idle} onLeaders={idle} theme={theme} onToggleTheme={toggleTheme}/>{skeleton}</main>;
  }
  const goHome=()=>{setPage('home');setProfile(null);history.pushState({},'','/');scrollTo({top:0,behavior:'smooth'})};
  const openProfile=(item,from=null)=>{setProfileFrom(from);setProfile(item);setPage('profile');history.pushState({},'',item.entityType==='team'?`/?profile=${encodeURIComponent(item.playerName)}`:playerUrl(item.playerName));scrollTo({top:0,behavior:'smooth'})};
  const openLeaders=()=>{setPage('leaders');setProfile(null);history.pushState({},'','/leaders');scrollTo({top:0,behavior:'smooth'})};
  const openTeams=()=>{setPage('teams');setProfile(null);history.pushState({},'','/teams');scrollTo({top:0,behavior:'smooth'})};
  const openTeam=(code=teamCode)=>{setTeamCode(code);setPage('team');setProfile(null);history.pushState({},'',teamUrl(code));scrollTo({top:0,behavior:'smooth'})};
  const openCompare=item=>{if(item){const items=Array.isArray(item)?item:[item],isTeam=items[0]?.entityType==='team';setEntityType(isTeam?'team':'player');setSelected(items.slice(0,2))}setPage('compare');setProfile(null);history.pushState({},'',item?compareUrl((Array.isArray(item)?item:[item]).map(entry=>entry.playerName),entityType,seasonType):'/compare');scrollTo({top:0,behavior:'smooth'})};
  if(page==='leaders')return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/><Discovery season={data?.season} players={catalog.players} teams={catalog.teams} playerIds={playerIds} onOpen={openProfile} onCompare={()=>openCompare()} seasonType={seasonType} onSeasonTypeChange={switchSeason} seasonChanging={seasonChanging} splits={splits}/><footer><span>StatsPads · NBA numbers, visualized</span><span>{pretty(data.season)} data from <a href={data.source.url} target="_blank" rel="noreferrer">{data.source.name}</a></span></footer></main>;
  if(page==='home')return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/><FrontPage players={regularPlayers||catalog.players} season={regularSeason} teams={catalog.teams} playerIds={playerIds} Art={EntityArt} onOpen={openProfile} onCompare={pair=>openCompare(Array.isArray(pair)?pair:undefined)} onTeam={openTeam} onLeaders={openLeaders}/><footer><span>StatsPads · NBA numbers, visualized</span><span>Stats from <a href={data.source.url} target="_blank" rel="noreferrer">Basketball Reference</a> · games and news from <a href="https://www.espn.com/nba/" target="_blank" rel="noreferrer">ESPN</a></span></footer></main>;
  if(page==='teams')return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/><TeamsIndex onOpen={openTeam}/><footer><span>StatsPads · NBA numbers, visualized</span></footer></main>;
  if(page==='team')return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/>{regularPlayers?<TeamPage teamCode={teamCode} leaguePlayers={regularPlayers} season={regularSeason} onOpen={player=>openProfile(player,'team')} onSwitchTeam={openTeam}/>:<TeamLoading teamCode={teamCode} color={TEAMS[teamCode].color} onPick={openTeam}/>}<footer><span>StatsPads · NBA numbers, visualized</span><span>{pretty(data.season)} stats from <a href={data.source.url} target="_blank" rel="noreferrer">{data.source.name}</a></span></footer></main>;
  if(page==='profile'&&profile){const entities=profile.entityType==='team'?catalog.teams:catalog.players;return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/><Profile season={data?.season} playoffs={seasonType==='playoffs'} onOpen={player=>openProfile(player)} entity={profile} allEntities={entities} playerIds={playerIds} onBack={profileFrom==='team'?()=>openTeam():goHome} backLabel={profileFrom==='team'?`Back to the ${nickname(teamCode)}`:undefined} onCompare={openCompare}/><footer><span>StatsPads · NBA numbers, visualized</span><span>{pretty(data.season)} data from <a href={data.source.url} target="_blank" rel="noreferrer">{data.source.name}</a></span></footer></main>}
  return <ComparisonPage leaguePlayers={regularPlayers||catalog.players} onTeams={openTeams} onLeaders={openLeaders} data={data} entityType={entityType} setEntityType={setEntityType} seasonType={seasonType} switchSeason={switchSeason} enriched={enriched} setSelected={setSelected} playerIds={playerIds} enrichedPopulation={enrichedPopulation} chartRef={chartRef} onHome={goHome} onShare={share} onCopy={copyTake} toast={toast} theme={theme} onToggleTheme={toggleTheme}/>;
}
