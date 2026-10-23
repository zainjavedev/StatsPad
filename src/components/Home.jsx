import AccountButton from './AccountButton';
import AccountPage from './AccountPage';
import SchedulePage from './SchedulePage';
import PerformancesPage from './PerformancesPage';
import StatLeadersPage from './StatLeadersPage';
import StandingsPage from './StandingsPage';
import GamePage from './GamePage';
import { isAppPath, navigate } from '../lib/nav';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, BookOpen, Check, Flame, Home as HomeIcon, Moon, Search, Sun, Trophy, Users, X } from 'lucide-react';
import TeamPage from './TeamPage';
import TeamsIndex from './TeamsIndex';
import Radar from './Radar';
import TeamLineups from './TeamLineups';
import { CompareSkeleton, HomeSkeleton, PageSkeleton, TeamLoading } from './Skeletons';
import { TEAMS, espnLogoUrl, nickname, teamCodeOf } from '../lib/teams';
import { CURRENT, loadLatest, pretty, qualified, setCurrentIsPreseason, stageOf } from '../lib/season';
import { compareUrl, leadersUrl, matchesName, playerUrl, routeParams, teamUrl } from '../lib/routes';
import FrontPage from './FrontPage';
import PlayerBody from './PlayerBody';
import { headshotSources, loadHeadshotIds } from '../lib/headshots';
import ShareButton from './ShareButton';
import SiteFooter from './SiteFooter';

const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const TEAM_COLORS = {ATL:'#e03a3e',BOS:'#007a33',BKN:'#777',BRK:'#777',CHA:'#1d1160',CHO:'#1d1160',CHI:'#ce1141',CLE:'#860038',DAL:'#00538c',DEN:'#0e2240',DET:'#c8102e',GSW:'#1d428a',HOU:'#ce1141',IND:'#002d62',LAC:'#c8102e',LAL:'#552583',MEM:'#5d76a9',MIA:'#98002e',MIL:'#00471b',MIN:'#0c2340',NOP:'#0c2340',NYK:'#f58426',OKC:'#007ac1',ORL:'#0077c0',PHI:'#006bb6',PHO:'#1d1160',PHX:'#1d1160',POR:'#e03a3e',SAC:'#5a2d81',SAS:'#8a8d8f',TOR:'#ce1141',UTA:'#6cace4',WAS:'#002b5c'};
const EXTRA_PLAYER_IDS = {'Bez Mbeng':1643016,'Cason Wallace':1641717,'Victor Wembanyama':1641705,'Cade Cunningham':1630595,'Josh Giddey':1630581,'Donovan Clingan':1642270,'Dyson Daniels':1630700,'Ausar Thompson':1641708,'Chet Holmgren':1631096,'Alex Sarr':1642258,'Jalen Williams':1631114,'Jaden McDaniels':1630183,'Jericho Sims':1630579,'Ryan Kalkbrenner':1642267,'Bobby Portis':1626171,'Rui Hachimura':1629060,'Anthony Davis':203076,'Jay Huff':1630643};
const PLAYER_AVATARS = {'Bez Mbeng':'/avatars/bez-mbeng.png','Cason Wallace':'/avatars/cason-wallace.png'};
const JERSEY_COLORS = {LAL:'#FDB927',DEN:'#0E2240',SAS:'#C4CED4',GSW:'#1D428A',UTA:'#F9A01B',MIN:'#236192',OKC:'#007AC1',BOS:'#007A33',BKN:'#111111',NYK:'#F58426',MIA:'#98002E',MIL:'#00471B',PHI:'#006BB6',CLE:'#860038',DAL:'#00538C',HOU:'#CE1141',TOR:'#CE1141',ATL:'#E03A3E',CHI:'#CE1141',DET:'#C8102E',ORL:'#0077C0',IND:'#002D62',MEM:'#5D76A9',NOP:'#0C2340',PHX:'#E56020',POR:'#E03A3E',SAC:'#5A2D81',WAS:'#002B5C',LAC:'#D71920',CHA:'#1D1160'};
const PLAYER_COLOR_OVERRIDES = {'Luke Kennard':['#FDB927','#171717']};
const CARD_THEMES = [['#e06455','#fff'],['#167f88','#fff'],['#5268c9','#fff'],['#d48a3d','#171717']];
const SEASON_BUNDLES = new Map();
/* Three datasets: this year's preseason, and the newest regular season and playoffs on file. The seasons they come from
   are remembered so the tabs can say which year each one is. */
