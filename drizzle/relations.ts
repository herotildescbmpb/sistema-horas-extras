import { relations } from "drizzle-orm";
import { users, departments, overtimeRecords } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  overtimeRecords: many(overtimeRecords),
}));

export const departmentsRelations = relations(departments, ({ one }) => ({
  chefe: one(users, {
    fields: [departments.chefeId],
    references: [users.id],
  }),
}));

export const overtimeRecordsRelations = relations(overtimeRecords, ({ one }) => ({
  user: one(users, {
    fields: [overtimeRecords.userId],
    references: [users.id],
  }),
}));
