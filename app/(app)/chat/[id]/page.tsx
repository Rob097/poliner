import { notFound } from "next/navigation";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { getQuotaUsage } from "@/lib/ai/quota";
import { getConversation } from "../actions";
import { ChatViewClient } from "./ChatViewClient";

export const dynamic = "force-dynamic";

export default async function ChatViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireAdminPollaio();
  const result = await getConversation(id);
  if (!result) notFound();
  const quota = await getQuotaUsage(supabase, user.id);

  return (
    <ChatViewClient
      conversation={result.conversation}
      initialMessages={result.messages}
      userId={user.id}
      initialQuota={quota}
    />
  );
}