const SEASON_YEARS={};
function loadSeasonBundle(seasonType){
  if(!SEASON_BUNDLES.has(seasonType))SEASON_BUNDLES.set(seasonType,loadLatest(seasonType).then(bundle=>{SEASON_YEARS[seasonType]=bundle.season;return bundle}));
  return SEASON_BUNDLES.get(seasonType);
}
const SEASON_TABS=[['regular-season','Regular season']];
function SeasonTabs({seasonType,onChange}){
  return <div className="season-pills" role="group" aria-label="Season">{SEASON_TABS.map(([key,label])=><button key={key} className={seasonType===key?'active':''} onClick={()=>onChange(key)}><strong>{label}</strong>{SEASON_YEARS[key]&&<small>{pretty(SEASON_YEARS[key])}</small>}</button>)}</div>;
}
function playerTheme(player,index){if(PLAYER_COLOR_OVERRIDES[player.playerName])return PLAYER_COLOR_OVERRIDES[player.playerName];const background=JERSEY_COLORS[player.team]||CARD_THEMES[index%CARD_THEMES.length][0];const hex=background.replace('#','');const red=parseInt(hex.slice(0,2),16),green=parseInt(hex.slice(2,4),16),blue=parseInt(hex.slice(4,6),16);return [background,(red*299+green*587+blue*114)>145000?'#171717':'#fff']}
const STAT_GROUPS = {
  impact: [['points','PPG'],['assists','APG'],['totalRebounds','RPG'],['trueShootingPercentage','TS%'],['steals','SPG'],['blocks','BPG']],
  offense: [['points','PPG'],['assists','APG'],['fieldGoalPercentage','FG%'],['threePointPercentage','3P%'],['trueShootingPercentage','TS%'],['turnovers','TOV',true]],
  defense: [['steals','SPG'],['blocks','BPG'],['totalRebounds','RPG'],['defensiveRebounds','DRB'],['personalFouls','PF',true],['turnovers','TOV',true]],
};
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
      <button className="vs-remove" onClick={onRemove} aria-label={`Remove ${entity.playerName}`}><X size={12}/></button>
      <EntityArt entity={entity} playerIds={playerIds} className={entity.entityType==='team'?'vs-art is-logo':'vs-art'}/>
      <strong>{entity.playerName}</strong>
      {entity.entityType!=='team'&&TEAMS[teamCodeOf(entity.team)]&&<img className="vs-team-logo" src={espnLogoUrl(teamCodeOf(entity.team))} alt={teamLabel(entity.team)} title={teamLabel(entity.team)}/>}
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


const NAV_ITEMS = [['home','Home',HomeIcon],['leaders','Leaders',Trophy],['performances','Performances',Flame],['compare','Compare',BarChart3],['teams','Teams',Users],['blog','Blog',BookOpen]];

/* A banner div, not <header>, so none of the old header rules apply. The tab
   bar is a sibling because a blurred parent would trap a fixed child. */
