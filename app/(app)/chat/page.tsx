import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ChatListClient } from "./ChatListClient";
import { getConversations } from "./actions";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  await requireAdminPollaio();
  const conversations = await getConversations();

  return (
    <ScreenContainer
      header={
        <Header
          title="Assistente AI"
          subtitle={
            conversations.length === 0
              ? "Comincia una conversazione"
              : `${conversations.length} conversazion${conversations.length === 1 ? "e" : "i"}`
          }
        />
      }
    >
      <ChatListClient conversations={conversations} />
    </ScreenContainer>
  );
}
