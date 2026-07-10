import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import {
  users,
  sessions,
  registeredDevices,
  refreshTokens,
  loginAttempts,
} from "./auth";
import { wallets } from "./wallets";
import { accountTypes } from "./account_types";
import { accounts } from "./accounts";
import { ledgerEntries } from "./ledger";
import { settlementAccounts } from "./settlement_accounts";
import { paymentIntents } from "./payment_intents";
import { transactions } from "./transactions";
import { paymentHolds } from "./payment_holds";
import { scheduledPayments } from "./scheduled_payments";
import { recurringPayments } from "./recurring_payments";
import { settlements } from "./settlements";
import { reconciliationBatches, reconciliationItems } from "./reconciliation";
import { physicalCards } from "./physical_cards";
import { virtualCards } from "./virtual_cards";
import { networkTokens } from "./network_tokens";
import { cardArtwork } from "./card_artwork";
import { upiAccounts } from "./upi_accounts";
import { upiHandles } from "./upi_handles";
import { upiCollectRequests } from "./upi_collect_requests";
import { upiMandates } from "./upi_mandates";
import { upiDevices } from "./upi_devices";
import { beneficiaries } from "./beneficiaries";
import { merchantCategories } from "./merchant_categories";
import { merchants } from "./merchants";
import { merchantLocations } from "./merchant_locations";
import { merchantTerminals } from "./merchant_terminals";
import { merchantSettlements } from "./merchant_settlements";
import { documentCategories } from "./document_categories";
import { documents } from "./documents";
import { documentVersions } from "./document_versions";
import { files } from "./files";
import { documentFiles } from "./document_files";
import { documentVerificationHistory } from "./document_verification_history";
import { documentOcrResults } from "./document_ocr_results";
import { documentAiInsights } from "./document_ai_insights";
import { tickets } from "./tickets";
import { ticketQrs } from "./ticket_qr";
import { ticketValidations } from "./ticket_validation";
import { ticketEvents } from "./ticket_events";
import { transportOperators } from "./transport_operators";
import { metroCards } from "./metro_cards";
import { metroPasses } from "./metro_passes";
import { metroTransactions } from "./metro_transactions";
import { transportUsage } from "./transport_usage";
import { rewardCatalog } from "./reward_catalog";
import { rewardBalances } from "./reward_balances";
import { rewardTransactions } from "./reward_transactions";
import { pgProviders } from "./pg_providers";
import { pgCredentials } from "./pg_credentials";
import { pgPaymentIntents } from "./pg_payment_intents";
import { pgWebhookEvents } from "./pg_webhook_events";
import { pgRefunds } from "./pg_refunds";

// ── Auth relations ──

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  sessions: many(sessions),
  devices: many(registeredDevices),
  loginAttempts: many(loginAttempts),
  paymentIntents: many(paymentIntents),
  transactions: many(transactions),
  scheduledPayments: many(scheduledPayments),
  recurringPayments: many(recurringPayments),
  upiAccounts: many(upiAccounts),
  beneficiaries: many(beneficiaries),
  documents: many(documents),
  tickets: many(tickets),
  metroCards: many(metroCards),
  metroPasses: many(metroPasses),
  metroTransactions: many(metroTransactions),
  transportUsage: many(transportUsage),
  rewardBalances: many(rewardBalances),
  rewardTransactions: many(rewardTransactions),
}));

export const registeredDevicesRelations = relations(
  registeredDevices,
  ({ one, many }) => ({
    user: one(users, {
      fields: [registeredDevices.userId],
      references: [users.id],
    }),
    sessions: many(sessions),
  }),
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  device: one(registeredDevices, {
    fields: [sessions.deviceId],
    references: [registeredDevices.id],
  }),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  session: one(sessions, {
    fields: [refreshTokens.sessionId],
    references: [sessions.id],
  }),
  replacedBy: one(refreshTokens, {
    fields: [refreshTokens.replacedByTokenId],
    references: [refreshTokens.id],
  }),
}));

export const loginAttemptsRelations = relations(loginAttempts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [loginAttempts.tenantId],
    references: [tenants.id],
  }),
}));