function SiteHeader({page,onHome,onLeaders,onCompare,onTeams,theme,onToggleTheme}){
  const current=page==='team'?'teams':page,go={home:onHome,leaders:onLeaders,compare:onCompare,teams:onTeams,blog:()=>{window.location.href='/blog'},performances:()=>navigate('/performances')};
  const TABBAR_KEYS=['home','performances','compare'];
  const tabs=(className,items=NAV_ITEMS)=><nav className={className} aria-label="Main">{items.map(([key,label,Icon])=><button key={key} className={current===key?'active':''} aria-current={current===key?'page':undefined} onClick={()=>go[key]()}><Icon size={19} className="nav-icon"/><span>{label}</span></button>)}</nav>;
  return <>
    <div className="site-header" role="banner"><div className="site-header-inner">
      <button className="site-brand" onClick={()=>onHome()}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8"/></svg>StatsPads</button>
      {tabs('site-nav')}
      <div className="site-header-end"><AccountButton/><button className="theme-toggle" onClick={onToggleTheme} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'} title={theme==='dark'?'Light theme':'Dark theme'}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button></div>
    </div></div>
    {tabs('tabbar',NAV_ITEMS.filter(([key])=>TABBAR_KEYS.includes(key)))}
  </>;
}

function Discovery({players,playerIds,onOpen,seasonType,onSeasonTypeChange,seasonChanging,season}){
  const[listCard,setListCard]=useState(null),[cat,setCat]=useState('all');
  const leaderGroups=[['Scoring leader','points','PPG','scoring'],['Assist leader','assists','APG','playmaking'],['Rebound leader','totalRebounds','RPG','rebounding'],['Off. rebound leader','offensiveRebounds','ORB','rebounding'],['Def. rebound leader','defensiveRebounds','DRB','rebounding'],['Steal leader','steals','SPG','defense'],['Block leader','blocks','BPG','defense'],['Stocks leader','stocks','STK','defense'],['Field-goal leader','fieldGoalPercentage','FG%','shooting'],['Three-point leader','threePointPercentage','3P%','shooting'],['Free-throw leader','freeThrowPercentage','FT%','shooting'],['True-shooting leader','trueShootingPercentage','TS%','shooting'],['Turnover leader','turnovers','TOV','volume'],['Effective-FG leader','effectiveFieldGoalPercentage','eFG%','shooting'],['Field-goals-made leader','fieldGoalsMade','FGM','volume'],['Three-pointers-made leader','threePointersMade','3PM','volume'],['Free-throws-made leader','freeThrowsMade','FTM','volume'],['Minutes leader','minutesPerGame','MPG','volume'],['Field-goals-attempted leader','fieldGoalsAttempted','FGA','volume'],['Three-pointers-attempted leader','threePointersAttempted','3PA','volume'],['Free-throws-attempted leader','freeThrowsAttempted','FTA','volume'],['Foul leader','personalFouls','PF','defense']];
  const qualifiedPlayers=qualified(players);
  const leaderPool=qualifiedPlayers.length?qualifiedPlayers:players;
  const leaderCards=leaderGroups.map(([label,key,suffix,category])=>{const pool=key==='threePointPercentage'?leaderPool.filter(player=>player.stats.threePointersAttempted>=3):key==='freeThrowPercentage'?leaderPool.filter(player=>player.stats.freeThrowsAttempted>=2):leaderPool;const leaders=[...(pool.length?pool:leaderPool)].sort((a,b)=>metricValue(b,key)-metricValue(a,key)).slice(0,5);const tied=leaders.filter(leader=>metricValue(leader,key)===metricValue(leaders[0],key));return {label,key,suffix,category,player:leaders[0],leaders,tied}}).filter(card=>card.player);
  const CATS=[['all','All'],['scoring','Scoring'],['playmaking','Playmaking'],['rebounding','Rebounding'],['defense','Defense'],['shooting','Shooting'],['volume','Volume']];
  const shownCards=cat==='all'?leaderCards:leaderCards.filter(card=>card.category===cat);
  return <div className="muse-layout leaders-page"><div className={`muse-main ${seasonChanging?'season-changing':''}`}>
    <section className="muse-home-grid"><div className="story-feed"><div className="feed-heading"><div><h2>League leaders</h2><p>{season?pretty(season):''} {stageOf(seasonType).toLowerCase()} · tap a card for the top 5</p></div><SeasonTabs seasonType={seasonType} onChange={onSeasonTypeChange}/></div><div className="cat-chips" role="group" aria-label="Category">{CATS.map(([key,label])=><button key={key} className={cat===key?'active':''} onClick={()=>setCat(key)}>{label}</button>)}</div>{shownCards.map((card,index)=><StoryCard key={`${card.key}-${card.player.playerId}`} player={card.player} leaders={card.leaders} tied={card.tied} index={index} label={card.label} statKey={card.key} suffix={card.suffix} playerIds={playerIds} onOpen={onOpen} onOpenList={setListCard} season={season} seasonType={seasonType}/>)}</div></section>
    {listCard&&<StatListModal seasonType={seasonType} card={listCard} season={season} playerIds={playerIds} onOpen={onOpen} onClose={()=>setListCard(null)}/>}
  </div></div>
}

