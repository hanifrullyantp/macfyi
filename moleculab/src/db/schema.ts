import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["student", "teacher", "admin"]);
export const contentTypeEnum = pgEnum("content_type", ["text", "richtext", "template"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().notNull(), // Sesuai Auth ID Supabase
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: roleEnum("role").default("student").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const contentBlocks = pgTable("content_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentKey: text("content_key").unique().notNull(),
  contentValue: text("content_value").notNull(),
  contentType: contentTypeEnum("content_type").default("text").notNull(),
  updatedBy: uuid("updated_by").references(() => profiles.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
