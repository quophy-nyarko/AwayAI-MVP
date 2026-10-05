import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { parseWhatsAppExport } from "../src/import-chat.js";
import { extractIncomingMessages, verifyMetaSignature } from "../src/whatsapp.js";

test("parses an Android WhatsApp export", () => {
  const parsed = parseWhatsAppExport(
    "04/10/2026, 09:10 - Alex: Hello there\n04/10/2026, 09:11 - Maya: Are you open today?\ncontinued line",
  );
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]?.sender, "Alex");
  assert.equal(parsed[1]?.body, "Are you open today?\ncontinued line");
});

test("extracts text messages from a Meta webhook", () => {
  const output = extractIncomingMessages({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              contacts: [{ wa_id: "971500000000", profile: { name: "Maya" } }],
              messages: [
                {
                  from: "971500000000",
                  id: "wamid.test",
                  timestamp: "1791104400",
                  type: "text",
                  text: { body: "Hello" },
                },
              ],
            },
          },
        ],
      },
    ],
  });
  assert.equal(output.length, 1);
  assert.equal(output[0]?.contactName, "Maya");
  assert.equal(output[0]?.body, "Hello");
});

test("checks Meta webhook HMAC signatures", () => {
  process.env.NODE_ENV = "production";
  process.env.META_APP_SECRET = "test-secret";
  const body = Buffer.from('{"hello":"world"}');
  const signature = `sha256=${createHmac("sha256", "test-secret").update(body).digest("hex")}`;
  assert.equal(verifyMetaSignature(body, signature), true);
  assert.equal(verifyMetaSignature(body, "sha256=bad"), false);
  delete process.env.META_APP_SECRET;
  process.env.NODE_ENV = "test";
});