function StoryCard({player,leaders,tied=[player],index,label,statKey,suffix,playerIds,onOpenList,season,seasonType}){const cardRef=useRef(null),stat=format(metricValue(player,statKey),statKey),shareSpec={kind:'leader',eyebrow:`${season?pretty(season):''} ${stageOf(seasonType).toLowerCase()}`,color:playerTheme(player,index)[0],label:label.toUpperCase(),names:tied.map(entry=>entry.playerName).reduce((text,name,position)=>position?`${text}${position===tied.length-1?' & ':', '}${name}`:name,''),stat,unit:suffix,people:tied.slice(0,3).map(entry=>({name:entry.playerName,playerId:entry.playerId})),rows:leaders.slice(tied.length,tied.length+5).map((leader,position)=>({lead:position+tied.length+1,person:{name:leader.playerName,playerId:leader.playerId},name:leader.playerName,sub:leader.team&&!/^\dTM$/.test(leader.team)?leader.team:'',value:`${format(metricValue(leader,statKey),statKey)} ${suffix}`})),foot:'Regulars only: 15+ games, 10+ minutes',path:'/leaders'},[background,text]=playerTheme(player,index),openList=()=>onOpenList({title:label,player,leaders,statKey,suffix});return <article ref={cardRef} className={`story-card story-${index}`} style={{'--story-color':background,'--story-text':text}} onClick={openList} role="button" tabIndex={0} onKeyDown={event=>event.key==='Enter'&&openList()}><span className="story-watermark" aria-hidden="true">{initials(player.playerName)}</span><div className="story-copy"><small>{label.toUpperCase()}</small><h2>{tied.map(entry=>entry.playerName).reduce((text,name,position)=>position?`${text}${position===tied.length-1?' & ':', '}${name}`:name,'')}</h2><strong className="story-stat">{stat} {suffix}</strong><div className="leader-list">{leaders.slice(tied.length).map((leader,position)=><span key={leader.playerId}><small>{position+tied.length+1}</small><b>{leader.playerName}</b><strong>{format(metricValue(leader,statKey),statKey)} {suffix}</strong></span>)}</div></div>{tied.length>1?<div className={`story-arts n-${Math.min(tied.length,6)}`}>{tied.slice(0,6).map(entry=><EntityArt key={entry.playerId} entity={entry} playerIds={playerIds} className="story-art"/>)}{tied.length>6&&<span className="story-more">+{tied.length-6}</span>}</div>:<EntityArt entity={player} playerIds={playerIds} className="story-art"/>}<span style={{display:'contents'}} onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}><ShareButton spec={shareSpec} filename={`${player.playerName}-${suffix}`.toLowerCase().replace(/[^a-z0-9]+/g,'-')} title={label} text={`${label}: ${tied.map(entry=>entry.playerName).join(', ')} (${stat} ${suffix})`} path="/leaders" className="card-download" compact label={`Share ${label}`}/></span></article>}
function StatListModal({card,season,seasonType,playerIds,onOpen,onClose}){const leaderSpec={kind:'list',eyebrow:`${season?pretty(season):''} leaders`,title:card.title.replace(/ leader$/i,' leaders'),sub:`${card.suffix} · ${season?pretty(season):''} ${stageOf(seasonType)}`,color:'#5b8def',rows:card.leaders.slice(0,8).map((leader,index)=>({lead:index+1,person:{name:leader.playerName,playerId:leader.playerId},name:leader.playerName,sub:leader.team&&!/^\dTM$/.test(leader.team)?leader.team:'',value:format(metricValue(leader,card.statKey),card.statKey)})),foot:'Regulars only: 15+ games, 10+ minutes',path:'/leaders'};return <div className="stat-modal-backdrop" onClick={onClose}><section className="stat-modal" onClick={event=>event.stopPropagation()}><button className="stat-modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button><small>FULL LEADERBOARD</small><h2>{card.title}</h2><p>{season?pretty(season):''} regular season · top {card.leaders.length}</p><ShareButton spec={leaderSpec} filename={`${card.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`} title={`${card.title}`} text={`${card.title}: ${card.leaders[0]?.playerName} leads the NBA`} path="/leaders" className="ghost-button stat-modal-share"/>{card.leaders.map((leader,index)=><button className="stat-modal-row" key={leader.playerId} onClick={()=>onOpen(leader)}><span>{index+1}</span><EntityArt entity={leader} playerIds={playerIds} className="split-avatar"/><b>{leader.playerName}</b><strong>{format(metricValue(leader,card.statKey),card.statKey)} {card.suffix}</strong></button>)}</section></div>}

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

function ComparisonPage({leaguePlayers,onTeams,onLeaders,data,entityType,setEntityType,seasonType,switchSeason,enriched,setSelected,playerIds,enrichedPopulation,chartRef,onHome,toast,theme,onToggleTheme}){
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
  const smallSample=entityType==='team'?[]:enriched.slice(0,2).filter(entity=>!(seasonType==='playoffs'?entity.gamesPlayed>=3&&entity.minutesPerGame>=10:qualified(data?.players||[]).some(other=>other.playerId===entity.playerId)));
  const radarNotes=['The centre is the lowest rotation player in the league and the edge is the highest, so distance shows how far apart two players really are. 3P% needs at least one attempt a game to count. Defense averages steals and blocks, a box-score stand-in for defending. Turnovers and fouls are in the stat rows below.',...smallSample.map(entity=>`Small sample: ${entity.playerName} played ${entity.gamesPlayed} game${entity.gamesPlayed===1?'':'s'} at ${entity.minutesPerGame} MPG, so these rankings can swing a lot.`)];
  const radarScope=entityType==='team'?'all 30 teams':`${enrichedPopulation.length} ${seasonType==='playoffs'?'playoff':stageOf(seasonType).replace(' ','-')} rotation players`;
  return <main className="h2h-main"><SiteHeader page="compare" onHome={onHome} onCompare={()=>{}} onTeams={onTeams} onLeaders={onLeaders} theme={theme} onToggleTheme={onToggleTheme}/><section className="h2h-page">
    <div className="cmp-bar">
      <div className="pills"><button className={entityType==='player'?'active':''} onClick={()=>setEntityType('player')}>Players</button><button className={entityType==='team'?'active':''} onClick={()=>setEntityType('team')}>Teams</button></div>
      <SeasonTabs seasonType={seasonType} onChange={switchSeason}/>
    </div>
    <section className="vs-card" ref={chartRef}>
      <div className="vs-head">
        {[0,1].map(index=><VsSlot key={index} index={index} entity={enriched[index]} playerIds={playerIds} noun={entityType==='team'?'team':'player'} color={colors[index]}
          options={data.players.filter(option=>!enriched.some(selected=>selected.playerName===option.playerName))}
          onPick={option=>setSelected([...enriched,option].slice(0,2))}
          onRemove={()=>setSelected(enriched.filter((_,position)=>position!==index))}/>)}
        {!ready&&<span className="vs-badge">VS</span>}
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
  </section><SiteFooter/>{toast&&<div className="toast"><Check size={16}/>{toast}</div>}</main>
}

export default function Home(){
  const paramsOnLoad=useMemo(()=>routeParams(location.pathname,location.search),[]);
  const[statSlug,setStatSlug]=useState(()=>paramsOnLoad.get('stat')||'points');
  const[seasonType,setSeasonType]=useState(()=>paramsOnLoad.get('type')==='playoffs'?'playoffs':'regular-season'),[seasonChanging,setSeasonChanging]=useState(false),[entityType,setEntityType]=useState(()=>paramsOnLoad.get('mode')||'player'),[data,setData]=useState(null),[,setSplits]=useState(null),[selected,setSelected]=useState([]),[toast]=useState(''),[playerIds,setPlayerIds]=useState({}),[catalog,setCatalog]=useState({players:[],teams:[]}),[gameId,setGameId]=useState(()=>paramsOnLoad.get('game')),[page,setPage]=useState(['account','schedule','standings','performances','stat','game'].includes(paramsOnLoad.get('view'))?paramsOnLoad.get('view'):paramsOnLoad.get('view')==='leaders'?'leaders':paramsOnLoad.get('view')==='teams'?'teams':paramsOnLoad.has('team')?'team':paramsOnLoad.has('players')?'compare':paramsOnLoad.has('profile')?'profile':'home'),[regularPlayers,setRegularPlayers]=useState(null),[regularSeason,setRegularSeason]=useState(null),[profileFrom,setProfileFrom]=useState(null),[profile,setProfile]=useState(null),[profileBundle,setProfileBundle]=useState(null),[,setYearsTick]=useState(0),[teamCode,setTeamCode]=useState(()=>TEAMS[paramsOnLoad.get('team')]?paramsOnLoad.get('team'):'PHI');
  const chartRef=useRef(null),seasonTransitionRef=useRef(0);
  const[theme,setTheme]=useState(()=>{try{return localStorage.getItem('statspad-theme')||'dark'}catch{return 'dark'}});
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('statspad-theme',theme)}catch{/* private mode */}},[theme]);
  const toggleTheme=()=>setTheme(current=>current==='dark'?'light':'dark');
  useEffect(()=>{loadHeadshotIds().then(setPlayerIds)},[]);
  useEffect(()=>{if(page!=='profile')return;let active=true;loadSeasonBundle(seasonType==='playoffs'?'playoffs':'regular-season').then(b=>{if(active)setProfileBundle(b)});return()=>{active=false}},[page,seasonType]);
  useEffect(()=>{['preseason','regular-season','playoffs'].forEach(k=>loadSeasonBundle(k).then(()=>setYearsTick(t=>t+1)).catch(()=>{}))},[]);
  useEffect(()=>{(async()=>{
    const regular=await loadSeasonBundle('regular-season');let bundle=regular;
    if(regular.season!==CURRENT)try{bundle=await loadSeasonBundle('preseason')}catch{/* no preseason file: last season stays */}
    setCurrentIsPreseason(bundle!==regular||Boolean(regular.standIn));setRegularPlayers(bundle.players.players);setRegularSeason(bundle.season);
    if(!paramsOnLoad.get('type')&&regular.season===CURRENT)setSeasonType('regular-season');
  })()},[paramsOnLoad]);
  useEffect(()=>{let active=true;loadSeasonBundle(seasonType).then(bundle=>{if(!active)return;setCatalog({players:bundle.players.players,teams:bundle.teams.players});setSplits(bundle.splits);setData(entityType==='team'?bundle.teams:bundle.players)}).catch(()=>{if(active&&seasonType==='preseason')setSeasonType('regular-season')});return()=>{active=false}},[seasonType,entityType]);
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
  /* Client-side navigation for the pages that need no extra state: no reload, so the header and panels stay put. */
  const routeTo=(path,push=true)=>{
    const url=new URL(path,location.origin),params=routeParams(url.pathname,url.search),view=params.get('view');
    const plainCompare=url.pathname.replace(/\/+$/,'')==='/compare'&&!url.search;
    const simple=plainCompare||['account','schedule','standings','performances','stat','game','leaders','teams'].includes(view)||params.has('team')||(!view&&!params.has('players')&&!params.has('profile'));
    if(!simple){location.assign(url.pathname+url.search);return}
    if(push&&url.pathname+url.search!==location.pathname+location.search)history.pushState({},'',url.pathname+url.search);
    setProfile(null);
    if(view==='leaders'&&params.get('type'))setSeasonType(params.get('type'));
    if(plainCompare)setPage('compare');
    else if(view==='game'){setGameId(params.get('game'));setPage('game')}
    else if(view==='stat'){setStatSlug(params.get('stat'));setPage('stat')}
    else if(['account','schedule','standings','performances','leaders','teams'].includes(view))setPage(view);
    else if(params.has('team')){setTeamCode(params.get('team'));setPage('team')}
    else setPage('home');
    scrollTo({top:0});
  };
  const routeRef=useRef(routeTo);routeRef.current=routeTo;
  useEffect(()=>{
    const back=()=>routeRef.current(location.pathname+location.search,false);
    const go=event=>routeRef.current(event.detail);
    const click=event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=event.target.closest?.('a[href]');
      if(!link||link.target||link.hasAttribute('download'))return;
      const url=new URL(link.href,location.origin);
      if(url.origin!==location.origin||!isAppPath(url.pathname))return;
      event.preventDefault();routeRef.current(url.pathname+url.search);
    };
    window.addEventListener('popstate',back);window.addEventListener('statspad:navigate',go);document.addEventListener('click',click);
    return()=>{window.removeEventListener('popstate',back);window.removeEventListener('statspad:navigate',go);document.removeEventListener('click',click)};
  },[]);
  const enrichedPopulation=useMemo(()=>population.map(enrich),[population]);
  const switchSeason=async next=>{if(next===seasonType||seasonChanging)return;const transition=++seasonTransitionRef.current;setSeasonChanging(true);try{const[bundle]=await Promise.all([loadSeasonBundle(next),new Promise(resolve=>window.setTimeout(resolve,180))]);if(transition!==seasonTransitionRef.current)return;setCatalog({players:bundle.players.players,teams:bundle.teams.players});setSplits(bundle.splits);setData(entityType==='team'?bundle.teams:bundle.players);setSeasonType(next);if(page==='leaders')history.pushState({},'',leadersUrl(next));window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>setSeasonChanging(false)))}catch{setSeasonChanging(false)}};
  const goHomeEarly=()=>navigate('/');
  if(page==='game')return <main><SiteHeader page='schedule' onHome={goHomeEarly} onCompare={()=>navigate('/compare')} onTeams={()=>navigate('/teams')} onLeaders={()=>navigate('/leaders')} theme={theme} onToggleTheme={toggleTheme}/><GamePage key={gameId} id={gameId}/><SiteFooter/></main>;
  if(page==='schedule'||page==='standings'||page==='performances')return <main><SiteHeader page={page} onHome={goHomeEarly} onCompare={()=>navigate('/compare')} onTeams={()=>navigate('/teams')} onLeaders={()=>navigate('/leaders')} theme={theme} onToggleTheme={toggleTheme}/>{page==='schedule'?<SchedulePage/>:page==='performances'?<PerformancesPage/>:<StandingsPage/>}<SiteFooter/></main>;
  if(page==='account')return <main><SiteHeader page={page} onHome={goHomeEarly} onCompare={()=>navigate('/compare')} onTeams={()=>navigate('/teams')} onLeaders={()=>navigate('/leaders')} theme={theme} onToggleTheme={toggleTheme}/><AccountPage onTeams={()=>navigate('/teams')}/><SiteFooter/></main>;
  if(!data){
    const idle=()=>{};
    const skeleton=page==='home'?<HomeSkeleton/>:page==='compare'?<CompareSkeleton/>:page==='team'?<TeamLoading teamCode={teamCode} color={TEAMS[teamCode].color} onPick={idle}/>:<PageSkeleton/>;
    return <main><SiteHeader page={page} onHome={idle} onCompare={idle} onTeams={idle} onLeaders={idle} theme={theme} onToggleTheme={toggleTheme}/>{skeleton}</main>;
  }
  const goHome=()=>{setPage('home');setProfile(null);history.pushState({},'','/');scrollTo({top:0,behavior:'smooth'})};
  const openProfile=(item,from=null)=>{setProfileFrom(from);setProfile(item);setPage('profile');history.pushState({},'',item.entityType==='team'?`/?profile=${encodeURIComponent(item.playerName)}`:playerUrl(item.playerName));scrollTo({top:0,behavior:'smooth'})};
  const openLeaders=()=>{setPage('leaders');setProfile(null);history.pushState({},'',leadersUrl(seasonType));scrollTo({top:0,behavior:'smooth'})};
  const openTeams=()=>{setPage('teams');setProfile(null);history.pushState({},'','/teams');scrollTo({top:0,behavior:'smooth'})};
  const openTeam=(code=teamCode)=>{setTeamCode(code);setPage('team');setProfile(null);history.pushState({},'',teamUrl(code));scrollTo({top:0,behavior:'smooth'})};
  const openCompare=item=>{if(item){const items=Array.isArray(item)?item:[item],isTeam=items[0]?.entityType==='team';setEntityType(isTeam?'team':'player');setSelected(items.slice(0,2))}setPage('compare');setProfile(null);history.pushState({},'',item?compareUrl((Array.isArray(item)?item:[item]).map(entry=>entry.playerName),entityType,seasonType):'/compare');scrollTo({top:0,behavior:'smooth'})};
  if(page==='leaders')return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/><Discovery season={data?.season} players={catalog.players} playerIds={playerIds} onOpen={openProfile} seasonType={seasonType} onSeasonTypeChange={switchSeason} seasonChanging={seasonChanging}/><SiteFooter/></main>;
  if(page==='stat')return <main><SiteHeader page='leaders' onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/><StatLeadersPage slug={statSlug} players={regularPlayers||catalog.players} playerIds={playerIds} Art={EntityArt} onOpen={openProfile}/><SiteFooter/></main>;
  if(page==='home')return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/><FrontPage players={regularPlayers||catalog.players} season={regularSeason} teams={catalog.teams} playerIds={playerIds} Art={EntityArt} onOpen={openProfile} onCompare={pair=>openCompare(Array.isArray(pair)?pair:undefined)} onTeam={openTeam} onLeaders={openLeaders}/><SiteFooter/></main>;
  if(page==='teams')return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/><TeamsIndex onOpen={openTeam}/><SiteFooter/></main>;
  if(page==='team')return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/>{regularPlayers?<TeamPage teamCode={teamCode} leaguePlayers={regularPlayers} season={regularSeason} onOpen={player=>openProfile(player,'team')} onSwitchTeam={openTeam}/>:<TeamLoading teamCode={teamCode} color={TEAMS[teamCode].color} onPick={openTeam}/>}<SiteFooter/></main>;
  if(page==='profile'&&profile){const pb=profileBundle,entities=pb?(profile.entityType==='team'?pb.teams.players:pb.players.players):(profile.entityType==='team'?catalog.teams:catalog.players),shown=entities.find(e=>e.playerId===profile.playerId||matchesName(e.playerName,profile.playerName))||profile;return <main><SiteHeader page={page} onHome={goHome} onCompare={()=>openCompare()} onTeams={openTeams} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/><Profile season={pb?.season||data?.season} playoffs={seasonType==='playoffs'} onOpen={player=>openProfile(player)} entity={shown} allEntities={entities} playerIds={playerIds} onBack={profileFrom==='team'?()=>openTeam():goHome} backLabel={profileFrom==='team'?`Back to the ${nickname(teamCode)}`:undefined} onCompare={openCompare}/><SiteFooter/></main>}
  return <ComparisonPage leaguePlayers={regularPlayers||catalog.players} onTeams={openTeams} onLeaders={openLeaders} data={data} entityType={entityType} setEntityType={setEntityType} seasonType={seasonType} switchSeason={switchSeason} enriched={enriched} setSelected={setSelected} playerIds={playerIds} enrichedPopulation={enrichedPopulation} chartRef={chartRef} onHome={goHome} toast={toast} theme={theme} onToggleTheme={toggleTheme}/>;
}