// ── Wallet / Ledger relations ──

export const walletsRelations = relations(wallets, ({ many }) => ({
  accounts: many(accounts),
  paymentIntents: many(paymentIntents),
  scheduledPayments: many(scheduledPayments),
  recurringPayments: many(recurringPayments),
  physicalCards: many(physicalCards),
  virtualCards: many(virtualCards),
}));

export const accountTypesRelations = relations(accountTypes, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [accounts.walletId],
    references: [wallets.id],
  }),
  accountType: one(accountTypes, {
    fields: [accounts.accountTypeId],
    references: [accountTypes.id],
  }),
  ledgerEntries: many(ledgerEntries),
  settlementAccounts: many(settlementAccounts),
  paymentHolds: many(paymentHolds),
  merchantSettlements: many(merchantSettlements),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  account: one(accounts, {
    fields: [ledgerEntries.accountId],
    references: [accounts.id],
  }),
}));

export const settlementAccountsRelations = relations(
  settlementAccounts,
  ({ one }) => ({
    account: one(accounts, {
      fields: [settlementAccounts.accountId],
      references: [accounts.id],
    }),
  }),
);

// ── Card relations ──

export const physicalCardsRelations = relations(
  physicalCards,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [physicalCards.walletId],
      references: [wallets.id],
    }),
    artwork: one(cardArtwork, {
      fields: [physicalCards.artworkId],
      references: [cardArtwork.id],
    }),
  }),
);

export const virtualCardsRelations = relations(virtualCards, ({ one }) => ({
  wallet: one(wallets, {
    fields: [virtualCards.walletId],
    references: [wallets.id],
  }),
  artwork: one(cardArtwork, {
    fields: [virtualCards.artworkId],
    references: [cardArtwork.id],
  }),
}));

export const networkTokensRelations = relations(networkTokens, ({ one }) => ({
  /* cardType + cardId is polymorphic — resolved at application layer */
}));

export const cardArtworkRelations = relations(cardArtwork, ({ many }) => ({
  physicalCards: many(physicalCards),
  virtualCards: many(virtualCards),
}));

// ── UPI relations ──

export const upiAccountsRelations = relations(upiAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [upiAccounts.userId],
    references: [users.id],
  }),
  handles: many(upiHandles),
  devices: many(upiDevices),
}));

export const upiHandlesRelations = relations(upiHandles, ({ one, many }) => ({
  upiAccount: one(upiAccounts, {
    fields: [upiHandles.upiAccountId],
    references: [upiAccounts.id],
  }),
  payerCollectRequests: many(upiCollectRequests, {
    relationName: "payerHandle",
  }),
  payeeCollectRequests: many(upiCollectRequests, {
    relationName: "payeeHandle",
  }),
  payerMandates: many(upiMandates, {
    relationName: "payerHandleMandate",
  }),
  payeeMandates: many(upiMandates, {
    relationName: "payeeHandleMandate",
  }),
}));

export const upiCollectRequestsRelations = relations(
  upiCollectRequests,
  ({ one }) => ({
    payerHandle: one(upiHandles, {
      fields: [upiCollectRequests.payerHandleId],
      references: [upiHandles.id],
      relationName: "payerHandle",
    }),
    payeeHandle: one(upiHandles, {
      fields: [upiCollectRequests.payeeHandleId],
      references: [upiHandles.id],
      relationName: "payeeHandle",
    }),
    paymentIntent: one(paymentIntents, {
      fields: [upiCollectRequests.paymentIntentId],
      references: [paymentIntents.id],
    }),
  }),
);

export const upiMandatesRelations = relations(upiMandates, ({ one }) => ({
  payerHandle: one(upiHandles, {
    fields: [upiMandates.payerHandleId],
    references: [upiHandles.id],
    relationName: "payerHandleMandate",
  }),
  payeeHandle: one(upiHandles, {
    fields: [upiMandates.payeeHandleId],
    references: [upiHandles.id],
    relationName: "payeeHandleMandate",
  }),
  paymentIntent: one(paymentIntents, {
    fields: [upiMandates.paymentIntentId],
    references: [paymentIntents.id],
  }),
}));

