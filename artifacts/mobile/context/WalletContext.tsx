import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";

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

import * as api from "@/services/api";
import { connectSocket, disconnectSocket, setSocketHandlers } from "@/services/socket";

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
  updateDocument: (id: string, updates: Partial<VaultDocument>) => void;
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
  updateDocument: () => {},
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

// ─── Helper: paise → rupees ────────────────────────
function p(paise: number): number {
  return Math.round(paise / 100);
}

// ─── Helper: map API transaction → frontend Transaction ───
function toTransaction(t: any): Transaction {
  return {
    id: t.id,
    amount: p(t.amountPaise ?? t.amount_paise ?? 0),
    type: t.type,
    category: t.category ?? "",
    description: t.merchant ?? t.description ?? "",
    date: t.occurredAt ?? t.date ?? new Date().toISOString(),
    status: t.status ?? "success",
    merchant: t.merchant ?? "",
    payeeAddress: t.counterparty_upi ?? t.counterpartyUpi ?? undefined,
  };
}

// ─── Helper: map API card → frontend CardRecord ────
function toCard(c: any): CardRecord {
  return {
    id: c.id,
    userId: c.userId ?? c.user_id ?? "",
    cardNetwork: c.network ?? c.cardNetwork ?? "visa",
    issuer: c.bankName ?? c.issuer ?? null,
    lastFour: c.last4 ?? c.lastFour ?? "0000",
    expiryMonth: c.expiryMonth ?? c.expiry_month ?? 1,
    expiryYear: c.expiryYear ?? c.expiry_year ?? 2025,
    nickname: c.holderName ?? c.nickname ?? "",
    theme: c.gradientColors
      ? { gradientColors: c.gradientColors }
      : { gradientColors: ["#1a1a2e", "#16213e"] },
    frozen: c.isFrozen ?? c.frozen ?? false,
    balance: 0, // card balance removed in new schema
    createdAt: c.createdAt ?? new Date().toISOString(),
    updatedAt: c.updatedAt ?? new Date().toISOString(),
  };
}

// ─── Helper: map API ticket → frontend Ticket ──────
function toTicket(t: any): Ticket {
  return {
    id: t.id,
    type: t.type ?? "movie",
    title: t.title ?? "",
    from: t.origin ?? undefined,
    to: t.destination ?? undefined,
    date: t.travelDate ?? t.date ?? "",
    pnr: t.pnr ?? undefined,
    seat: t.seat ?? undefined,
    time: t.travelDate
      ? new Date(t.travelDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : undefined,
    qrCode: t.qrPayload ?? t.qrCode ?? undefined,
  };
}

// ─── Helper: map API reward → frontend Reward ──────
function toReward(r: any): Reward {
  return {
    id: r.id,
    name: r.brand ?? r.name ?? "",
    type: r.type ?? "offer",
    brand: r.brand ?? "",
    color: "#FF385C",
    points: r.value?.points ?? undefined,
    discount: r.value?.discount ?? undefined,
    expiry: r.expiresAt ?? r.expiry ?? undefined,
    code: r.code ?? undefined,
  };
}

// ─── Helper: map API notif → frontend notif ───────
function toNotification(n: any): VaultNotification {
  return {
    id: n.id,
    title: n.title ?? "",
    body: n.body ?? "",
    type: n.type ?? "info",
    read: n.isRead ?? n.read ?? false,
    date: n.createdAt ?? n.date ?? new Date().toISOString(),
  };
}

// ─── Helper: map API budget → frontend Budget ─────
function toBudget(b: any): Budget {
  return {
    id: b.id,
    category: b.category ?? "",
    limit: p(b.limitPaise ?? b.limit_paise ?? b.limit ?? 0),
    spent: p(b.spentPaise ?? b.spent_paise ?? b.spent ?? 0),
    month: b.month ?? "",
    color: budgetColor(b.category ?? ""),
  };
}

// ─── Deterministic color by category ───────────────
const CATEGORY_COLORS: Record<string, string> = {
  Food: "#EF4444",
  Shopping: "#8B5CF6",
  Transport: "#AE431E",
  Entertainment: "#EAC891",
  Health: "#2E7D32",
  Housing: "#FF385C",
  Utility: "#6366F1",
  Education: "#F59E0B",
  Travel: "#06B6D4",
  Salary: "#10B981",
  Transfer: "#3B82F6",
};

function budgetColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#6B7280";
}

