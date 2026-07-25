export * from "./enums";
export * from "./users";
export * from "./devices";
export * from "./sessions";
export * from "./wallets";
export * from "./cards";
export * from "./upi-accounts";
export * from "./transactions";
export * from "./beneficiaries";
export * from "./documents";
export * from "./tickets";
export * from "./rewards";
export * from "./notifications";
export * from "./budgets";
export * from "./reserved-amounts";
export * from "./transport-passes";
export * from "./subscriptions";
export * from "./event-log";
export * from "./audit-logs";

import { relations } from "drizzle-orm";
import { users } from "./users";
import { devices } from "./devices";
import { sessions } from "./sessions";
import { wallets } from "./wallets";
import { cards } from "./cards";
import { upiAccounts } from "./upi-accounts";
import { transactions } from "./transactions";
import { beneficiaries } from "./beneficiaries";
import { documents } from "./documents";
import { tickets } from "./tickets";
import { rewards } from "./rewards";
import { notifications } from "./notifications";
import { budgets } from "./budgets";
import { reservedAmounts } from "./reserved-amounts";
import { transportPasses } from "./transport-passes";
import { subscriptions } from "./subscriptions";
import { eventLog } from "./event-log";
import { auditLogs } from "./audit-logs";

export const usersRelations = relations(users, ({ many, one }) => ({
  devices: many(devices),
  sessions: many(sessions),
  wallet: one(wallets),
  cards: many(cards),
  upiAccounts: many(upiAccounts),
  transactions: many(transactions),
  beneficiaries: many(beneficiaries),
  documents: many(documents),
  tickets: many(tickets),
  rewards: many(rewards),
  notifications: many(notifications),
  budgets: many(budgets),
  reservedAmounts: many(reservedAmounts),
  transportPasses: many(transportPasses),
  subscriptions: many(subscriptions),
  eventLog: many(eventLog),
  auditLogs: many(auditLogs),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, { fields: [devices.userId], references: [users.id] }),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  device: one(devices, { fields: [sessions.deviceId], references: [devices.id] }),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  user: one(users, { fields: [cards.userId], references: [users.id] }),
}));

export const upiAccountsRelations = relations(upiAccounts, ({ one }) => ({
  user: one(users, { fields: [upiAccounts.userId], references: [users.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  subscriptions: many(subscriptions),
}));

export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  user: one(users, { fields: [beneficiaries.userId], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, { fields: [tickets.userId], references: [users.id] }),
}));

export const rewardsRelations = relations(rewards, ({ one }) => ({
  user: one(users, { fields: [rewards.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
}));

export const reservedAmountsRelations = relations(reservedAmounts, ({ one }) => ({
  user: one(users, { fields: [reservedAmounts.userId], references: [users.id] }),
}));

export const transportPassesRelations = relations(transportPasses, ({ one }) => ({
  user: one(users, { fields: [transportPasses.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  detectedFromTxn: one(transactions, { fields: [subscriptions.detectedFromTxnId], references: [transactions.id] }),
}));

export const eventLogRelations = relations(eventLog, ({ one }) => ({
  user: one(users, { fields: [eventLog.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
  device: one(devices, { fields: [auditLogs.deviceId], references: [devices.id] }),
}));
