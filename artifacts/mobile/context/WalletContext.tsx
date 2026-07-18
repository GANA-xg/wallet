import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

import type {
  Budget,
  CardRecord,
  Reward,
  ReservedAmount,
  Ticket,
  Transaction,
  TransportPass,
  PaymentHold,
  ScheduledPayment,
  UPIAccount,
  VaultDocument,
  VaultNotification,
} from "@/types";

interface WalletContextType {
  balance: number;
  setBalance: (b: number) => void;
  spendableBalance: number;
  totalReserved: number;
  getPaymentPreview: (amount: number) => { remainingBalance: number; remainingSpendable: number };
  canAffordPayment: (amount: number) => boolean;
  paymentHolds: PaymentHold[];
  scheduledPayments: ScheduledPayment[];
  createPaymentHold: (input: { amount: number; merchant: string; payeeAddress: string; note?: string }) => PaymentHold | null;
  releasePaymentHold: (holdId: string) => void;
  commitPaymentHold: (holdId: string, transaction: Transaction) => void;
  schedulePayment: (input: { amount: number; merchant: string; payeeAddress: string; note?: string; scheduledFor: string }) => ScheduledPayment | null;
  cancelScheduledPayment: (paymentId: string) => void;
  cards: CardRecord[];
  addCard: (c: CardRecord) => void;
  removeCard: (id: string) => void;
  toggleFreeze: (id: string) => void;
  upiAccounts: UPIAccount[];
  setPrimaryUPI: (id: string) => void;
  addUPIAccount: (u: UPIAccount) => void;
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
  documents: VaultDocument[];
  addDocument: (d: VaultDocument) => void;
  removeDocument: (id: string) => void;
  tickets: Ticket[];
  addTicket: (t: Ticket) => void;
  removeTicket: (id: string) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  findTicketByPNR: (pnr: string) => Ticket | undefined;
  rewards: Reward[];
  notifications: VaultNotification[];
  markRead: (id: string) => void;
  unreadCount: number;
  budgets: Budget[];
  reservedAmounts: ReservedAmount[];
  addReservation: (r: ReservedAmount) => void;
  removeReservation: (id: string) => void;
  transportPasses: TransportPass[];
  topUpTransport: (id: string, amount: number) => void;
  upiLite: number;
}

const WalletContext = createContext<WalletContextType>({
  balance: 0,
  setBalance: () => {},
  spendableBalance: 0,
  totalReserved: 0,
  getPaymentPreview: () => ({ remainingBalance: 0, remainingSpendable: 0 }),
  canAffordPayment: () => false,
  paymentHolds: [],
  scheduledPayments: [],
  createPaymentHold: () => null,
  releasePaymentHold: () => {},
  commitPaymentHold: () => {},
  schedulePayment: () => null,
  cancelScheduledPayment: () => {},
  cards: [],
  addCard: () => {},
  removeCard: () => {},
  toggleFreeze: () => {},
  upiAccounts: [],
  setPrimaryUPI: () => {},
  addUPIAccount: () => {},
  transactions: [],
  addTransaction: () => {},
  documents: [],
  addDocument: () => {},
  removeDocument: () => {},
  tickets: [],
  addTicket: () => {},
  removeTicket: () => {},
  updateTicket: () => {},
  findTicketByPNR: () => undefined,
  rewards: [],
  notifications: [],
  markRead: () => {},
  unreadCount: 0,
  budgets: [],
  reservedAmounts: [],
  addReservation: () => {},
  removeReservation: () => {},
  transportPasses: [],
  topUpTransport: () => {},
  upiLite: 0,
});

const NOW = "2025-06-18T00:00:00Z";

const SEED_CARDS: CardRecord[] = [
  { id: "c1", userId: "local", cardNetwork: "visa", issuer: "HDFC Regalia", lastFour: "6467", expiryMonth: 9, expiryYear: 2027, nickname: "HDFC Regalia", theme: { gradientColors: ["#1a1a2e", "#16213e"] }, frozen: false, balance: 84320, createdAt: NOW, updatedAt: NOW },
  { id: "c2", userId: "local", cardNetwork: "mastercard", issuer: "SBI Elite", lastFour: "6789", expiryMonth: 3, expiryYear: 2026, nickname: "SBI Elite", theme: { gradientColors: ["#0d0d0d", "#1a0000"] }, frozen: false, balance: 32100, createdAt: NOW, updatedAt: NOW },
  { id: "c3", userId: "local", cardNetwork: "rupay", issuer: "ICICI Coral", lastFour: "9012", expiryMonth: 11, expiryYear: 2028, nickname: "ICICI Coral", theme: { gradientColors: ["#0a1628", "#1a2f4e"] }, frozen: true, balance: 12500, createdAt: NOW, updatedAt: NOW },
];

