import { NextResponse } from "next/server";

/**
 * Webhook do WhatsApp (Meta Cloud API).
 *
 * TODO(Épico 4):
 * - GET: validação do challenge (`hub.mode`, `hub.verify_token`, `hub.challenge`)
 * - POST: validação de assinatura (X-Hub-Signature-256), idempotência por
 *   `external_message_id`, identificação da organização via `phone_number_id`
 *   (NUNCA confiar em organization_id no corpo), persistência e enfileiramento.
 */
function notImplemented() {
  return NextResponse.json(
    { error: "WhatsApp webhook não implementado nesta fase (Épico 4)." },
    { status: 501 }
  );
}

export function GET() {
  return notImplemented();
}

export function POST() {
  return notImplemented();
}