export const upiDevicesRelations = relations(upiDevices, ({ one }) => ({
  upiAccount: one(upiAccounts, {
    fields: [upiDevices.upiAccountId],
    references: [upiAccounts.id],
  }),
}));

// ── Beneficiary relations ──

export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  user: one(users, {
    fields: [beneficiaries.userId],
    references: [users.id],
  }),
}));

// ── Merchant relations ──

export const merchantCategoriesRelations = relations(
  merchantCategories,
  ({ many }) => ({
    merchants: many(merchants),
  }),
);

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  category: one(merchantCategories, {
    fields: [merchants.categoryCode],
    references: [merchantCategories.code],
  }),
  locations: many(merchantLocations),
  terminals: many(merchantTerminals),
  settlementAccounts: many(merchantSettlements),
  paymentIntents: many(paymentIntents),
  transactions: many(transactions),
}));

export const merchantLocationsRelations = relations(
  merchantLocations,
  ({ one, many }) => ({
    merchant: one(merchants, {
      fields: [merchantLocations.merchantId],
      references: [merchants.id],
    }),
    terminals: many(merchantTerminals),
  }),
);

export const merchantTerminalsRelations = relations(
  merchantTerminals,
  ({ one }) => ({
    merchant: one(merchants, {
      fields: [merchantTerminals.merchantId],
      references: [merchants.id],
    }),
    location: one(merchantLocations, {
      fields: [merchantTerminals.merchantLocationId],
      references: [merchantLocations.id],
    }),
  }),
);

export const merchantSettlementsRelations = relations(
  merchantSettlements,
  ({ one }) => ({
    merchant: one(merchants, {
      fields: [merchantSettlements.merchantId],
      references: [merchants.id],
    }),
    account: one(accounts, {
      fields: [merchantSettlements.accountId],
      references: [accounts.id],
    }),
  }),
);

// ── Payment relations (updated) ──

export const paymentIntentsRelations = relations(
  paymentIntents,
  ({ one, many }) => ({
    user: one(users, {
      fields: [paymentIntents.userId],
      references: [users.id],
    }),
    wallet: one(wallets, {
      fields: [paymentIntents.walletId],
      references: [wallets.id],
    }),
    merchant: one(merchants, {
      fields: [paymentIntents.merchantId],
      references: [merchants.id],
    }),
    transactions: many(transactions),
    paymentHolds: many(paymentHolds),
    scheduledPayments: many(scheduledPayments),
    upiCollectRequests: many(upiCollectRequests),
    upiMandates: many(upiMandates),
    pgPaymentIntents: many(pgPaymentIntents),
  }),
);

export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    paymentIntent: one(paymentIntents, {
      fields: [transactions.paymentIntentId],
      references: [paymentIntents.id],
    }),
    user: one(users, {
      fields: [transactions.userId],
      references: [users.id],
    }),
    merchant: one(merchants, {
      fields: [transactions.merchantId],
      references: [merchants.id],
    }),
    reconciliationItems: many(reconciliationItems),
  }),
);

export const paymentHoldsRelations = relations(paymentHolds, ({ one }) => ({
  paymentIntent: one(paymentIntents, {
    fields: [paymentHolds.paymentIntentId],
    references: [paymentIntents.id],
  }),
  account: one(accounts, {
    fields: [paymentHolds.accountId],
    references: [accounts.id],
  }),
}));

export const scheduledPaymentsRelations = relations(
  scheduledPayments,
  ({ one, many }) => ({
    user: one(users, {
      fields: [scheduledPayments.userId],
      references: [users.id],
    }),
    wallet: one(wallets, {
      fields: [scheduledPayments.walletId],
      references: [wallets.id],
    }),
    paymentIntent: one(paymentIntents, {
      fields: [scheduledPayments.paymentIntentId],
      references: [paymentIntents.id],
    }),
    recurringPayments: many(recurringPayments),
  }),
);

