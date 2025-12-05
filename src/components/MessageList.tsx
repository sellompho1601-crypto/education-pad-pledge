import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, CheckCheck, MessageSquare, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
  read?: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

const MessageList = ({ messages, currentUserId }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isImageAttachment = (type: string | null | undefined) => {
    return type?.startsWith('image/');
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split('/');
      return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
    } catch {
      return 'attachment';
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="text-center space-y-4">
          <div className="p-4 bg-primary/10 rounded-full inline-flex">
            <MessageSquare className="h-8 w-8 text-primary/60" />
          </div>
          <div>
            <p className="text-lg font-semibold text-muted-foreground mb-2">
              No messages yet
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Start the conversation by sending the first message
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/30">
      <div className="p-6 space-y-6">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === currentUserId;
          const hasAttachment = message.attachment_url;
          const isImage = isImageAttachment(message.attachment_type);
          
          return (
            <div
              key={message.id}
              className={`flex gap-4 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} group hover:bg-slate-50/50 transition-colors rounded-2xl p-2 -mx-2`}
            >
              <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                <AvatarFallback className={`text-sm font-semibold ${
                  isOwnMessage 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {message.sender_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%] flex-1`}>
                {/* Sender Name - Only for received messages */}
                {!isOwnMessage && message.sender_name && (
                  <p className="text-xs font-semibold text-slate-600 mb-1 px-1">
                    {message.sender_name}
                  </p>
                )}

                {/* Message Bubble */}
                <div
                  className={`relative rounded-3xl px-5 py-3 shadow-sm transition-all duration-200 ${
                    isOwnMessage
                      ? 'bg-gradient-to-r from-primary to-primary/90 text-white rounded-br-md shadow-primary/20 hover:shadow-primary/30'
                      : 'bg-white text-slate-800 rounded-bl-md border border-slate-200 shadow-slate-100 hover:shadow-slate-200'
                  } group-hover:scale-[1.02]`}
                >
                  {/* Attachment */}
                  {hasAttachment && (
                    <div className="mb-2">
                      {isImage ? (
                        <a 
                          href={message.attachment_url!} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={message.attachment_url!} 
                            alt="Attachment" 
                            className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : (
                        <a 
                          href={message.attachment_url!} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            isOwnMessage 
                              ? 'bg-white/20 hover:bg-white/30' 
                              : 'bg-slate-100 hover:bg-slate-200'
                          } transition-colors`}
                        >
                          <FileText className="h-5 w-5 flex-shrink-0" />
                          <span className="text-sm truncate flex-1">
                            {getFileName(message.attachment_url!)}
                          </span>
                          <Download className="h-4 w-4 flex-shrink-0" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Content */}
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                  )}
                  
                  {/* Message Tail */}
                  <div
                    className={`absolute top-0 w-3 h-3 ${
                      isOwnMessage
                        ? 'right-0 -mr-1 bg-gradient-to-r from-primary to-primary/90'
                        : 'left-0 -ml-1 bg-white border-l border-t border-slate-200'
                    }`}
                    style={{
                      clipPath: isOwnMessage 
                        ? 'polygon(100% 0, 0 0, 100% 100%)'
                        : 'polygon(0 0, 100% 0, 0 100%)'
                    }}
                  />
                </div>

                {/* Timestamp and Read Status */}
                <div className={`flex items-center gap-2 mt-2 px-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs text-slate-500 font-medium">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </span>
                  {isOwnMessage && (
                    <span className={`text-xs ${
                      message.read ? 'text-primary' : 'text-slate-400'
                    }`}>
                      {message.read ? (
                        <CheckCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Gradient Overlay at Bottom */}
      <div className="sticky bottom-0 h-8 bg-gradient-to-t from-slate-50/80 to-transparent pointer-events-none" />
    </div>
  );
};

export default MessageList;
