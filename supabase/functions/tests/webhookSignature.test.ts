import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { verifyMidtransSignature } from "../_shared/midtransSignature.ts";

describe("Midtrans webhook signature", () => {
  const orderId = "ORDER-123";
  const statusCode = "200";
  const grossAmount = "199000.00";
  const serverKey = "test-server-key";

  it("returns true for valid signature", async () => {
    const raw = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const expected = createHash("sha512").update(raw).digest("hex");

    const result = await verifyMidtransSignature(
      {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: expected,
      },
      serverKey
    );
    expect(result).toBe(true);
  });

  it("returns false for tampered signature", async () => {
    const result = await verifyMidtransSignature(
      {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: "invalid-signature",
      },
      serverKey
    );
    expect(result).toBe(false);
  });

  it("returns false for wrong amount vs signature", async () => {
    const raw = `${orderId}${statusCode}${"99999.00"}${serverKey}`;
    const wrongSig = createHash("sha512").update(raw).digest("hex");

    const result = await verifyMidtransSignature(
      {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: wrongSig,
      },
      serverKey
    );
    expect(result).toBe(false);
  });
});
