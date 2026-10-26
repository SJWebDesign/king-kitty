import { LENGTH, advance, input, newRoom, player, type Room } from "./game";
import { type CatSkin } from "./cats";

export function tutorialRoom(step: number, name: string, skin: CatSkin = "ginger"): Room {
  const room = newRoom("LEARN", player("learner", name || "King Kitty", 0, undefined, skin), "practice", 1);
  room.status = "racing";
  room.startAt = 1;
  room.course = { obstacles: [], pickups: [] };
  if (step === 0) {
    room.players[0].x = 315;
    room.course.obstacles = [{ id: 0, x: 420, h: 42, kind: 0 }];
  } else if (step === 1) {
    room.course.pickups = [{ id: 0, x: 70, y: 20, kind: "mouse" }];
  } else if (step === 2) {
    room.course.pickups = [{ id: 0, x: 90, y: 125, kind: "bird" }];
  } else {
    room.players[0].x = LENGTH - 700;
  }
  return room;
}

export function tutorialAction(room: Room, step: number, action: "jump" | "grab") {
  if ((step === 0 && action !== "jump") || (step === 1 && action !== "grab") || step > 2) return false;
  return input(room, "learner", action, room.startAt + room.tick);
}

export function advanceTutorial(room: Room, step: number, elapsed: number): "playing" | "done" | "retry" {
  advance(room, room.startAt + elapsed);
  const cat = room.players[0];
  if (step === 0 && cat.hits.length) return "retry";
  if (step === 0 && cat.x > 560 && cat.y === 0) return "done";
  if (step === 1 && cat.collected.length && room.tick >= 900) return "done";
  if (step === 2 && cat.collected.length && cat.y === 0) return "done";
  if (step === 2 && cat.x > 400 && !cat.collected.length) return "retry";
  if (step === 3 && cat.finish !== null) return "done";
  return "playing";
}
