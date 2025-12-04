import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Send, 
  Plus,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Building2,
  User,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { InstitutionSidebar } from '@/components/dashboard/InstitutionSidebar';
import { InvestorSidebar } from '@/components/dashboard/InvestorSidebar';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  id: string;
  investor_id: string;
  institution_id: string;
  other_party_name: string;
  other_party_type: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  created_at: string;
}

interface VerifiedUser {
  id: string;
  name: string;
  type: string;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserEntityId, setCurrentUserEntityId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeData();
  }, []);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as Tables<'messages'>;
          if (newMsg.sender_id !== currentUserId) {
            const message: Message = {
              id: newMsg.id,
              conversation_id: newMsg.conversation_id,
              sender_id: newMsg.sender_id,
              content: newMsg.content,
              created_at: newMsg.created_at || new Date().toISOString(),
              read: newMsg.read ?? false
            };
            setMessages(prev => [...prev, message]);
            // Mark as read
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMsg.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, currentUserId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      if (profile.user_type === 'institution') {
        const { data: institution } = await supabase
          .from('institutions')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (institution) setCurrentUserEntityId(institution.id);
      } else if (profile.user_type === 'investor') {
        const { data: investor } = await supabase
          .from('investors')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (investor) setCurrentUserEntityId(investor.id);
      }

      await fetchConversations(user.id, profile.user_type);
      await fetchVerifiedUsers(profile.user_type);
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifiedUsers = async (userType: string) => {
    try {
      if (userType === 'institution') {
        // Fetch verified investors
        const { data: investors } = await supabase
          .from('investors')
          .select(`
            id,
            company_name,
            investor_type,
            user_id
          `);

        if (investors) {
          const verifiedInvestors: VerifiedUser[] = [];
          for (const inv of investors) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('verification_status, full_name')
              .eq('id', inv.user_id)
              .single();
            
            if (profile?.verification_status === 'verified') {
              verifiedInvestors.push({
                id: inv.id,
                name: inv.company_name || profile.full_name || inv.investor_type,
                type: inv.investor_type
              });
            }
          }
          setVerifiedUsers(verifiedInvestors);
        }
      } else if (userType === 'investor') {
        // Fetch verified institutions
        const { data: institutions } = await supabase
          .from('institutions')
          .select(`
            id,
            institution_name,
            city,
            country,
            user_id
          `);

        if (institutions) {
          const verifiedInstitutions: VerifiedUser[] = [];
          for (const inst of institutions) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('verification_status')
              .eq('id', inst.user_id)
              .single();
            
            if (profile?.verification_status === 'verified') {
              verifiedInstitutions.push({
                id: inst.id,
                name: inst.institution_name,
                type: `${inst.city}, ${inst.country}`
              });
            }
          }
          setVerifiedUsers(verifiedInstitutions);
        }
      }
    } catch (error) {
      console.error('Error fetching verified users:', error);
    }
  };

  const fetchConversations = async (userId: string, userType: string) => {
    try {
      let conversationsData: Tables<'conversations'>[] = [];

      if (userType === 'institution') {
        const { data: institution } = await supabase
          .from('institutions')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!institution) return;

        const { data: convs } = await supabase
          .from('conversations')
          .select('*')
          .eq('institution_id', institution.id)
          .order('updated_at', { ascending: false });

        conversationsData = convs || [];

        const conversationsWithDetails = await Promise.all(
          conversationsData.map(async (conv) => {
            const { data: investor } = await supabase
              .from('investors')
              .select('company_name, investor_type, user_id')
              .eq('id', conv.investor_id)
              .single();

            let investorName = 'Unknown Investor';
            if (investor) {
              const { data: invProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', investor.user_id)
                .single();
              investorName = investor.company_name || invProfile?.full_name || investor.investor_type;
            }

            const { data: lastMsg } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('read', false)
              .neq('sender_id', userId);

            return {
              id: conv.id,
              investor_id: conv.investor_id,
              institution_id: conv.institution_id,
              other_party_name: investorName,
              other_party_type: investor?.investor_type ?? 'Investor',
              last_message: lastMsg?.content ?? 'No messages yet',
              last_message_time: lastMsg ? formatTimeAgo(lastMsg.created_at || '') : '',
              unread_count: count || 0,
              created_at: conv.created_at || ''
            };
          })
        );

        setConversations(conversationsWithDetails);
        if (conversationsWithDetails.length > 0 && !selectedConversation) {
          setSelectedConversation(conversationsWithDetails[0]);
        }
      } else if (userType === 'investor') {
        const { data: investor } = await supabase
          .from('investors')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!investor) return;

        const { data: convs } = await supabase
          .from('conversations')
          .select('*')
          .eq('investor_id', investor.id)
          .order('updated_at', { ascending: false });

        conversationsData = convs || [];

        const conversationsWithDetails = await Promise.all(
          conversationsData.map(async (conv) => {
            const { data: institution } = await supabase
              .from('institutions')
              .select('institution_name, city, country')
              .eq('id', conv.institution_id)
              .single();

            const { data: lastMsg } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('read', false)
              .neq('sender_id', userId);

            return {
              id: conv.id,
              investor_id: conv.investor_id,
              institution_id: conv.institution_id,
              other_party_name: institution?.institution_name ?? 'Unknown Institution',
              other_party_type: institution ? `${institution.city}, ${institution.country}` : 'Institution',
              last_message: lastMsg?.content ?? 'No messages yet',
              last_message_time: lastMsg ? formatTimeAgo(lastMsg.created_at || '') : '',
              unread_count: count || 0,
              created_at: conv.created_at || ''
            };
          })
        );

        setConversations(conversationsWithDetails);
        if (conversationsWithDetails.length > 0 && !selectedConversation) {
          setSelectedConversation(conversationsWithDetails[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        const formattedMessages: Message[] = messagesData.map((msg) => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at || new Date().toISOString(),
          read: msg.read ?? false
        }));

        setMessages(formattedMessages);

        // Mark messages as read
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', currentUserId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    try {
      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: currentUserId,
          content: newMessage.trim(),
        } as TablesInsert<'messages'>)
        .select()
        .single();

      if (error) throw error;

      if (newMsg) {
        const message: Message = {
          id: newMsg.id,
          conversation_id: newMsg.conversation_id,
          sender_id: newMsg.sender_id,
          content: newMsg.content,
          created_at: newMsg.created_at || new Date().toISOString(),
          read: true
        };

        setMessages([...messages, message]);
        setNewMessage('');

        setConversations(conversations.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, last_message: newMessage.trim(), last_message_time: 'Just now' }
            : conv
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleStartNewChat = async (targetUser: VerifiedUser) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      let institutionId: string;
      let investorId: string;

      if (profile.user_type === 'institution') {
        const { data: institution } = await supabase
          .from('institutions')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!institution) return;
        institutionId = institution.id;
        investorId = targetUser.id;
      } else {
        const { data: investor } = await supabase
          .from('investors')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!investor) return;
        investorId = investor.id;
        institutionId = targetUser.id;
      }

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('investor_id', investorId)
        .single();

      if (existingConv) {
        const existingConversation = conversations.find(c => c.id === existingConv.id);
        if (existingConversation) {
          setSelectedConversation(existingConversation);
        }
        setNewChatDialogOpen(false);
        toast.info('Conversation already exists');
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          investor_id: investorId,
          institution_id: institutionId
        } as TablesInsert<'conversations'>)
        .select()
        .single();

      if (error) throw error;

      if (newConv) {
        await fetchConversations(user.id, profile.user_type);
        setNewChatDialogOpen(false);
        toast.success('Conversation started');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_party_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVerifiedUsers = verifiedUsers.filter(user =>
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const handleSelect = (value: string) => {
    if (value === 'messages') return;
    if (role === 'institution') {
      navigate('/dashboard/institution');
    } else if (role === 'investor') {
      navigate('/dashboard/investor');
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col">
        <Navbar />
        <div className="flex flex-1 pt-24">
          {role === 'institution' ? (
            <InstitutionSidebar selected={'messages'} onSelect={handleSelect} pendingCount={totalUnread} messageCount={totalUnread} />
          ) : role === 'investor' ? (
            <InvestorSidebar selected={'messages'} onSelect={handleSelect} messageCount={totalUnread} />
          ) : null}
          <main className="flex-1 overflow-y-auto p-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-24">
        {role === 'institution' ? (
          <InstitutionSidebar selected={'messages'} onSelect={handleSelect} pendingCount={totalUnread} messageCount={totalUnread} />
        ) : role === 'investor' ? (
          <InvestorSidebar selected={'messages'} onSelect={handleSelect} messageCount={totalUnread} />
        ) : null}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex h-[calc(100vh-220px)] bg-card rounded-lg border overflow-hidden">
            {/* Conversations List Sidebar */}
            <div className="w-80 border-r flex flex-col bg-card">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Messages</h2>
                  <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Chat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          Start New Conversation
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={`Search verified ${role === 'institution' ? 'investors' : 'institutions'}...`}
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <ScrollArea className="h-[300px]">
                          {filteredVerifiedUsers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No verified {role === 'institution' ? 'investors' : 'institutions'} found
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {filteredVerifiedUsers.map((user) => (
                                <div
                                  key={user.id}
                                  onClick={() => handleStartNewChat(user)}
                                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                >
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {getInitials(user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.type}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No conversations yet
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mb-1 ${
                          selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                        }`}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(conversation.other_party_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm truncate">
                              {conversation.other_party_name}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {conversation.last_message_time}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {conversation.other_party_type}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground truncate flex-1">
                              {conversation.last_message}
                            </p>
                            {conversation.unread_count > 0 && (
                              <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            {selectedConversation ? (
              <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(selectedConversation.other_party_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{selectedConversation.other_party_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.other_party_type}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`flex gap-2 max-w-[70%] ${
                              message.sender_id === currentUserId ? 'flex-row-reverse' : 'flex-row'
                            }`}
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className={message.sender_id === currentUserId ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                                {message.sender_id === currentUserId ? (
                                  role === 'institution' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />
                                ) : (
                                  role === 'institution' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`flex flex-col ${message.sender_id === currentUserId ? 'items-end' : 'items-start'}`}>
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  message.sender_id === currentUserId
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(message.created_at)}
                                </span>
                                {message.sender_id === currentUserId && (
                                  <span className="text-xs">
                                    {message.read ? (
                                      <CheckCheck className="h-3 w-3 text-blue-500" />
                                    ) : (
                                      <Check className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t bg-card">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                    </div>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a conversation or start a new chat
                  </p>
                  <Button className="gap-2" onClick={() => setNewChatDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    New Chat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