const SEED_UPI: UPIAccount[] = [
  { id: "u1", upiId: "aryan.sharma@hdfc", name: "HDFC Bank", primary: true, bank: "HDFC" },
  { id: "u2", upiId: "aryan@sbi", name: "SBI Bank", primary: false, bank: "SBI" },
];

const SEED_TRANSACTIONS: Transaction[] = [
  { id: "t1", amount: 649, type: "debit", category: "food", description: "Zomato Order", date: "2025-06-17T14:30:00Z", status: "success", merchant: "Zomato" },
  { id: "t2", amount: 150000, type: "credit", category: "transfer", description: "Salary Credit", date: "2025-06-15T09:00:00Z", status: "success", merchant: "Infosys Ltd" },
  { id: "t3", amount: 499, type: "debit", category: "entertainment", description: "Netflix Subscription", date: "2025-06-14T12:00:00Z", status: "success", merchant: "Netflix" },
  { id: "t4", amount: 2340, type: "debit", category: "shopping", description: "Amazon Purchase", date: "2025-06-13T16:45:00Z", status: "success", merchant: "Amazon" },
  { id: "t5", amount: 350, type: "debit", category: "transport", description: "Uber Ride", date: "2025-06-12T19:20:00Z", status: "success", merchant: "Uber" },
  { id: "t6", amount: 5000, type: "credit", category: "transfer", description: "Money Received", date: "2025-06-11T11:00:00Z", status: "success", merchant: "Rahul Kumar" },
  { id: "t7", amount: 1299, type: "debit", category: "shopping", description: "BigBasket Groceries", date: "2025-06-10T10:15:00Z", status: "success", merchant: "BigBasket" },
  { id: "t8", amount: 200, type: "debit", category: "food", description: "Swiggy Order", date: "2025-06-09T20:30:00Z", status: "success", merchant: "Swiggy" },
  { id: "t9", amount: 6000, type: "debit", category: "housing", description: "Hostel Fee", date: "2025-06-05T10:00:00Z", status: "success", merchant: "PG Accommodation" },
  { id: "t10", amount: 1500, type: "debit", category: "health", description: "Apollo Pharmacy", date: "2025-06-07T15:00:00Z", status: "success", merchant: "Apollo Pharmacy" },
  { id: "t11", amount: 800, type: "debit", category: "food", description: "Barbeque Nation", date: "2025-06-06T21:00:00Z", status: "success", merchant: "Barbeque Nation" },
  { id: "t12", amount: 299, type: "debit", category: "utility", description: "BSNL Recharge", date: "2025-06-05T12:30:00Z", status: "success", merchant: "BSNL" },
  { id: "t13", amount: 3200, type: "debit", category: "shopping", description: "Myntra Fashion", date: "2025-06-04T14:00:00Z", status: "pending", merchant: "Myntra" },
  { id: "t14", amount: 100, type: "debit", category: "transport", description: "Metro Card Top-up", date: "2025-06-03T08:00:00Z", status: "success", merchant: "DMRC" },
  { id: "t15", amount: 2000, type: "credit", category: "reward", description: "Cashback Received", date: "2025-06-02T10:00:00Z", status: "success", merchant: "Vault Rewards" },
];

const SEED_DOCUMENTS: VaultDocument[] = [
  { id: "d1", type: "aadhaar", name: "Aadhaar Card", number: "XXXX XXXX 6789" },
  { id: "d2", type: "pan", name: "PAN Card", number: "ABCDE1234F" },
  { id: "d3", type: "driving_license", name: "Driving License", number: "DL-1420110012345", expiry: "2031-08-22" },
  { id: "d4", type: "passport", name: "Passport", number: "Z1234567", expiry: "2030-03-15" },
];

const SEED_TICKETS: Ticket[] = [
  { id: "tk1", type: "flight", title: "Mumbai → Delhi", from: "BOM", to: "DEL", date: "2025-07-10", pnr: "6X2Q8W", seat: "12A", time: "06:20 AM" },
  { id: "tk2", type: "movie", title: "Kalki 2898-AD", venue: "PVR Cinemas, Connaught Place", date: "2025-06-20", seat: "E7, E8", time: "07:30 PM" },
  { id: "tk3", type: "train", title: "Delhi → Jaipur", from: "NDLS", to: "JP", date: "2025-06-28", pnr: "4521897634", seat: "B2 - 32 (SL)", time: "05:55 AM" },
];

