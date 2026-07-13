import { Platform } from "react-native";

import type {
  NdefRecord,
  NfcScanResult,
  NfcStatus,
  NfcTagData,
  ParsedNfcContent,
  UpiPaymentInfo,
} from "./types";

const NFC_TIMEOUT = 30_000;

function decodeTextPayload(payload: number[]): { text: string; languageCode?: string } {
  const languageCodeLength = payload[0] & 0x3f;
  const languageCode = String.fromCharCode(...payload.slice(1, 1 + languageCodeLength));
  const textBytes = payload.slice(1 + languageCodeLength);
  const text = decodeUTF8(textBytes);
  return { text, languageCode };
}

function decodeUriPayload(payload: number[]): string {
  const identifierByte = payload[0];
  const uriPrefixes = [
    "",
    "http://www.",
    "https://www.",
    "http://",
    "https://",
    "tel:",
    "mailto:",
    "ftp://anonymous:anonymous@",
    "ftp://ftp.",
    "ftps://",
    "sftp://",
    "smb://",
    "nfs://",
    "ftp://",
    "dav://",
    "news:",
    "telnet://",
    "imap:",
    "rtsp://",
    "urn:",
    "pop:",
    "sip:",
    "sips:",
    "tftp:",
    "btspp://",
    "btl2cap://",
    "btgoep://",
    "tcpobex://",
    "irdaobex://",
    "file://",
    "urn:epc:id:",
    "urn:epc:tag:",
    "urn:epc:pat:",
    "urn:epc:raw:",
    "urn:epc:",
    "urn:nfc:",
  ];
  const prefix = identifierByte < uriPrefixes.length ? uriPrefixes[identifierByte] : "";
  const rest = String.fromCharCode(...payload.slice(1));
  return prefix + rest;
}

function decodeUTF8(bytes: number[]): string {
  return decodeURIComponent(
    bytes.map((b) => "%" + b.toString(16).padStart(2, "0")).join(""),
  );
}

function parseNdefRecord(record: NdefRecord): ParsedNfcContent {
  if (record.tnf === 1) {
    const typeStr = String.fromCharCode(...record.type);
    if (typeStr === "T") {
      const { text, languageCode } = decodeTextPayload(record.payload);
      return { kind: "text", text, languageCode };
    }
    if (typeStr === "U") {
      const uri = decodeUriPayload(record.payload);
      return { kind: "uri", uri };
    }
  }
  return { kind: "unknown", rawPayload: record.payload };
}

function extractUpiInfo(content: ParsedNfcContent): UpiPaymentInfo | undefined {
  if (content.kind === "text") {
    const text = content.text.trim();
    const upiMatch = text.match(/^([\w.-]+@[\w.-]+)$/);
    if (upiMatch) {
      return { payeeAddress: upiMatch[1] };
    }
    const paramMatch = text.match(/pa=([\w.-]+@[\w.-]+)/i);
    if (paramMatch) {
      return { payeeAddress: paramMatch[1] };
    }
    return undefined;
  }

  if (content.kind === "uri") {
    const uri = content.uri;
    const upiUrlMatch = uri.match(/upi:\/\/pay\?.*pa=([\w.-]+@[\w.-]+)/i);
    if (upiUrlMatch) {
      const params = new URLSearchParams(uri.split("?")[1] ?? "");
      return {
        payeeAddress: upiUrlMatch[1],
        payeeName: params.get("pn") ?? undefined,
        merchantCode: params.get("mc") ?? undefined,
        amount: params.get("am") ? Number(params.get("am")) : undefined,
        transactionNote: params.get("tn") ?? undefined,
      };
    }
    const qrMatch = uri.match(/upi:\/\/pay\?(.*)/i);
    if (qrMatch) {
      const params = new URLSearchParams(qrMatch[1]);
      const pa = params.get("pa");
      if (pa) {
        return {
          payeeAddress: pa,
          payeeName: params.get("pn") ?? undefined,
          merchantCode: params.get("mc") ?? undefined,
          amount: params.get("am") ? Number(params.get("am")) : undefined,
          transactionNote: params.get("tn") ?? undefined,
        };
      }
    }
    return undefined;
  }

  return undefined;
}

function loadNfcModule(): any {
  try {
    return require("react-native-nfc-manager");
  } catch {
    return null;
  }
}

export class NfcService {
  private static instance: NfcService;
  private initialized = false;
  private scanPromise: Promise<NfcScanResult> | null = null;
  private scanResolve: ((result: NfcScanResult) => void) | null = null;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private activeTechRequest: boolean = false;
  private nfcModule: any = null;
  private moduleChecked = false;

  private constructor() {}

  static getInstance(): NfcService {
    if (!NfcService.instance) {
      NfcService.instance = new NfcService();
    }
    return NfcService.instance;
  }

  private getModule(): any {
    if (!this.moduleChecked) {
      this.nfcModule = loadNfcModule();
      this.moduleChecked = true;
    }
    return this.nfcModule;
  }

