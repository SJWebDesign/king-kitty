import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const rooms = sqliteTable("rooms", {
  code: text("code").primaryKey(),
  state: text("state").notNull(),
  revision: integer("revision").notNull().default(0),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("room_expiry").on(table.expiresAt)]);

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(), secretHash: text("secret_hash").notNull(),
  name: text("name").notNull(), createdAt: integer("created_at").notNull(),
});
export const raceResults = sqliteTable("race_results", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull(),
  matchId: text("match_id").notNull(), mode: text("mode").notNull(),
  timeMs: integer("time_ms").notNull(), won: integer("won").notNull(),
  skin: text("skin").notNull(), finishedAt: integer("finished_at").notNull(),
}, table => [index("result_profile").on(table.profileId),index("result_mode_time").on(table.mode,table.timeMs),index("result_match").on(table.matchId)]);