export const recurringPaymentsRelations = relations(
  recurringPayments,
  ({ one }) => ({
    user: one(users, {
      fields: [recurringPayments.userId],
      references: [users.id],
    }),
    wallet: one(wallets, {
      fields: [recurringPayments.walletId],
      references: [wallets.id],
    }),
    scheduledPayment: one(scheduledPayments, {
      fields: [recurringPayments.scheduledPaymentId],
      references: [scheduledPayments.id],
    }),
  }),
);

// ── Settlement / Reconciliation relations ──

export const settlementsRelations = relations(settlements, ({ many }) => ({
  reconciliationItems: many(reconciliationItems),
}));

export const reconciliationBatchesRelations = relations(
  reconciliationBatches,
  ({ many }) => ({
    items: many(reconciliationItems),
  }),
);

export const reconciliationItemsRelations = relations(
  reconciliationItems,
  ({ one }) => ({
    batch: one(reconciliationBatches, {
      fields: [reconciliationItems.reconciliationBatchId],
      references: [reconciliationBatches.id],
    }),
    transaction: one(transactions, {
      fields: [reconciliationItems.transactionId],
      references: [transactions.id],
    }),
    settlement: one(settlements, {
      fields: [reconciliationItems.settlementId],
      references: [settlements.id],
    }),
  }),
);

// ── Document / File relations ──

export const documentCategoriesRelations = relations(
  documentCategories,
  ({ many }) => ({
    documents: many(documents),
  }),
);

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  category: one(documentCategories, {
    fields: [documents.categoryId],
    references: [documentCategories.id],
  }),
  versions: many(documentVersions),
  verificationHistory: many(documentVerificationHistory),
}));

export const documentVersionsRelations = relations(
  documentVersions,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [documentVersions.documentId],
      references: [documents.id],
    }),
    documentFiles: many(documentFiles),
    ocrResults: many(documentOcrResults),
    aiInsights: many(documentAiInsights),
  }),
);

export const filesRelations = relations(files, ({ many }) => ({
  documentFiles: many(documentFiles),
}));

export const documentFilesRelations = relations(
  documentFiles,
  ({ one }) => ({
    documentVersion: one(documentVersions, {
      fields: [documentFiles.documentVersionId],
      references: [documentVersions.id],
    }),
    file: one(files, {
      fields: [documentFiles.fileId],
      references: [files.id],
    }),
  }),
);

export const documentVerificationHistoryRelations = relations(
  documentVerificationHistory,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentVerificationHistory.documentId],
      references: [documents.id],
    }),
    user: one(users, {
      fields: [documentVerificationHistory.userId],
      references: [users.id],
    }),
  }),
);

export const documentOcrResultsRelations = relations(
  documentOcrResults,
  ({ one }) => ({
    documentVersion: one(documentVersions, {
      fields: [documentOcrResults.documentVersionId],
      references: [documentVersions.id],
    }),
  }),
);

export const documentAiInsightsRelations = relations(
  documentAiInsights,
  ({ one }) => ({
    documentVersion: one(documentVersions, {
      fields: [documentAiInsights.documentVersionId],
      references: [documentVersions.id],
    }),
  }),
);

// ── Ticket relations ──

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  qrCodes: many(ticketQrs),
  validations: many(ticketValidations),
  events: many(ticketEvents),
}));

export const ticketQrsRelations = relations(ticketQrs, ({ one, many }) => ({
  ticket: one(tickets, {
    fields: [ticketQrs.ticketId],
    references: [tickets.id],
  }),
  validations: many(ticketValidations),
}));

export const ticketValidationsRelations = relations(
  ticketValidations,
  ({ one }) => ({
    ticket: one(tickets, {
      fields: [ticketValidations.ticketId],
      references: [tickets.id],
    }),
    ticketQr: one(ticketQrs, {
      fields: [ticketValidations.ticketQrId],
      references: [ticketQrs.id],
    }),
  }),
);

export const ticketEventsRelations = relations(ticketEvents, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketEvents.ticketId],
    references: [tickets.id],
  }),
}));

// ── Transport relations ──