  private isNative(): boolean {
    return Platform.OS === "android" || Platform.OS === "ios";
  }

  async getStatus(): Promise<NfcStatus> {
    if (!this.isNative()) {
      return { status: "unsupported" };
    }

    const mod = this.getModule();
    if (!mod) {
      return { status: "unsupported" };
    }

    try {
      const { default: NfcManager } = mod;
      if (!this.initialized) {
        await NfcManager.start();
        this.initialized = true;
      }
      const supported = await NfcManager.isSupported();
      if (!supported) {
        return { status: "unsupported" };
      }
      const enabled = await NfcManager.isEnabled();
      return { status: "supported", enabled };
    } catch {
      return { status: "unsupported" };
    }
  }

  async startScanning(timeoutMs: number = NFC_TIMEOUT): Promise<NfcScanResult> {
    if (!this.isNative()) {
      return { success: false, code: "unsupported", message: "NFC is not available on this platform" };
    }

    const mod = this.getModule();
    if (!mod) {
      return { success: false, code: "unsupported", message: "NFC module not available" };
    }

    if (this.scanPromise) {
      return { success: false, code: "read_error", message: "Scan already in progress" };
    }

    this.scanPromise = new Promise<NfcScanResult>((resolve) => {
      this.scanResolve = resolve;
    });

    try {
      const { default: NfcManager, NfcEvents, NfcTech } = mod;

      if (!this.initialized) {
        await NfcManager.start();
        this.initialized = true;
      }

      const supported = await NfcManager.isSupported();
      if (!supported) {
        this.cleanupScan();
        return { success: false, code: "unsupported", message: "NFC is not supported on this device" };
      }

      const enabled = await NfcManager.isEnabled();
      if (!enabled) {
        this.cleanupScan();
        return { success: false, code: "disabled", message: "NFC is disabled. Enable it in your device settings." };
      }

      NfcManager.setEventListener(NfcEvents.DiscoverTag, this.handleTagDiscovery);

      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: "Hold your phone near the NFC terminal",
      });
      this.activeTechRequest = true;

      this.scanTimer = setTimeout(() => {
        this.cancelScan();
        this.scanResolve?.({
          success: false,
          code: "timeout",
          message: "No NFC tag detected within the timeout period",
        });
      }, timeoutMs);

      return await this.scanPromise;
    } catch (error: any) {
      this.cleanupScan();
      if (error?.message?.includes("cancel") || error?.message?.includes("User cancelled")) {
        return { success: false, code: "cancelled", message: "NFC scan was cancelled" };
      }
      return {
        success: false,
        code: "read_error",
        message: error?.message ?? "Failed to read NFC tag",
      };
    }
  }

  cancelScan(): void {
    const mod = this.getModule();
    if (this.activeTechRequest && mod) {
      try {
        const { default: NfcManager } = mod;
        NfcManager.cancelTechnologyRequest();
      } catch {}
      this.activeTechRequest = false;
    }
  }

  cleanupScan(): void {
    const mod = this.getModule();
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    if (mod) {
      try {
        const { default: NfcManager, NfcEvents } = mod;
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      } catch {}
    }
    this.activeTechRequest = false;
    this.scanPromise = null;
    this.scanResolve = null;
  }

  async cleanup(): Promise<void> {
    this.cleanupScan();
    const mod = this.getModule();
    if (this.initialized && mod) {
      try {
        const { default: NfcManager } = mod;
        await NfcManager.close();
      } catch {}
      this.initialized = false;
    }
  }

  private handleTagDiscovery = (tag: any) => {
    this.cleanupScan();

    try {
      const nfcTag = this.parseTag(tag);
      const paymentInfo = this.extractPaymentInfo(nfcTag);
      this.scanResolve?.({ success: true, tag: nfcTag, paymentInfo });
    } catch {
      this.scanResolve?.({
        success: false,
        code: "read_error",
        message: "Failed to parse NFC tag data",
      });
    }
  };

  private parseTag(tag: any): NfcTagData {
    const ndefMessage: NdefRecord[] = (tag.ndefMessage ?? []).map((record: any) => ({
      id: Array.from(record.id ?? []),
      type: Array.from(record.type ?? []),
      payload: Array.from(record.payload ?? []),
      tnf: record.tnf ?? 0,
    }));

    const parsedContent =
      ndefMessage.length > 0 ? parseNdefRecord(ndefMessage[0]) : undefined;

    return {
      id: tag.id ?? "",
      techTypes: tag.techTypes ?? [],
      ndefMessage,
      parsedContent,
    };
  }

  private extractPaymentInfo(tag: NfcTagData): UpiPaymentInfo | undefined {
    if (tag.parsedContent) {
      const info = extractUpiInfo(tag.parsedContent);
      if (info) return info;
    }

    for (const record of tag.ndefMessage) {
      const parsed = parseNdefRecord(record);
      const info = extractUpiInfo(parsed);
      if (info) return info;
    }

    return undefined;
  }
}