// ─── Helper: map API reserved → frontend Reserved ──
function toReserved(r: any): ReservedAmount {
  return {
    id: r.id,
    label: r.label ?? "",
    amount: p(r.amountPaise ?? r.amount_paise ?? 0),
    category: r.category ?? "",
    dueDate: r.dueDate ?? r.due_date ?? undefined,
    recurring: r.isRecurring ?? r.recurring ?? false,
    interval: r.interval ?? r.interval ?? undefined,
    color: budgetColor(r.category ?? ""),
  };
}

// ─── Helper: map API pass → frontend TransportPass ─
function toPass(p: any): TransportPass {
  return {
    id: p.id,
    type: p.type ?? "metro",
    name: `${p.city ?? ""} ${p.type ?? "Metro"} Pass`.trim(),
    balance: p(p.balancePaise ?? p.balance_paise ?? p.balance ?? 0),
    expiry: p.expiresAt ?? p.expiry ?? "",
    cardNumber: p.cardNumber ?? p.card_number ?? "",
    gradientColors: ["#1e3a5f", "#0f2040"],
    city: p.city ?? "",
  };
}

// ─── Helper: map API subscription → frontend ... ───
function toSubscription(s: any) {
  return {
    id: s.id,
    merchant: s.merchant ?? "",
    amount_paise: s.amountPaise ?? s.amount_paise ?? 0,
    cadence: s.cadence ?? "monthly",
    status: s.status ?? "active",
    next_charge_date: s.next_charge_date ?? null,
  };
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalanceState] = useState(0);
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
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [, setSpendablePaise] = useState(0);

  const fetchInProgress = useRef(false);

  // ─── Data fetching ──────────────────────────────────
  const fetchAllData = useCallback(async () => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;

    const token = await SecureStore.getItemAsync("vault_access_token");
    if (!token) {
      fetchInProgress.current = false;
      return;
    }

    const results = await Promise.allSettled([
      api.getWallet(),
      api.getTransactions({ limit: 50 }),
      api.getCards(),
      api.getReservedAmounts(),
      api.getNotifications({ limit: 50 }),
      api.getSubscriptions({ status: "all" }),
      api.getDocuments(),
      api.getTickets(),
      api.getPasses(),
      api.getRewards(),
      api.getBudgets(),
    ]);

    const [, txns, cardsRes, reserved, notifs, subs, docs, tix, passes, rwds, bdgs] = results;

    if (txns.status === "fulfilled") {
      setTransactions(txns.value.transactions.map(toTransaction));
    }
    if (cardsRes.status === "fulfilled") {
      setCards(cardsRes.value.cards.map(toCard));
    }
    if (reserved.status === "fulfilled") {
      setReservedAmounts(reserved.value.reserved.map(toReserved));
    }
    if (notifs.status === "fulfilled") {
      setNotifications(notifs.value.notifications.map(toNotification));
    }
    if (subs.status === "fulfilled") {
      setSubscriptions(subs.value.subscriptions ?? []);
    }
    if (docs.status === "fulfilled") {
      setDocuments(docs.value.documents.map((d: any) => toDocument(d)));
    }
    if (tix.status === "fulfilled") {
      setTickets(tix.value.tickets.map(toTicket));
    }
    if (passes.status === "fulfilled") {
      setTransportPasses(passes.value.passes.map(toPass));
    }
    if (rwds.status === "fulfilled") {
      setRewards(rwds.value.rewards.map(toReward));
    }
    if (bdgs.status === "fulfilled") {
      setBudgets(bdgs.value.budgets.map(toBudget));
    }
    if (results[0].status === "fulfilled") {
      const wallet = results[0].value.wallet;
      setBalanceState(p(wallet.balance_paise ?? 0));
      setSpendablePaise(wallet.spendable_paise ?? wallet.balance_paise ?? 0);
    }

    fetchInProgress.current = false;
  }, []);

  // ─── Init on mount + AppState listener ─────────────
  useEffect(() => {
    fetchAllData();

    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchAllData();
      }
    });

    return () => sub.remove();
  }, [fetchAllData]);

  // ─── Socket event handlers ─────────────────────────
  useEffect(() => {
    setSocketHandlers({
      "wallet:updated": (payload: any) => {
        if (payload.balance_paise != null) {
          setBalanceState(p(payload.balance_paise));
        }
      },
      "transaction:new": (payload: any) => {
        if (payload.transaction) {
          setTransactions((prev) => [toTransaction(payload.transaction), ...prev]);
        }
      },
      "notification:new": (payload: any) => {
        if (payload.notification) {
          setNotifications((prev) => [toNotification(payload.notification), ...prev]);
        }
      },
      "subscription:detected": (payload: any) => {
        if (payload.subscription) {
          setSubscriptions((prev) => [toSubscription(payload.subscription), ...prev]);
        }
      },
    });

    const initSocket = async () => {
      const token = await SecureStore.getItemAsync("vault_access_token");
      if (token) {
        connectSocket();
      }
    };
    initSocket();

    return () => {
      disconnectSocket();
      setSocketHandlers({});
    };
  }, []);

  // ─── Computed values ───────────────────────────────
  const totalReserved = reservedAmounts.reduce((s, r) => s + r.amount, 0);
  const totalHeld = paymentHolds.reduce((s, hold) => s + hold.amount, 0);
  const spendableBalance = Math.max(0, balance - totalReserved - totalHeld);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getPaymentPreview = (amount: number) => ({
    remainingBalance: Math.max(0, balance - amount),
    remainingSpendable: Math.max(0, spendableBalance - amount),
  });

  const canAffordPayment = (amount: number) =>
    Number.isFinite(amount) && amount > 0 && amount <= spendableBalance;

  // ─── Balance ────────────────────────────────────────
  const setBalance = useCallback((b: number) => setBalanceState(b), []);

  // ─── Cards ──────────────────────────────────────────
  const addCard = useCallback(
    async (c: CardRecord) => {
      setCards((prev) => [c, ...prev]);
      try {
        const res = await api.createCard({
          network: c.cardNetwork,
          last4: c.lastFour,
          holder_name: c.nickname,
          expiry_month: c.expiryMonth,
          expiry_year: c.expiryYear,
          bank_name: c.issuer,
          gradient_colors: c.theme.gradientColors,
          is_frozen: c.frozen,
        });
        if (res.card) {
          setCards((prev) => prev.map((x) => (x.id === c.id ? toCard(res.card) : x)));
        }
      } catch {
        setCards((prev) => prev.filter((x) => x.id !== c.id));
      }
    },
    [],
  );

  const removeCard = useCallback(
    async (id: string) => {
      const prev = cards;
      setCards((p) => p.filter((c) => c.id !== id));
      try {
        await api.deleteCard(id);
      } catch {
        setCards(prev);
      }
    },
    [cards],
  );

  const toggleFreeze = useCallback(
    async (id: string) => {
      const prev = cards;
      setCards((p) => p.map((c) => (c.id === id ? { ...c, frozen: !c.frozen } : c)));
      try {
        const card = prev.find((c) => c.id === id);
        if (card?.frozen) {
          await api.unfreezeCard(id);
        } else {
          await api.freezeCard(id);
        }
      } catch {
        setCards(prev);
      }
    },
    [cards],
  );

  // ─── UPI ────────────────────────────────────────────
  // TODO: UPI account creation not yet exposed via API — kept as local state
  const setPrimaryUPI = useCallback((id: string) => {
    setUpiAccounts((prev) => prev.map((u) => ({ ...u, primary: u.id === id })));
  }, []);

  const addUPIAccount = useCallback((u: UPIAccount) => {
    setUpiAccounts((prev) => [...prev, u]);
  }, []);

  // ─── Transactions ───────────────────────────────────
  const addTransaction = useCallback(
    (t: Transaction) => {
      const prevBalance = balance;
      setTransactions((prev) => {
        const next = [t, ...prev];
        return next;
      });

      if (t.status === "failed") return;

      setBalanceState((prev) => {
        return t.type === "credit" ? prev + t.amount : Math.max(0, prev - t.amount);
      });

      // Attempt API call based on transaction type
      if (t.type === "debit" && t.payeeAddress) {
        api
          .transfer(t.payeeAddress, t.amount * 100, t.description)
          .then((res) => {
            if (res.transaction) {
              setTransactions((prev) =>
                prev.map((x) => (x.id === t.id ? toTransaction(res.transaction) : x)),
              );
            }
          })
          .catch(() => {
            setBalanceState(prevBalance);
          });
      } else if (t.type === "credit") {
        api
          .topup(t.amount * 100, "upi_app")
          .then((res) => {
            if (res.transaction) {
              setTransactions((prev) =>
                prev.map((x) => (x.id === t.id ? toTransaction(res.transaction) : x)),
              );
            }
          })
          .catch(() => {
            setBalanceState(prevBalance);
          });
      }
    },
    [balance],
  );

  // ─── Payment Holds ──────────────────────────────────
  const createPaymentHold = useCallback(
    (input: { amount: number; merchant: string; payeeAddress: string; note?: string }) => {
      if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > spendableBalance)
        return null;
      const hold: PaymentHold = {
        id: `hold-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        amount: input.amount,
        merchant: input.merchant,
        payeeAddress: input.payeeAddress,
        note: input.note,
        createdAt: new Date().toISOString(),
      };
      setPaymentHolds((prev) => [hold, ...prev]);
      return hold;
    },
    [spendableBalance],
  );

  const releasePaymentHold = useCallback((holdId: string) => {
    setPaymentHolds((prev) => prev.filter((hold) => hold.id !== holdId));
  }, []);

  const commitPaymentHold = useCallback(
    (holdId: string, transaction: Transaction) => {
      const hold = paymentHolds.find((item) => item.id === holdId);
      if (hold) {
        releasePaymentHold(holdId);
        addTransaction(transaction);
        return;
      }
      addTransaction(transaction);
    },
    [paymentHolds, addTransaction],
  );

  const schedulePayment = useCallback(
    (input: { amount: number; merchant: string; payeeAddress: string; note?: string; scheduledFor: string }) => {
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
      setScheduledPayments((prev) => [payment, ...prev]);
      return payment;
    },
    [],
  );

  const cancelScheduledPayment = useCallback((paymentId: string) => {
    setScheduledPayments((prev) => prev.filter((p) => p.id !== paymentId));
  }, []);

  // ─── Documents ──────────────────────────────────────
  const addDocument = useCallback(
    async (d: VaultDocument) => {
      setDocuments((prev) => [d, ...prev]);
      try {
        const uploadUrlRes = await api.getUploadUrl(d.type, "image/jpeg");
        if (d.encryptedFileUri) {
          await fetch(uploadUrlRes.upload_url, {
            method: "PUT",
            body: await fetch(d.encryptedFileUri).then((r) => r.blob()),
          });
        }
        await api.createDocument({
          type: d.type,
          encrypted_number: d.documentNumber,
          file_url: uploadUrlRes.object_key,
        });
      } catch {
        setDocuments((prev) => prev.filter((x) => x.id !== d.id));
      }
    },
    [],
  );

  const updateDocument = useCallback((id: string, updates: Partial<VaultDocument>) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)),
    );
  }, []);

  const removeDocument = useCallback(
    async (id: string) => {
      const prev = documents;
      setDocuments((p) => p.filter((d) => d.id !== id));
      try {
        await api.deleteDocument(id);
      } catch {
        setDocuments(prev);
      }
    },
    [documents],
  );

  // ─── Tickets ────────────────────────────────────────
  const addTicket = useCallback(
    async (t: Ticket) => {
      setTickets((prev) => {
        if (t.pnr) {
          const existing = prev.find((x) => x.pnr === t.pnr);
          if (existing) return prev;
        }
        return [t, ...prev];
      });
      try {
        await api.createTicket({
          type: t.type,
          title: t.title,
          origin: t.from,
          destination: t.to,
          travel_date: t.date,
          seat: t.seat,
          pnr: t.pnr,
        });
      } catch {
        // optimistic update stays — server data will sync on refresh
      }
    },
    [],
  );

  const removeTicket = useCallback(
    async (id: string) => {
      const prev = tickets;
      setTickets((p) => p.filter((t) => t.id !== id));
      try {
        await api.deleteTicket(id);
      } catch {
        setTickets(prev);
      }
    },
    [tickets],
  );

  const updateTicket = useCallback(
    async (id: string, updates: Partial<Ticket>) => {
      const prev = tickets;
      setTickets((p) => p.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      try {
        await api.updateTicketStatus(id, updates.ticketStatus ?? "confirmed");
      } catch {
        setTickets(prev);
      }
    },
    [tickets],
  );

  const findTicketByPNR = useCallback(
    (pnr: string) => tickets.find((t) => t.pnr === pnr),
    [tickets],
  );

  // ─── Notifications ─────────────────────────────────
  const markRead = useCallback(
    async (id: string) => {
      const prev = notifications;
      setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
      try {
        await api.markRead(id);
      } catch {
        setNotifications(prev);
      }
    },
    [notifications],
  );

  // ─── Reserved Amounts ──────────────────────────────
  const addReservation = useCallback(
    async (r: ReservedAmount) => {
      setReservedAmounts((prev) => [r, ...prev]);
      try {
        await api.createReservedAmount({
          label: r.label,
          amount_paise: r.amount * 100,
          category: r.category,
          due_date: r.dueDate ?? new Date().toISOString().split("T")[0],
          is_recurring: r.recurring,
          interval: r.interval,
        });
      } catch {
        setReservedAmounts((prev) => prev.filter((x) => x.id !== r.id));
      }
    },
    [],
  );

  const removeReservation = useCallback(
    async (id: string) => {
      const prev = reservedAmounts;
      setReservedAmounts((p) => p.filter((r) => r.id !== id));
      try {
        await api.deleteReservedAmount(id);
      } catch {
        setReservedAmounts(prev);
      }
    },
    [reservedAmounts],
  );

  // ─── Transport Passes ──────────────────────────────
  const topUpTransport = useCallback(
    async (id: string, amount: number) => {
      const prev = transportPasses;
      setTransportPasses((p) =>
        p.map((tp) => (tp.id === id ? { ...tp, balance: tp.balance + amount } : tp)),
      );
      try {
        await api.topupPass(id, amount * 100);
      } catch {
        setTransportPasses(prev);
      }
    },
    [transportPasses],
  );

  // ─── Computed subscriptions ────────────────────────
  // TODO: expose subscriptions as context state when screen requires it

  return (
    <WalletContext.Provider
      value={{
        balance,
        setBalance,
        spendableBalance,
        totalReserved,
        cards,
        addCard,
        removeCard,
        toggleFreeze,
        upiAccounts,
        setPrimaryUPI,
        addUPIAccount,
        transactions,
        addTransaction,
        documents,
        addDocument,
        updateDocument,
        removeDocument,
        tickets,
        addTicket,
        removeTicket,
        updateTicket,
        findTicketByPNR,
        rewards,
        notifications,
        markRead,
        unreadCount,
        budgets,
        reservedAmounts,
        addReservation,
        removeReservation,
        paymentHolds,
        scheduledPayments,
        createPaymentHold,
        releasePaymentHold,
        commitPaymentHold,
        schedulePayment,
        cancelScheduledPayment,
        transportPasses,
        topUpTransport,
        getPaymentPreview,
        canAffordPayment,
        upiLite: balance > 0 ? Math.round(balance * 0.1) : 0, // 10% of balance as UPI Lite limit
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

// ─── Document mapper (standalone helper) ────────────
function toDocument(d: any): VaultDocument {
  return {
    id: d.id,
    userId: d.userId ?? d.user_id ?? "",
    type: d.type ?? "custom",
    name: `${d.type ?? ""} Document`,
    holderName: "",
    documentNumber: d.encryptedNumber ?? d.encrypted_number ?? "",
    maskedNumber: "XXXX XXXX XXXX",
    verificationStatus: "unverified",
    metadata: d.expiryDate ? { expiryDate: d.expiryDate } : {},
    createdAt: d.createdAt ?? new Date().toISOString(),
    updatedAt: d.updatedAt ?? new Date().toISOString(),
  };
}
