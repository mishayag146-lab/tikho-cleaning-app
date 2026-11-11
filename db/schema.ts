import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  owner: text("owner").notNull(),
  data: text("data").notNull(),
});
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  created: text("created").notNull(),
  status: text("status").notNull(),
  data: text("data").notNull(),
  version: integer("version").notNull().default(1),
});
