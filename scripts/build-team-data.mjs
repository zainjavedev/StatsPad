import fs from 'node:fs';
import path from 'node:path';

const [input, output, seasonType] = process.argv.slice(2);
if (!input || !output || !seasonType) throw new Error('Usage: node scripts/build-team-data.mjs input.html output.json "Regular Season"');
const html = fs.readFileSync(input, 'utf8');
const table = html.match(/<table[^>]+id="per_game-team"[\s\S]*?<\/table>/)?.[0];
if (!table) throw new Error('Team per-game table not found');
const clean = (value='') => value.replace(/<[^>]+>/g,'').replaceAll('&amp;','&').replace('*','').trim();
const get = (row,stat) => row.match(new RegExp(`<t[dh][^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/t[dh]>`))?.[1] ?? '';
const num = (row,stat,pct=false) => {const value=Number(clean(get(row,stat)));return Number.isFinite(value)?(pct?Number((value*100).toFixed(1)):value):0};
const ids={ATL:1610612737,BOS:1610612738,CLE:1610612739,NOP:1610612740,CHI:1610612741,DAL:1610612742,DEN:1610612743,GSW:1610612744,HOU:1610612745,LAC:1610612746,LAL:1610612747,MIA:1610612748,MIL:1610612749,MIN:1610612750,BKN:1610612751,BRK:1610612751,NYK:1610612752,ORL:1610612753,IND:1610612754,PHI:1610612755,PHX:1610612756,PHO:1610612756,POR:1610612757,SAC:1610612758,SAS:1610612759,OKC:1610612760,TOR:1610612761,UTA:1610612762,MEM:1610612763,WAS:1610612764,DET:1610612765,CHA:1610612766,CHO:1610612766};
const teams=[...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>m[1]).filter(row=>get(row,'team').includes('/teams/')).map((row,index)=>{
  const teamCell=get(row,'team'),abbr=teamCell.match(/\/teams\/([A-Z]+)\//)?.[1]||'';
  const fgm=num(row,'fg'),fga=num(row,'fga'),threes=num(row,'fg3');
  return {entityType:'team',teamId:ids[abbr],team:abbr,playerName:clean(teamCell),rank:index+1,gamesPlayed:num(row,'g'),position:'Team',stats:{points:num(row,'pts'),assists:num(row,'ast'),totalRebounds:num(row,'trb'),offensiveRebounds:num(row,'orb'),defensiveRebounds:num(row,'drb'),steals:num(row,'stl'),blocks:num(row,'blk'),turnovers:num(row,'tov'),personalFouls:num(row,'pf'),fieldGoalsMade:fgm,fieldGoalsAttempted:fga,fieldGoalPercentage:num(row,'fg_pct',true),threePointersMade:threes,threePointersAttempted:num(row,'fg3a'),threePointPercentage:num(row,'fg3_pct',true),freeThrowsMade:num(row,'ft'),freeThrowsAttempted:num(row,'fta'),freeThrowPercentage:num(row,'ft_pct',true),effectiveFieldGoalPercentage:fga?Number(((fgm+.5*threes)/fga*100).toFixed(1)):0}};
}).sort((a,b)=>b.stats.points-a.stats.points).map((team,index)=>({...team,rank:index+1}));
const payload={season:'2025-26',seasonType,description:`NBA team per-game statistics for the 2025-26 ${seasonType.toLowerCase()}`,lastUpdated:'2026-09-15',source:{name:'Basketball Reference',url:seasonType==='Playoffs'?'https://www.basketball-reference.com/playoffs/NBA_2026.html':'https://www.basketball-reference.com/leagues/NBA_2026.html'},totalTeams:teams.length,players:teams};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(payload,null,2)}\n`);console.log(`Wrote ${teams.length} teams to ${output}`);