const SEED_REWARDS: Reward[] = [
  { id: "r1", name: "2X Rewards Weekend", type: "offer", brand: "HDFC", color: "#003087", discount: "2X Points", expiry: "2025-06-30" },
  { id: "r2", name: "Vault Points", type: "points", brand: "Vault", color: "#D06224", points: 4820 },
  { id: "r3", name: "Zomato Gold", type: "coupon", brand: "Zomato", color: "#E23744", discount: "20% off", code: "VAULT20", expiry: "2025-07-15" },
  { id: "r4", name: "Amazon Cashback", type: "cashback", brand: "Amazon", color: "#FF9900", discount: "₹500 back", expiry: "2025-06-25" },
  { id: "r5", name: "Uber Discount", type: "coupon", brand: "Uber", color: "#000000", discount: "₹100 off", code: "VAULT100", expiry: "2025-06-22" },
];

const SEED_NOTIFICATIONS: VaultNotification[] = [
  { id: "n1", title: "Payment Successful", body: "₹649 paid to Zomato via UPI", type: "payment", read: false, date: "2025-06-17T14:31:00Z" },
  { id: "n2", title: "Salary Credited", body: "₹1,50,000 credited to your account", type: "payment", read: false, date: "2025-06-15T09:01:00Z" },
  { id: "n3", title: "New Offer Available", body: "Get 2X rewards on all weekend transactions", type: "reward", read: true, date: "2025-06-14T10:00:00Z" },
  { id: "n4", title: "Login from new device", body: "iPhone 15 Pro — Mumbai, MH. Not you? Secure your account.", type: "security", read: true, date: "2025-06-13T08:30:00Z" },
  { id: "n5", title: "Monthly Insights Ready", body: "Your June spending analysis is ready. Tap to view.", type: "info", read: false, date: "2025-06-10T09:00:00Z" },
];

const SEED_BUDGETS: Budget[] = [
  { id: "b1", category: "Food", limit: 8000, spent: 5648, month: "2025-06", color: "#EF4444" },
  { id: "b2", category: "Shopping", limit: 10000, spent: 6839, month: "2025-06", color: "#8B5CF6" },
  { id: "b3", category: "Transport", limit: 3000, spent: 1250, month: "2025-06", color: "#AE431E" },
  { id: "b4", category: "Entertainment", limit: 2000, spent: 1748, month: "2025-06", color: "#EAC891" },
  { id: "b5", category: "Health", limit: 5000, spent: 1500, month: "2025-06", color: "#2E7D32" },
];

const SEED_RESERVED: ReservedAmount[] = [
  { id: "res1", label: "Hostel Fee", amount: 6000, category: "housing", dueDate: "2025-07-01", recurring: true, interval: "monthly", color: "#8B5CF6" },
  { id: "res2", label: "Car EMI", amount: 5500, category: "transport", dueDate: "2025-06-25", recurring: true, interval: "monthly", color: "#AE431E" },
  { id: "res3", label: "Insurance", amount: 2500, category: "health", dueDate: "2025-06-30", recurring: false, color: "#2E7D32" },
];

const SEED_TRANSPORT: TransportPass[] = [
  { id: "tp1", type: "metro", name: "Delhi Metro Card", balance: 450, expiry: "2025-08-31", cardNumber: "DMRC-4829-3847", gradientColors: ["#1e3a5f", "#0f2040"], city: "Delhi" },
  { id: "tp2", type: "monthly", name: "DTC Bus Pass", balance: 0, expiry: "2025-06-30", cardNumber: "DTC-MON-7821", gradientColors: ["#1a5c35", "#0f3320"], city: "Delhi" },
  { id: "tp3", type: "student", name: "Student Metro Pass", balance: 200, expiry: "2025-09-30", cardNumber: "DMRC-STU-2934", gradientColors: ["#3b1f5f", "#200f40"], city: "Delhi" },
];

const KEYS = {
  balance: "@vault_balance",
  cards: "@vault_cards",
  upi: "@vault_upi",
  transactions: "@vault_transactions",
  documents: "@vault_documents",
  tickets: "@vault_tickets",
  rewards: "@vault_rewards",
  notifications: "@vault_notifications",
  budgets: "@vault_budgets",
  reserved: "@vault_reserved",
  transport: "@vault_transport",
};

async function loadOrSeed<T>(key: string, seed: T[]): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (raw) return JSON.parse(raw) as T[];
  await AsyncStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

