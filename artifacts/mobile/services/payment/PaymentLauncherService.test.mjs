import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGenericUpiLink,
  createPaymentRequest,
  getUpiApp,
  UPI_APPS,
  validatePaymentRequest,
} from "../../.payment-test-dist/PaymentLinkBuilder.js";

describe("createPaymentRequest", () => {
  it("builds a request with formatted amount and note", () => {
    const request = createPaymentRequest({
      payeeAddress: "merchant@upi",
      payeeName: "Merchant",
      merchantCode: "5411",
      amount: 500,
      note: "Coffee",
    });

    assert.deepEqual(request, {
      payeeAddress: "merchant@upi",
      payeeName: "Merchant",
      merchantCode: "5411",
      amount: "500.00",
      currency: "INR",
      transactionNote: "Coffee",
    });
  });
});

describe("validatePaymentRequest", () => {
  it("returns null for valid requests", () => {
    assert.equal(
      validatePaymentRequest({
        payeeAddress: "merchant@upi",
        amount: "500.00",
        currency: "INR",
      }),
      null,
    );
  });

  it("returns errors for invalid requests", () => {
    assert.equal(validatePaymentRequest({ payeeAddress: "" }), "UPI ID is required");
    assert.equal(validatePaymentRequest({ payeeAddress: "bad-id", amount: "0" }), "Enter a valid UPI ID");
  });
});

describe("UPI app deep links", () => {
  it("builds app-specific deep links", () => {
    const request = createPaymentRequest({
      payeeAddress: "merchant@upi",
      payeeName: "Merchant",
      amount: 500,
      note: "Test",
    });

    assert.match(getUpiApp("google_pay").buildDeepLink(request), /tez:\/\/upi\/pay\?/);
    assert.match(getUpiApp("phonepe").buildDeepLink(request), /phonepe:\/\/pay\?/);
    assert.match(getUpiApp("paytm").buildDeepLink(request), /paytmmp:\/\/pay\?/);
    assert.match(buildGenericUpiLink(request), /upi:\/\/pay\?/);
  });

  it("includes required UPI parameters", () => {
    const request = createPaymentRequest({
      payeeAddress: "merchant@upi",
      payeeName: "Merchant",
      merchantCode: "5411",
      amount: 500,
    });

    const link = UPI_APPS[0].buildDeepLink(request);
    assert.match(link, /pa=merchant%40upi/);
    assert.match(link, /pn=Merchant/);
    assert.match(link, /am=500\.00/);
    assert.match(link, /cu=INR/);
    assert.match(link, /mc=5411/);
  });
});
