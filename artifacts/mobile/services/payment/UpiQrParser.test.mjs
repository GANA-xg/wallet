import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatUpiAmount, isValidUpiId, parseUpiQr } from "../../.payment-test-dist/UpiQrParser.js";

describe("parseUpiQr", () => {
  it("parses a standard UPI deep link", () => {
    const result = parseUpiQr("upi://pay?pa=merchant@upi&pn=Demo%20Merchant&mc=5411&am=500&cu=INR&tn=Vault");

    assert.deepEqual(result, {
      payeeAddress: "merchant@upi",
      payeeName: "Demo Merchant",
      merchantCode: "5411",
      amount: "500",
      currency: "INR",
      transactionNote: "Vault",
      transactionId: undefined,
      transactionRef: undefined,
      raw: "upi://pay?pa=merchant@upi&pn=Demo%20Merchant&mc=5411&am=500&cu=INR&tn=Vault",
    });
  });

  it("parses query-only UPI payloads", () => {
    const result = parseUpiQr("pa=shop@paytm&pn=Shop&mc=1234");

    assert.equal(result?.payeeAddress, "shop@paytm");
    assert.equal(result?.payeeName, "Shop");
    assert.equal(result?.merchantCode, "1234");
  });

  it("returns null for invalid payloads", () => {
    assert.equal(parseUpiQr("https://example.com"), null);
    assert.equal(parseUpiQr("upi://pay?pn=NoAddress"), null);
    assert.equal(parseUpiQr(""), null);
  });
});

describe("isValidUpiId", () => {
  it("accepts valid UPI IDs", () => {
    assert.equal(isValidUpiId("merchant@upi"), true);
    assert.equal(isValidUpiId("aryan.sharma@hdfc"), true);
  });

  it("rejects invalid UPI IDs", () => {
    assert.equal(isValidUpiId("not-an-id"), false);
    assert.equal(isValidUpiId("@bank"), false);
  });
});

describe("formatUpiAmount", () => {
  it("formats amounts with two decimal places", () => {
    assert.equal(formatUpiAmount(500), "500.00");
    assert.equal(formatUpiAmount(12.5), "12.50");
  });

  it("throws for invalid amounts", () => {
    assert.throws(() => formatUpiAmount(0));
    assert.throws(() => formatUpiAmount(-1));
  });
});
