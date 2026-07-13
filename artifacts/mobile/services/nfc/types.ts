export type NfcStatusCode =
  | "supported"
  | "unsupported"
  | "enabled"
  | "disabled"
  | "scanning"
  | "tag_detected"
  | "read_error"
  | "cancelled"
  | "timeout"
  | "cleaned_up";

export interface NfcTagData {
  id: string;
  techTypes: string[];
  ndefMessage: NdefRecord[];
  parsedContent?: ParsedNfcContent;
}

export interface NdefRecord {
  id: number[];
  type: number[];
  payload: number[];
  tnf: number;
}

export type ParsedNfcContent =
  | ParsedTextRecord
  | ParsedUriRecord
  | ParsedUnknownRecord;

export interface ParsedTextRecord {
  kind: "text";
  text: string;
  languageCode?: string;
}

export interface ParsedUriRecord {
  kind: "uri";
  uri: string;
}

export interface ParsedUnknownRecord {
  kind: "unknown";
  rawPayload: number[];
}

export interface UpiPaymentInfo {
  payeeAddress: string;
  payeeName?: string;
  merchantCode?: string;
  amount?: number;
  transactionNote?: string;
}

export type NfcScanResult =
  | {
      success: true;
      tag: NfcTagData;
      paymentInfo?: UpiPaymentInfo;
    }
  | {
      success: false;
      code: "unsupported" | "disabled" | "cancelled" | "timeout" | "read_error" | "init_error";
      message: string;
    };

export type NfcStatus =
  | { status: "unknown" }
  | { status: "checking" }
  | { status: "supported"; enabled: boolean }
  | { status: "unsupported" };
