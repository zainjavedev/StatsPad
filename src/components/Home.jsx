import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, Check, Copy, Download, Moon, Search, Share2, Sun, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import TeamPage from './TeamPage';
import FrontPage from './FrontPage';
import LeadersPage from './LeadersPage';
import { ArticlePage, NewsIndex, StoryPage } from './NewsPage';
import SEASON from '../season.json';

const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const TEAM_COLORS = {ATL:'#e03a3e',BOS:'#007a33',BKN:'#777',BRK:'#777',CHA:'#1d1160',CHO:'#1d1160',CHI:'#ce1141',CLE:'#860038',DAL:'#00538c',DEN:'#0e2240',DET:'#c8102e',GSW:'#1d428a',HOU:'#ce1141',IND:'#002d62',LAC:'#c8102e',LAL:'#552583',MEM:'#5d76a9',MIA:'#98002e',MIL:'#00471b',MIN:'#0c2340',NOP:'#0c2340',NYK:'#f58426',OKC:'#007ac1',ORL:'#0077c0',PHI:'#006bb6',PHO:'#1d1160',PHX:'#1d1160',POR:'#e03a3e',SAC:'#5a2d81',SAS:'#8a8d8f',TOR:'#ce1141',UTA:'#6cace4',WAS:'#002b5c'};
const EXTRA_PLAYER_IDS = {'Bez Mbeng':1643016,'Cason Wallace':1641717,'Victor Wembanyama':1641705,'Cade Cunningham':1630595,'Josh Giddey':1630581,'Donovan Clingan':1642270,'Dyson Daniels':1630700,'Ausar Thompson':1641708,'Chet Holmgren':1631096,'Alex Sarr':1642258,'Jalen Williams':1631114,'Jaden McDaniels':1630183,'Jericho Sims':1630579,'Ryan Kalkbrenner':1642267,'Bobby Portis':1626171,'Rui Hachimura':1629060,'Anthony Davis':203076,'Jay Huff':1630643};
const PLAYER_AVATARS = {'Bez Mbeng':'/avatars/bez-mbeng.png','Cason Wallace':'/avatars/cason-wallace.png'};
const SEASON_BUNDLES = new Map();
const SEASON_LABEL=SEASON.stats.replace('-','–');
const teamKey=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g,'').replace(/[^a-z]/g,'');
const CURRENT_TEAMS=fetch(`/data/${SEASON.rosters}/current-teams.json`).then(response=>response.ok?response.json():null).catch(()=>null);
/* Stats files for the season in src/season.json (the nightly job moves it
   forward). Each player also gets currentTeam: where he plays now, which can
   differ from the team his stats were recorded with. */
