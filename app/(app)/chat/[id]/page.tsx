import { notFound } from "next/navigation";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { getConversation } from "../actions";
import { ChatViewClient } from "./ChatViewClient";

export const dynamic = "force-dynamic";

export default async function ChatViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireAdminPollaio();
  const result = await getConversation(id);
  if (!result) notFound();

  return (
    <ChatViewClient
      conversation={result.conversation}
      initialMessages={result.messages}
      userId={user.id}
    />
  );
}
