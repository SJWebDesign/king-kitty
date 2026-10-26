// Tight crops of the first atlas row. Equal-height grid cells also included
// the top of the lantern/window/pipe in the next row, distorting the obstacles.
export const OBSTACLE_FRAMES = [
  {x:56,y:101,w:296,h:205},
  {x:435,y:97,w:329,h:212},
  {x:809,y:132,w:322,h:166},
  {x:1172,y:122,w:334,h:181},
];
// Twelve solid-height samples across each cropped sprite, measured from its
// visible silhouette. Sloped rubble and spilled trash are not solid rectangles.
const PROFILES = [
  [.83,.87,.92,.96,1,.98,.97,.96,.96,.95,.94,.95],
  [.61,.86,.98,.99,.96,.94,.92,.92,.93,.77,.32,.22],
  [.67,.85,.89,.96,.98,.93,.88,.86,.86,.88,.9,.69],
  [.32,.39,.58,.7,.8,.92,.98,.98,.94,.69,.54,.38],
];
type ObstacleShape = {x:number;w?:number;h:number;kind:number};
type Position = {x:number;y:number};
export const obstacleWidth = (ob:ObstacleShape) => ob.w ?? 70;

export function hitsObstacle(ob:ObstacleShape, from:Position, to:Position):boolean {
  const width=obstacleWidth(ob), left=ob.x-width/2;
  const profile=PROFILES[ob.kind]??PROFILES[0];
  const dx=to.x-from.x;
  // Use the cat's body, not its decorative tail, and give grazing paws a small
  // margin. Evaluate height only while the cat actually overlaps each slice.
  return profile.some((height,index)=>{
    const edge0=left+Math.max(2,width*index/profile.length)-10;
    const edge1=left+Math.min(width-2,width*(index+1)/profile.length)+10;
    if(to.x<=edge0||from.x>=edge1)return false;
    const enter=dx>0?Math.max(0,(edge0-from.x)/dx):0;
    const exit=dx>0?Math.min(1,(edge1-from.x)/dx):1;
    const y0=from.y+(to.y-from.y)*enter, y1=from.y+(to.y-from.y)*exit;
    return Math.min(y0,y1)<ob.h*height-3;
  });
}