function loadSeasonBundle(seasonType){
  if(!SEASON_BUNDLES.has(seasonType)){
    const suffix=seasonType==='playoffs'?'playoffs':'regular-season',base=`/data/${SEASON.stats}`;
    SEASON_BUNDLES.set(seasonType,Promise.all([
      fetch(`${base}/${suffix}.json`).then(response=>response.json()),
      fetch(`${base}/teams-${suffix}.json`).then(response=>response.json()),
      fetch(`${base}/splits-${suffix}.json`).then(response=>response.ok?response.json():null).catch(()=>null),
      CURRENT_TEAMS,
    ]).then(([players,teams,splits,current])=>{
      const withTeam=player=>({...player,currentTeam:current?.byId[player.playerId]||current?.byName[teamKey(player.playerName)]||null,espnId:current?.espnIds?.[teamKey(player.playerName)]||null});
      return {players:{...players,players:players.players.map(withTeam)},teams,splits};
    }));
  }
  return SEASON_BUNDLES.get(seasonType);
}
const nowTeam=player=>player.currentTeam||player.team;
const STAT_GROUPS = {
  impact: [['points','PTS'],['assists','AST'],['totalRebounds','REB'],['trueShootingPercentage','TS%'],['steals','STL'],['blocks','BLK']],
  offense: [['points','PTS'],['assists','AST'],['fieldGoalPercentage','FG%'],['threePointPercentage','3P%'],['trueShootingPercentage','TS%'],['turnovers','TOV',true]],
  defense: [['steals','STL'],['blocks','BLK'],['totalRebounds','REB'],['defensiveRebounds','DREB'],['personalFouls','PF',true],['turnovers','TOV',true]],
};
const TABLE_STATS = [['points','Points / game'],['assists','Assists / game'],['totalRebounds','Rebounds / game'],['steals','Steals / game'],['blocks','Blocks / game'],['fieldGoalPercentage','Field goal %'],['threePointPercentage','Three-point %'],['freeThrowPercentage','Free throw %'],['trueShootingPercentage','True shooting %'],['effectiveFieldGoalPercentage','Effective FG %'],['turnovers','Turnovers / game',true]];
const pctKeys = new Set(['fieldGoalPercentage','threePointPercentage','freeThrowPercentage','trueShootingPercentage','effectiveFieldGoalPercentage']);
const valueOf = (player,key) => player?.stats?.[key] ?? 0;
const format = (value,key) => `${Number(value).toFixed(1)}${pctKeys.has(key)?'%':''}`;
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
      entity.espnId&&`https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${entity.espnId}.png&w=520&h=380`,
    ].filter(Boolean);
  },[entity,playerIds]);
  useEffect(()=>{setStep(0)},[sources]);
  const src=sources[step];
  if(!src)return <img className={`${className} art-fallback-image`} alt={`${entity.playerName} avatar`}
    src={`https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(entity.playerName)}&backgroundColor=${(TEAM_COLORS[entity.team]||'#3b3b45').replace('#','')}&size=512`}/>;
  return <img className={className} src={src} alt="" loading="lazy" onError={()=>setStep(current=>current+1)}/>;
}
function percentile(players,key,value,inverse=false){const values=players.map(p=>valueOf(p,key)).filter(Number.isFinite).sort((a,b)=>a-b);if(!values.length)return 0;const below=values.filter(v=>v<value).length,equal=values.filter(v=>v===value).length,score=Math.round(((below+equal*.5)/values.length)*100);return inverse?100-score:score}

/* League rank among regulars (15+ games and 10+ minutes; 3+ games in a
   playoff population, matching the compare page); teams rank among all 30.
   Ties share a rank. Returns null when the entity itself doesn't qualify. */
const minGamesFor=population=>Math.max(0,...population.map(item=>item.gamesPlayed||0))>=40?15:3;
const regularTest=population=>{const minGames=minGamesFor(population);return item=>item.entityType==='team'||(item.gamesPlayed>=minGames&&item.minutesPerGame>=10)};
function leagueRank(population,entity,key,inverse=false){
  const isRegular=regularTest(population);
  if(!isRegular(entity))return null;
  const pool=population.filter(isRegular),value=valueOf(entity,key);
  const better=pool.filter(item=>inverse?valueOf(item,key)<value:valueOf(item,key)>value).length;
  return {rank:better+1,of:pool.length};
}
const RANK_LABELS={points:'Points',assists:'Assists',totalRebounds:'Rebounds',trueShootingPercentage:'True shooting %',steals:'Steals',blocks:'Blocks'};
function LeagueRanks({entity,population,metrics}){
  const noun=entity.entityType==='team'?'teams':'regulars',isRegular=regularTest(population),minGames=minGamesFor(population);
  return <div className="rank-list">{metrics.map(([key,label,inverse])=>{
    const place=leagueRank(population,entity,key,inverse);
    return <div className="rank-row" key={key}>
      <span className="rank-label">{RANK_LABELS[key]||label}</span>
      <span className="rank-value">{format(valueOf(entity,key),key)}</span>
      <b className={place&&place.rank<=10?'rank-place top':'rank-place'}>{place?ordinal(place.rank):'—'}</b>
    </div>})}
    <p className="rank-note">{isRegular(entity)?`Rank among ${population.filter(isRegular).length} ${noun}${noun==='regulars'?` (${minGames}+ games, 10+ minutes)`:''}.`:`Not ranked: fewer than ${minGames} games or 10 minutes a game.`}</p>
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
        <span><b>{option.playerName}</b><small>{nowTeam(option)} · {option.stats.points} PPG</small></span>
      </button>)}</div>
    </div>}
  </div>
}