async function save(key: string, data: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalanceState] = useState(128420);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [upiAccounts, setUpiAccounts] = useState<UPIAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [notifications, setNotifications] = useState<VaultNotification[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [reservedAmounts, setReservedAmounts] = useState<ReservedAmount[]>([]);
  const [transportPasses, setTransportPasses] = useState<TransportPass[]>([]);
  const [paymentHolds, setPaymentHolds] = useState<PaymentHold[]>([]);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);

  useEffect(() => {
    Promise.all([
      loadOrSeed(KEYS.cards, SEED_CARDS),
      loadOrSeed(KEYS.upi, SEED_UPI),
      loadOrSeed(KEYS.transactions, SEED_TRANSACTIONS),
      loadOrSeed(KEYS.documents, SEED_DOCUMENTS),
      loadOrSeed(KEYS.tickets, SEED_TICKETS),
      loadOrSeed(KEYS.rewards, SEED_REWARDS),
      loadOrSeed(KEYS.notifications, SEED_NOTIFICATIONS),
      loadOrSeed(KEYS.budgets, SEED_BUDGETS),
      loadOrSeed(KEYS.reserved, SEED_RESERVED),
      loadOrSeed(KEYS.transport, SEED_TRANSPORT),
      AsyncStorage.getItem(KEYS.balance),
    ]).then(([c, u, tx, docs, tix, rwd, notifs, bdg, res, tp, balRaw]) => {
      const migratedCards: CardRecord[] = (c as CardRecord[]).map((card) => ({
        id: card.id,
        userId: card.userId ?? "local",
        cardNetwork: card.cardNetwork ?? "visa",
        issuer: card.issuer ?? "Card",
        lastFour: card.lastFour ?? "0000",
        expiryMonth: card.expiryMonth ?? 1,
        expiryYear: card.expiryYear ?? 2025,
        nickname: card.nickname ?? "",
        theme: card.theme ?? { gradientColors: ["#1a1a2e", "#16213e"] },
        frozen: card.frozen ?? false,
        balance: card.balance ?? 0,
        createdAt: card.createdAt ?? NOW,
        updatedAt: card.updatedAt ?? NOW,
      }));
      setCards(migratedCards);
      setUpiAccounts(u);
      setTransactions(tx);
      setDocuments(docs);
      setTickets(tix);
      setRewards(rwd);
      setNotifications(notifs);
      setBudgets(bdg);
      setReservedAmounts(res);
      setTransportPasses(tp);
      if (balRaw) setBalanceState(Number(balRaw));
    });
  }, []);

  const setBalance = (b: number) => { setBalanceState(b); save(KEYS.balance, b); };
  const totalReserved = reservedAmounts.reduce((s, r) => s + r.amount, 0);
  const totalHeld = paymentHolds.reduce((s, hold) => s + hold.amount, 0);
  const spendableBalance = Math.max(0, balance - totalReserved - totalHeld);
  const getPaymentPreview = (amount: number) => ({
    remainingBalance: Math.max(0, balance - amount),
    remainingSpendable: Math.max(0, spendableBalance - amount),
  });
  const canAffordPayment = (amount: number) => Number.isFinite(amount) && amount > 0 && amount <= spendableBalance;

  const addCard = (c: CardRecord) => { const next = [c, ...cards]; setCards(next); save(KEYS.cards, next); };
  const removeCard = (id: string) => { const next = cards.filter((c) => c.id !== id); setCards(next); save(KEYS.cards, next); };
  const toggleFreeze = (id: string) => { const next = cards.map((c) => c.id === id ? { ...c, frozen: !c.frozen } : c); setCards(next); save(KEYS.cards, next); };
  const setPrimaryUPI = (id: string) => { const next = upiAccounts.map((u) => ({ ...u, primary: u.id === id })); setUpiAccounts(next); save(KEYS.upi, next); };
  const addUPIAccount = (u: UPIAccount) => { const next = [...upiAccounts, u]; setUpiAccounts(next); save(KEYS.upi, next); };
  const addTransaction = (t: Transaction) => {
    setTransactions((prev) => {
      const next = [t, ...prev];
      void save(KEYS.transactions, next);
      return next;
    });

    if (t.status === "failed") return;

    setBalanceState((prev) => {
      const nextBalance = t.type === "credit" ? prev + t.amount : Math.max(0, prev - t.amount);
      void save(KEYS.balance, nextBalance);
      return nextBalance;
    });
  };

  const createPaymentHold = (input: { amount: number; merchant: string; payeeAddress: string; note?: string }) => {
    if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > spendableBalance) return null;
    const hold: PaymentHold = {
      id: `hold-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amount: input.amount,
      merchant: input.merchant,
      payeeAddress: input.payeeAddress,
      note: input.note,
      createdAt: new Date().toISOString(),
    };
    const next = [hold, ...paymentHolds];
    setPaymentHolds(next);
    return hold;
  };

  const releasePaymentHold = (holdId: string) => {
    setPaymentHolds((prev) => prev.filter((hold) => hold.id !== holdId));
  };

  const commitPaymentHold = (holdId: string, transaction: Transaction) => {
    const hold = paymentHolds.find((item) => item.id === holdId);
    if (hold) {
      releasePaymentHold(holdId);
      addTransaction(transaction);
      return;
    }
    addTransaction(transaction);
  };

  const schedulePayment = (input: { amount: number; merchant: string; payeeAddress: string; note?: string; scheduledFor: string }) => {
    if (!Number.isFinite(input.amount) || input.amount <= 0) return null;
    const payment: ScheduledPayment = {
      id: `sched-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amount: input.amount,
      merchant: input.merchant,
      payeeAddress: input.payeeAddress,
      note: input.note,
      scheduledFor: input.scheduledFor,
      status: "scheduled",
    };
    const next = [payment, ...scheduledPayments];
    setScheduledPayments(next);
    return payment;
  };

  const cancelScheduledPayment = (paymentId: string) => {
    setScheduledPayments((prev) => prev.filter((payment) => payment.id !== paymentId));
  };
  const addDocument = (d: VaultDocument) => { const next = [d, ...documents]; setDocuments(next); save(KEYS.documents, next); };
  const removeDocument = (id: string) => { const next = documents.filter((d) => d.id !== id); setDocuments(next); save(KEYS.documents, next); };
  const addTicket = (t: Ticket) => {
    if (t.pnr) {
      const existing = tickets.find((x) => x.pnr === t.pnr && x.isSmartTicket);
      if (existing) return;
    }
    const next = [t, ...tickets];
    setTickets(next);
    save(KEYS.tickets, next);
    try {
      const { scheduleJourneyNotifications } = require("@/services/ticket/notificationService");
      scheduleJourneyNotifications(t);
    } catch {}
  };
  const findTicketByPNR = (pnr: string) => tickets.find((t) => t.pnr === pnr);
  const removeTicket = (id: string) => {
    const next = tickets.filter((t) => t.id !== id);
    setTickets(next);
    save(KEYS.tickets, next);
    try {
      const { cancelTicketNotifications } = require("@/services/ticket/notificationService");
      cancelTicketNotifications(id);
    } catch {}
  };
  const updateTicket = (id: string, updates: Partial<Ticket>) => {
    const next = tickets.map((t) => t.id === id ? { ...t, ...updates } : t);
    setTickets(next);
    save(KEYS.tickets, next);
  };
  const markRead = (id: string) => { const next = notifications.map((n) => n.id === id ? { ...n, read: true } : n); setNotifications(next); save(KEYS.notifications, next); };
  const unreadCount = notifications.filter((n) => !n.read).length;
  const addReservation = (r: ReservedAmount) => { const next = [r, ...reservedAmounts]; setReservedAmounts(next); save(KEYS.reserved, next); };
  const removeReservation = (id: string) => { const next = reservedAmounts.filter((r) => r.id !== id); setReservedAmounts(next); save(KEYS.reserved, next); };
  const topUpTransport = (id: string, amount: number) => {
    const next = transportPasses.map((tp) => tp.id === id ? { ...tp, balance: tp.balance + amount } : tp);
    setTransportPasses(next); save(KEYS.transport, next);
  };

  return (
    <WalletContext.Provider value={{
      balance, setBalance, spendableBalance, totalReserved,
      cards, addCard, removeCard, toggleFreeze,
      upiAccounts, setPrimaryUPI, addUPIAccount,
      transactions, addTransaction,
      documents, addDocument, removeDocument,
      tickets, addTicket, removeTicket, updateTicket, findTicketByPNR, rewards, notifications, markRead, unreadCount,
      budgets, reservedAmounts, addReservation, removeReservation,
      paymentHolds, scheduledPayments, createPaymentHold, releasePaymentHold, commitPaymentHold, schedulePayment, cancelScheduledPayment,
      transportPasses, topUpTransport,
      getPaymentPreview, canAffordPayment,
      upiLite: 1500,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
