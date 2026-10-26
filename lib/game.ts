import { validCat, type CatSkin } from "./cats";
export const LENGTH = 24000;
export const SPEED = 290;
export const STEP = 20;
export const COLORS = ["#edbc68", "#85d4d1", "#dd9fce", "#a8ce8b", "#f78f7c", "#98b8f8", "#e7d985", "#ccb6f0"];
export type Obstacle = { id: number; x: number; h: number; w?: number; kind: number };
export type Pickup = { id: number; x: number; y: number; kind: "mouse" | "bird" };
export type Course = { obstacles: Obstacle[]; pickups: Pickup[] };
export type Player = {
  id: string; name: string; color: string; token?: string; ready: boolean; skin: CatSkin; profileId?: string;
  x: number; y: number; vy: number; slowUntil: number; boostUntil: number;
  grabUntil: number; nextGrab: number; finish: number | null;
  hits: number[]; collected: number[]; lastSeq: number; seenAt: number; left?: boolean;
};
export type Room = {
  code: string; host: string; mode: "online" | "practice" | "local";
  seed: number; round: number; status: "lobby" | "racing" | "finished";
  startAt: number; tick: number; players: Player[]; course: Course;
  createdAt: number; revision?: number; serverNow?: number;
};
export function random(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function courseFor(seed: number): Course {
  const r = random(seed), obstacles: Obstacle[] = [], pickups: Pickup[] = [];
  for (let x = 1100; x < LENGTH - 450; x += 530 + r() * 310) {
    const id = obstacles.length;
    const sizes=[{h:34,w:58,kind:2},{h:52,w:82,kind:0},{h:86,w:64,kind:0},{h:42,w:126,kind:3},{h:68,w:88,kind:1}];
    const size=sizes[Math.floor(r()*sizes.length)];
    obstacles.push({id,x,...size});
    // A randomly placed opportunity between obstacles. Every racer sees the same course.
    const kind = r() < .55 ? "mouse" : "bird";
    pickups.push({id, x: x + 220 + r() * 90, y: kind === "mouse" ? 20 : 125, kind});
  }
  return {obstacles, pickups};
}
// The same clock drives movement and hit detection on every device.
export function pickupPosition(obj: Pickup, elapsed: number) {
  const phase = elapsed / (obj.kind === "bird" ? 700 : 450) + obj.id * 1.7;
  return {
    x: obj.x + Math.sin(phase) * (obj.kind === "bird" ? 55 : 32),
    y: obj.y + (obj.kind === "bird" ? Math.sin(phase * .8) * 10 : 0),
    facing: Math.cos(phase) < 0 ? -1 : 1,
  };
}
export function player(id: string, name: string, index = 0, token?: string, skin: CatSkin = "ginger"): Player {
  return {id, name, color: COLORS[index % COLORS.length], token, ready: false, skin: validCat(skin),
    x: 0, y: 0, vy: 0, slowUntil: 0, boostUntil: 0, grabUntil: 0, nextGrab: 0,
    finish: null, hits: [], collected: [], lastSeq: 0, seenAt: Date.now()};
}
export function newRoom(code: string, host: Player, mode: Room["mode"] = "online", seed = Date.now()): Room {
  return {code, host: host.id, mode, seed, round: 1, status: "lobby", startAt: 0,
    tick: 0, players: [host], course: courseFor(seed), createdAt: Date.now()};
}
export function start(room: Room, now: number) {
  room.status = "racing"; room.startAt = now + 4000; room.tick = 0;
}
export function rematch(room: Room, seed: number) {
  room.seed = seed; room.round++; room.status = "lobby"; room.tick = 0; room.startAt = 0;
  room.course = courseFor(seed);
  room.players = room.players.filter(p => !p.left).map((p,i) => ({...player(p.id,p.name,i,p.token,validCat(p.skin)),profileId:p.profileId}));
}
export function input(room: Room, id: string, action: "jump" | "grab", now: number, seq?: number) {
  const p = room.players.find(p => p.id === id);
  if (!p || p.left || p.finish !== null || room.status !== "racing" || now < room.startAt) return false;
  if (seq !== undefined) { if (seq <= p.lastSeq) return false; p.lastSeq = seq; }
  const elapsed = room.tick;
  if (action === "jump" && p.y <= .01) { p.vy = 625; p.y = .02; return true; }
  if (action === "grab" && elapsed >= p.nextGrab) {
    p.grabUntil = elapsed + 300; p.nextGrab = elapsed + 480; return true;
  }
  return false;
}
export function advance(room: Room, now: number) {
  if (room.status !== "racing" || now <= room.startAt) return;
  const target = Math.min(150000, Math.floor((now - room.startAt) / STEP) * STEP);
  while (room.tick < target) {
    const t = room.tick, dt = STEP / 1000;
    for (const p of room.players) {
      if (p.finish !== null || p.left) continue;
      const oldX = p.x;
      const speed = SPEED * (t < p.slowUntil ? .52 : 1) * (t < p.boostUntil ? 1.25 : 1);
      p.x = Math.min(LENGTH, p.x + speed * dt);
      if (p.y > 0 || p.vy > 0) { p.y = Math.max(0, p.y + p.vy * dt); p.vy -= 1550 * dt; if (p.y === 0) p.vy = 0; }
      for (const ob of room.course.obstacles) {
        const reach=(ob.w??50)/2+10;
        if (oldX <= ob.x + reach && p.x >= ob.x - reach && p.y < ob.h && !p.hits.includes(ob.id)) {
          p.hits.push(ob.id); p.slowUntil = t + 760;
        }
      }
      if (p.grabUntil > t) for (const obj of room.course.pickups) {
        const position = pickupPosition(obj, t);
        const canReach = obj.kind !== "bird" || p.y > 10;
        if (canReach && !p.collected.includes(obj.id) && position.x - p.x > -35 && position.x - p.x < 100 && Math.abs(position.y - (p.y + 30)) < 62) {
          p.collected.push(obj.id); p.boostUntil = Math.max(p.boostUntil,t) + 1300; break;
        }
      }
      if (p.x >= LENGTH) p.finish = t + (LENGTH - oldX) / speed * 1000;
    }
    room.tick += STEP;
    if (room.players.every(p => p.finish !== null || p.left)) { room.status = "finished"; break; }
  }
  if (room.tick >= 150000) room.status = "finished";
}
export function standings(room: Room) {
  return [...room.players].sort((a,b) => {
    if (a.finish !== null && b.finish !== null) return a.finish - b.finish;
    if (a.finish !== null) return -1;
    if (b.finish !== null) return 1;
    return b.x - a.x;
  });
}
export function publicRoom(room: Room, revision = 0, now = Date.now()): Room {
  return {...room, revision, serverNow: now, players: room.players.map(({token: _token,...p}) => p)};
}