function SiteHeader({page,onHome,onLeaders,onCompare,onTeams,theme,onToggleTheme}){
  return <header><button className="brand brand-button" onClick={onHome}><span className="brand-text"><span className="brand-word">StatsPad</span><small>NBA numbers, visualized</small></span></button><nav><button className={page==='home'?'active nav-home':'nav-home'} onClick={onHome}>Home</button><button className={page==='leaders'?'active':''} onClick={onLeaders}><span className="nav-year"><span className="nav-season">{SEASON_LABEL.slice(0,2)}</span>{SEASON_LABEL.slice(2)} </span>Leaders</button><button className={page==='compare'?'active':''} onClick={onCompare}>Compare</button><button className={page==='team'?'active':''} onClick={onTeams}>Sixers</button></nav><div className="header-end"><button className="theme-toggle" onClick={onToggleTheme} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'} title={theme==='dark'?'Light theme':'Dark theme'}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button></div></header>
}

async function downloadCard(node,name){const dataUrl=await toPng(node,{pixelRatio:2,cacheBust:true});const link=document.createElement('a');link.download=`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;link.href=dataUrl;link.click()}
function Profile({entity,allEntities,playerIds,onBack,backLabel='Back to explore',onCompare}){
  const stats=[['points','PTS'],['totalRebounds','REB'],['assists','AST'],['steals','STL'],['blocks','BLK'],['trueShootingPercentage','TS%']];
  const enriched={...entity,stats:{...entity.stats,trueShootingPercentage:entity.stats.fieldGoalsAttempted?entity.stats.points/(2*(entity.stats.fieldGoalsAttempted+.44*entity.stats.freeThrowsAttempted))*100:0}};
  const population=allEntities.map(item=>({...item,stats:{...item.stats,trueShootingPercentage:item.stats.fieldGoalsAttempted?item.stats.points/(2*(item.stats.fieldGoalsAttempted+.44*item.stats.freeThrowsAttempted))*100:0}}));
  return <section className="profile-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/> {backLabel}</button><div className="profile-hero" style={{'--team':TEAM_COLORS[nowTeam(entity)]||'#333'}}><div className="profile-copy"><small>{entity.entityType==='team'?`NBA TEAM · ${SEASON_LABEL}`:`${nowTeam(entity)} · ${entity.position}`}</small><h1>{entity.playerName}</h1><p>{entity.entityType==='team'?`${entity.gamesPlayed} games · ${format(entity.stats.points,'points')} points per game`:`${SEASON_LABEL}${entity.currentTeam&&entity.currentTeam!==entity.team?` with ${/^\dTM$/.test(entity.team)?`${entity.team[0]} teams`:entity.team}`:''}: ${entity.gamesPlayed} games · ${entity.gamesStarted} starts · age ${entity.age}`}</p><button onClick={()=>onCompare(entity)}><BarChart3 size={17}/> Compare {entity.entityType==='team'?'team':'player'}</button></div><div className="profile-art-wrap"><div></div><EntityArt entity={entity} playerIds={playerIds} className="profile-art"/></div></div>
    <div className="profile-grid"><section className="profile-main"><div className="section-title compact"><div><small>SEASON SNAPSHOT</small><h2>At a glance</h2></div></div><div className="big-stats">{stats.slice(0,3).map(([key,label])=><article key={key}><strong>{format(valueOf(enriched,key),key)}</strong><span>{label}</span><small>{(place=>place?`${ordinal(place.rank)} in the NBA`:'Not ranked')(leagueRank(population,enriched,key))}</small></article>)}</div></section>
      <aside className="profile-side"><small>{entity.entityType==='team'?'TEAM PROFILE':'PLAYER PROFILE'}</small><h2>League rank</h2><LeagueRanks entity={enriched} population={population} metrics={STAT_GROUPS.impact}/></aside></div>
  </section>
}

function ComparisonPage({onTeams,onLeaders,data,entityType,setEntityType,seasonType,switchSeason,enriched,setSelected,playerIds,enrichedPopulation,chartRef,onHome,onShare,onDownload,onCopy,toast,theme,onToggleTheme}){
  const ready=enriched.length>=2,noun=entityType==='team'?'teams':'players';
  return <main className="h2h-main"><SiteHeader page="compare" onHome={onHome} onCompare={()=>{}} onTeams={onTeams} onLeaders={onLeaders} theme={theme} onToggleTheme={onToggleTheme}/><section className="h2h-page">
    <div className="h2h-bar">
      <div className="segmented mode"><button className={entityType==='player'?'active':''} onClick={()=>setEntityType('player')}>Players</button><button className={entityType==='team'?'active':''} onClick={()=>setEntityType('team')}>Teams</button></div>
      <div className="segmented season"><button className={seasonType==='regular-season'?'active':''} onClick={()=>switchSeason('regular-season')}>Regular season</button>{SEASON.playoffs&&<button className={seasonType==='playoffs'?'active':''} onClick={()=>switchSeason('playoffs')}>Playoffs</button>}</div>
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
  </section><footer><span>StatsPad · made for smarter hoops arguments</span><span>{SEASON_LABEL} data from <a href={data.source.url} target="_blank" rel="noreferrer">Basketball Reference</a> · Updated {data.lastUpdated}</span></footer>{toast&&<div className="toast"><Check size={16}/>{toast}</div>}</main>
}

/* Pages are driven by the URL so the browser's back and forward buttons work:
   ?view=leaders, ?view=compare (or ?players=…), ?team=PHI, ?profile=Name,
   and no query for home. navigate() pushes; popstate re-reads the URL. */
function routeFrom(search){
  const params=new URLSearchParams(search);
  if(params.has('profile'))return {page:'profile',name:params.get('profile')};
  if(params.has('story'))return {page:'story',id:params.get('story')};
  if(params.has('article'))return {page:'article',slug:params.get('article')};
  if(params.get('view')==='news')return {page:'news'};
  if(params.has('team'))return {page:'team',team:params.get('team').toUpperCase()};
  if(params.get('view')==='leaders')return {page:'leaders'};
  if(params.get('view')==='compare'||params.has('players'))return {page:'compare'};
  return {page:'home'};
}
const footerSource=(data,label='Stats')=><span>{label} from <a href={data.source.url} target="_blank" rel="noreferrer">Basketball Reference</a></span>;

export default function Home(){
  const paramsOnLoad=useMemo(()=>new URLSearchParams(location.search),[]);
  const[route,setRoute]=useState(()=>({...routeFrom(location.search),state:history.state}));
  const[seasonType,setSeasonType]=useState(()=>SEASON.playoffs&&paramsOnLoad.get('type')==='playoffs'?'playoffs':'regular-season'),[seasonChanging,setSeasonChanging]=useState(false);
  const[entityType,setEntityType]=useState(()=>paramsOnLoad.get('mode')||'player');
  const[data,setData]=useState(null),[splits,setSplits]=useState(null),[selected,setSelected]=useState([]),[toast,setToast]=useState('');
  const[playerIds,setPlayerIds]=useState({}),[catalog,setCatalog]=useState({players:[],teams:[]}),[regularPlayers,setRegularPlayers]=useState(null);
  const chartRef=useRef(null),seasonTransitionRef=useRef(0),depthRef=useRef(0);
  const[theme,setTheme]=useState(()=>{try{return localStorage.getItem('statspad-theme')||'light'}catch{return 'light'}});
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('statspad-theme',theme)}catch{/* private mode */}},[theme]);
  const toggleTheme=()=>setTheme(current=>current==='dark'?'light':'dark');
  useEffect(()=>{
    const onPop=()=>{depthRef.current=Math.max(0,depthRef.current-1);setRoute({...routeFrom(location.search),state:history.state})};
    addEventListener('popstate',onPop);
    return()=>removeEventListener('popstate',onPop);
  },[]);
  useEffect(()=>{fetch('/data/player-ids.json').then(r=>r.json()).then(ids=>setPlayerIds(Object.fromEntries(Object.entries(ids).map(([name,id])=>[normalizedName(name),id]))))},[]);
  useEffect(()=>{loadSeasonBundle('regular-season').then(bundle=>setRegularPlayers(bundle.players.players));if(SEASON.playoffs)loadSeasonBundle('playoffs')},[]);
  useEffect(()=>{let active=true;loadSeasonBundle(seasonType).then(bundle=>{if(!active)return;setCatalog({players:bundle.players.players,teams:bundle.teams.players});setSplits(bundle.splits);setData(entityType==='team'?bundle.teams:bundle.players)});return()=>{active=false}},[seasonType,entityType]);
  useEffect(()=>{if(!data)return;const params=new URLSearchParams(location.search),names=params.get('players')?.split('|').filter(Boolean);const defaults=names?.length?names:(entityType==='team'?['Oklahoma City Thunder','New York Knicks']:['Luka Dončić','Shai Gilgeous-Alexander']);setSelected(defaults.map(name=>data.players.find(p=>p.playerName===name)).filter(Boolean).slice(0,2))},[data,entityType]);
  const profile=useMemo(()=>route.page==='profile'?[...catalog.players,...catalog.teams].find(item=>item.playerName===route.name)||null:null,[route,catalog]);
  const population=useMemo(()=>data?.players.filter(p=>entityType==='team'||(p.gamesPlayed>=(seasonType==='playoffs'?3:15)&&p.minutesPerGame>=10))||[],[data,seasonType,entityType]);
  const enrich=p=>({...p,stats:{...p.stats,trueShootingPercentage:p.stats.fieldGoalsAttempted?Number((p.stats.points/(2*(p.stats.fieldGoalsAttempted+.44*p.stats.freeThrowsAttempted))*100).toFixed(1)):0}});
  const enriched=useMemo(()=>selected.map(enrich),[selected]);
  const enrichedPopulation=useMemo(()=>population.map(enrich),[population]);
  useEffect(()=>{
    const titles={home:'StatsPad · NBA numbers, visualized',leaders:`${SEASON_LABEL} Leaders · StatsPad`};
    if(['team','news','story','article'].includes(route.page))return; // these pages title themselves
    document.title=route.page==='profile'&&profile?`${profile.playerName} · StatsPad`:route.page==='compare'&&enriched.length===2?`${enriched[0].playerName} vs ${enriched[1].playerName} · StatsPad`:route.page==='compare'?'Compare · StatsPad':titles[route.page]||titles.home;
  },[route,profile,enriched]);
  const notify=message=>{setToast(message);setTimeout(()=>setToast(''),2200)};
  const switchSeason=async next=>{if(next===seasonType||seasonChanging)return;const transition=++seasonTransitionRef.current;setSeasonChanging(true);try{const[bundle]=await Promise.all([loadSeasonBundle(next),new Promise(resolve=>window.setTimeout(resolve,180))]);if(transition!==seasonTransitionRef.current)return;setCatalog({players:bundle.players.players,teams:bundle.teams.players});setSplits(bundle.splits);setData(entityType==='team'?bundle.teams:bundle.players);setSeasonType(next);window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>setSeasonChanging(false)))}catch{setSeasonChanging(false)}};
  const share=async()=>{const params=new URLSearchParams({players:enriched.map(p=>p.playerName).join('|'),type:seasonType,mode:entityType}),url=`${location.origin}${location.pathname}?${params}`;await navigator.clipboard.writeText(url);notify('Comparison link copied')};
  const copyTake=async()=>{const leaders=TABLE_STATS.slice(0,5).map(([key,label,inverse])=>{const ordered=[...enriched].sort((a,b)=>(valueOf(b,key)-valueOf(a,key))*(inverse?-1:1));return `${label}: ${ordered[0]?.playerName} (${format(valueOf(ordered[0],key),key)})`});await navigator.clipboard.writeText(`${enriched.map(p=>p.playerName).join(' vs ')} — ${SEASON.stats} ${data.seasonType}\n\n${leaders.join('\n')}\n\nMade with StatsPad`);notify('Debate-ready take copied')};
  const download=()=>{if(chartRef.current)downloadCard(chartRef.current,`${enriched.map(p=>p.playerName).join('-vs-')}-comparison`)};
  if(!data)return <main className="loading"><span></span>Loading the league…</main>;

  const navigate=(query,state=null)=>{
    const next=query?`${location.pathname}?${query}`:location.pathname;
    if(next!==location.pathname+location.search){history.pushState(state,'',next);depthRef.current+=1}
    const names=new URLSearchParams(query).get('players')?.split('|').filter(Boolean);
    if(names?.length)setSelected(names.map(name=>data.players.find(player=>player.playerName===name)).filter(Boolean).slice(0,2));
    setRoute({...routeFrom(query?`?${query}`:''),state});
    scrollTo({top:0,behavior:'smooth'});
  };
  const goBack=()=>depthRef.current>0?history.back():navigate('');
  const goHome=()=>navigate('');
  const openProfile=(item,from=null)=>navigate(`profile=${encodeURIComponent(item.playerName)}`,from?{from}:null);
  const openLeaders=()=>navigate('view=leaders');
  const openTeam=(code='PHI')=>navigate(`team=${code}`);
  const openNews=()=>navigate('view=news');
  const openStory=id=>navigate(`story=${encodeURIComponent(id)}`);
  const openArticle=slug=>navigate(`article=${encodeURIComponent(slug)}`);
  /* Accepts a player, a list of players, or nothing (keeps the current pair).
     Click events are ignored so it can be wired straight to onClick. */
  const openCompare=item=>{
    const items=Array.isArray(item)?item:item?.playerName?[item]:null;
    if(items?.length){setEntityType(items[0].entityType==='team'?'team':'player');setSelected(items.slice(0,2))}
    navigate('view=compare');
  };
  const header=<SiteHeader page={route.page==='team'&&route.team!=='PHI'?'other-team':route.page} onHome={goHome} onCompare={()=>openCompare()} onTeams={()=>openTeam()} onLeaders={openLeaders} theme={theme} onToggleTheme={toggleTheme}/>;

  if(route.page==='leaders')return <main>{header}<LeadersPage players={catalog.players} splits={splits} playerIds={playerIds} Art={EntityArt} onOpen={player=>openProfile(player,'Leaders')} seasonLabel={SEASON_LABEL} seasonType={seasonType} onSeasonTypeChange={switchSeason} hasPlayoffs={SEASON.playoffs} seasonChanging={seasonChanging}/><footer><span>StatsPad · NBA numbers, visualized</span>{footerSource(data)}</footer></main>;
  if(route.page==='team')return <main>{header}{regularPlayers?<TeamPage teamCode={route.team} leaguePlayers={regularPlayers} teamEntity={catalog.teams.find(team=>team.team===route.team)} onOpen={openProfile}/>:<p className="vs-empty">Loading the roster…</p>}<footer><span>StatsPad · NBA numbers, visualized</span>{footerSource(data)}</footer></main>;
  if(route.page==='profile'){
    if(!profile)return <main>{header}<p className="vs-empty">{catalog.players.length?`No player or team called “${route.name}”.`:'Loading…'}</p></main>;
    const entities=profile.entityType==='team'?catalog.teams:catalog.players,from=route.state?.from;
    return <main>{header}<Profile entity={profile} allEntities={entities} playerIds={playerIds} onBack={goBack} backLabel={from?`Back to ${from}`:'Back'} onCompare={openCompare}/><footer><span>StatsPad · NBA numbers, visualized</span>{footerSource(data)}</footer></main>;
  }
  const newsFooter=<footer><span>StatsPad · NBA numbers, visualized</span><span>Headlines, summaries and photos from <a href="https://www.espn.com/nba/" target="_blank" rel="noreferrer">ESPN</a></span></footer>;
  if(route.page==='news')return <main>{header}<NewsIndex onStory={openStory} onArticle={openArticle}/>{newsFooter}</main>;
  if(route.page==='story')return <main>{header}<StoryPage id={route.id} players={regularPlayers||catalog.players} teams={catalog.teams} playerIds={playerIds} Art={EntityArt} seasonLabel={SEASON_LABEL} onOpen={player=>openProfile(player,'the story')} onTeam={openTeam} onStory={openStory} onBack={()=>depthRef.current>0?history.back():openNews()}/>{newsFooter}</main>;
  if(route.page==='article')return <main>{header}<ArticlePage slug={route.slug} onBack={()=>depthRef.current>0?history.back():openNews()} onNavigate={query=>navigate(query)}/><footer><span>StatsPad · NBA numbers, visualized</span>{footerSource(data)}</footer></main>;
  if(route.page==='compare')return <ComparisonPage onTeams={()=>openTeam()} onLeaders={openLeaders} data={data} entityType={entityType} setEntityType={setEntityType} seasonType={seasonType} switchSeason={switchSeason} enriched={enriched} setSelected={setSelected} playerIds={playerIds} enrichedPopulation={enrichedPopulation} chartRef={chartRef} onHome={goHome} onShare={share} onDownload={download} onCopy={copyTake} toast={toast} theme={theme} onToggleTheme={toggleTheme}/>;
  return <main>{header}<FrontPage season={SEASON_LABEL} players={regularPlayers||catalog.players} teams={catalog.teams} playerIds={playerIds} Art={EntityArt} onOpen={openProfile} onCompare={()=>openCompare()} onTeam={openTeam} onLeaders={openLeaders} onNews={openNews} onStory={openStory} onArticle={openArticle}/><footer><span>StatsPad · NBA numbers, visualized</span><span>Stats from <a href={data.source.url} target="_blank" rel="noreferrer">Basketball Reference</a> · games and news from <a href="https://www.espn.com/nba/" target="_blank" rel="noreferrer">ESPN</a></span></footer></main>;
}
