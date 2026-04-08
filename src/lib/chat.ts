import { supabase } from '@/integrations/supabase/client';

type ConversationType = 'direct' | 'support';

interface CreateConversationOptions {
  participantIds: string[];
  type?: ConversationType;
}

export const createConversationWithParticipants = async ({
  participantIds,
  type = 'direct',
}: CreateConversationOptions) => {
  const conversationId = crypto.randomUUID();
  const uniqueParticipantIds = [...new Set(participantIds)];

  const { error: conversationError } = await supabase
    .from('conversations')
    .insert({ id: conversationId, type });

  if (conversationError) {
    throw conversationError;
  }

  const { error: participantsError } = await supabase
    .from('conversation_participants')
    .insert(
      uniqueParticipantIds.map((userId) => ({
        conversation_id: conversationId,
        user_id: userId,
      })),
    );

  if (participantsError) {
    throw participantsError;
  }

  return conversationId;
};