export const transportOperatorsRelations = relations(
  transportOperators,
  ({ many }) => ({
    metroCards: many(metroCards),
    metroPasses: many(metroPasses),
    metroTransactions: many(metroTransactions),
    transportUsage: many(transportUsage),
  }),
);

export const metroCardsRelations = relations(metroCards, ({ one, many }) => ({
  user: one(users, {
    fields: [metroCards.userId],
    references: [users.id],
  }),
  operator: one(transportOperators, {
    fields: [metroCards.operatorId],
    references: [transportOperators.id],
  }),
  transactions: many(metroTransactions),
}));

export const metroPassesRelations = relations(metroPasses, ({ one, many }) => ({
  user: one(users, {
    fields: [metroPasses.userId],
    references: [users.id],
  }),
  operator: one(transportOperators, {
    fields: [metroPasses.operatorId],
    references: [transportOperators.id],
  }),
  transactions: many(metroTransactions),
}));

export const metroTransactionsRelations = relations(
  metroTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [metroTransactions.userId],
      references: [users.id],
    }),
    operator: one(transportOperators, {
      fields: [metroTransactions.operatorId],
      references: [transportOperators.id],
    }),
    metroCard: one(metroCards, {
      fields: [metroTransactions.metroCardId],
      references: [metroCards.id],
    }),
    metroPass: one(metroPasses, {
      fields: [metroTransactions.metroPassId],
      references: [metroPasses.id],
    }),
  }),
);

export const transportUsageRelations = relations(transportUsage, ({ one }) => ({
  user: one(users, {
    fields: [transportUsage.userId],
    references: [users.id],
  }),
  operator: one(transportOperators, {
    fields: [transportUsage.operatorId],
    references: [transportOperators.id],
  }),
}));

// ── Reward relations ──

export const rewardBalancesRelations = relations(rewardBalances, ({ one }) => ({
  user: one(users, {
    fields: [rewardBalances.userId],
    references: [users.id],
  }),
}));

export const rewardTransactionsRelations = relations(
  rewardTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [rewardTransactions.userId],
      references: [users.id],
    }),
    rewardCatalog: one(rewardCatalog, {
      fields: [rewardTransactions.rewardCatalogId],
      references: [rewardCatalog.id],
    }),
  }),
);

// ── Payment Gateway relations ──

export const pgProvidersRelations = relations(pgProviders, ({ many }) => ({
  credentials: many(pgCredentials),
  paymentIntents: many(pgPaymentIntents),
  webhookEvents: many(pgWebhookEvents),
}));

export const pgCredentialsRelations = relations(
  pgCredentials,
  ({ one, many }) => ({
    provider: one(pgProviders, {
      fields: [pgCredentials.pgProviderId],
      references: [pgProviders.id],
    }),
    merchant: one(merchants, {
      fields: [pgCredentials.merchantId],
      references: [merchants.id],
    }),
    paymentIntents: many(pgPaymentIntents),
  }),
);

export const pgPaymentIntentsRelations = relations(
  pgPaymentIntents,
  ({ one, many }) => ({
    paymentIntent: one(paymentIntents, {
      fields: [pgPaymentIntents.paymentIntentId],
      references: [paymentIntents.id],
    }),
    provider: one(pgProviders, {
      fields: [pgPaymentIntents.pgProviderId],
      references: [pgProviders.id],
    }),
    credential: one(pgCredentials, {
      fields: [pgPaymentIntents.pgCredentialId],
      references: [pgCredentials.id],
    }),
    refunds: many(pgRefunds),
  }),
);

export const pgWebhookEventsRelations = relations(
  pgWebhookEvents,
  ({ one }) => ({
    provider: one(pgProviders, {
      fields: [pgWebhookEvents.pgProviderId],
      references: [pgProviders.id],
    }),
  }),
);

export const pgRefundsRelations = relations(pgRefunds, ({ one }) => ({
  pgPaymentIntent: one(pgPaymentIntents, {
    fields: [pgRefunds.pgPaymentIntentId],
    references: [pgPaymentIntents.id],
  }),
}));
