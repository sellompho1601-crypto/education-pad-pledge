import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ConversationList from '@/components/ConversationList';
import MessageList from '@/components/MessageList';
import MessageInput from '@/components/MessageInput';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MessageCircle, AlertCircle } from 'lucide-react';

const Messages = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndVerification();
  }, []);

  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setSelectedConversationId(conversationId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentUserId && isVerified) {
      loadConversations();
    }
  }, [currentUserId, isVerified]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      subscribeToMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  const checkAuthAndVerification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_status')
      .eq('id', user.id)
      .single();

    if (profile?.verification_status === 'verified') {
      setIsVerified(true);
    }
    
    setLoading(false);
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        updated_at,
        institutions!conversations_institution_id_fkey(id, institution_name, user_id),
        investors!conversations_investor_id_fkey(id, company_name, investor_type, user_id)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error loading conversations',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const formatted = data?.map((conv: any) => {
      const isInstitution = conv.institutions.user_id === currentUserId;
      return {
        id: conv.id,
        other_party_name: isInstitution 
          ? (conv.investors.company_name || 'Investor')
          : conv.institutions.institution_name,
        other_party_type: isInstitution ? 'investor' : 'institution',
        updated_at: conv.updated_at,
      };
    }) || [];

    setConversations(formatted);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_id,
        created_at,
        profiles!messages_sender_id_fkey(full_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: 'Error loading messages',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const formatted = data?.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      sender_id: msg.sender_id,
      created_at: msg.created_at,
      sender_name: msg.profiles?.full_name,
    })) || [];

    setMessages(formatted);
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as any]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversationId || !currentUserId) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversationId,
      sender_id: currentUserId,
      content,
    });

    if (error) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <main className="container mx-auto px-4 py-20">
          <Card className="max-w-md mx-auto p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verification Required</h1>
            <p className="text-muted-foreground">
              You must be verified to access the messaging feature. Please complete your verification process.
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-hero bg-clip-text text-transparent">
          Messages
        </h1>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          <Card className="lg:col-span-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId || undefined}
                onSelect={setSelectedConversationId}
              />
            </div>
          </Card>

          <Card className="lg:col-span-2 overflow-hidden flex flex-col">
            {selectedConversationId ? (
              <>
                <MessageList messages={messages} currentUserId={currentUserId || ''} />
                <MessageInput onSendMessage={handleSendMessage} />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
