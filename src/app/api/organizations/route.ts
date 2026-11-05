import { NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { AppError, isAppError, toPublicMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { createOrganizationSchema } from "@/lib/validation/organizations";

/**
 * POST /api/organizations — cria a organização do usuário autenticado.
 *
 * Valida sessão + payload (Zod) e delega à RPC `create_organization()`
 * (migration 003), que garante atomicamente membership owner + assinatura
 * trialing. Clientes browser devem preferir a Server Action
 * `createOrganization` (features/organizations).
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Corpo da requisição inválido." } },
      { status: 400 }
    );
  }

  const parsed = createOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
        },
      },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_business_type: parsed.data.businessType ?? null,
  });

  if (error || !orgId) {
    const appError = mapRpcError(error);
    return NextResponse.json(
      { error: { code: appError.code, message: toPublicMessage(appError) } },
      { status: appError.status }
    );
  }

  return NextResponse.json({ organization_id: orgId }, { status: 201 });
}

function mapRpcError(error: unknown): AppError {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "";

  if (message.includes("User already belongs to an organization")) {
    return new AppError(
      "VALIDATION",
      "Usuário já pertence a uma organização."
    );
  }
  if (message.includes("Invalid organization name")) {
    return new AppError("VALIDATION", "Nome da empresa inválido.");
  }
  if (message.includes("Invalid organization slug")) {
    return new AppError("VALIDATION", "Slug inválido.");
  }
  if (message.includes("Authentication required")) {
    return new AppError("UNAUTHORIZED", "Autenticação necessária.");
  }
  if (isAppError(error)) return error;
  return new AppError("INTERNAL", "Não foi possível criar a organização.");
}
