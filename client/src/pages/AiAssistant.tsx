import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Mic, Download, Bot, User, FileSearch2 } from 'lucide-react';
import { chatApi, reportsApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatMessage {
  MessageID?: number;
  Role: 'user' | 'assistant';
  Content: string;
  CreatedDate?: string;
  SourceRefsJSON?: string | null;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 60; // ~150 seconds total, allows for job-queue delay on top of the LLM call itself

/**
 * Conversational Crime Intelligence Interface (problem statement
 * section 1). POST /chat/message returns immediately once the
 * officer's question is saved — the actual LLM call runs in the
 * chat-job Job Function (15-minute budget, since QuickML can exceed
 * the api function's 30-second limit). This component polls
 * GET /conversations/:id/messages until the assistant's reply appears.
 */
export default function AiAssistant() {
  const { language, setLanguage } = useLanguage();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isWaitingForReply, setIsWaitingForReply] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageCountRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const queryClient = useQueryClient();

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\*\*/g, '').replace(/[#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'kn' ? 'kn-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const { data: history } = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: () => chatApi.getMessages(conversationId as number) as any,
    enabled: !!conversationId
  });

  useEffect(() => {
    if (history?.data) setLocalMessages(history.data);
  }, [history]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [localMessages, isWaitingForReply]);

  useEffect(() => () => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
  }, []);

  /**
   * Polls the message list until a new assistant message shows up
   * (identified by having more messages than we had right after
   * sending), or gives up after MAX_POLL_ATTEMPTS.
   */
  const pollForReply = (convoId: number, messageCountBeforeReply: number, attempt = 0) => {
    pollTimeoutRef.current = setTimeout(async () => {
      try {
        const result: any = await chatApi.getMessages(convoId);
        const messages: ChatMessage[] = result.data || [];

        if (messages.length > messageCountBeforeReply) {
          setLocalMessages(messages);
          setIsWaitingForReply(false);
          queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
          const lastMsg = messages[messages.length - 1];
          if (lastMsg?.Role === 'assistant' && lastMsg.Content) {
            speakText(lastMsg.Content);
          }
          return;
        }

        if (attempt + 1 >= MAX_POLL_ATTEMPTS) {
          setIsWaitingForReply(false);
          setLocalMessages((prev) => [
            ...prev,
            {
              Role: 'assistant',
              Content: 'This is taking longer than expected. The model may still be starting up — please try sending your question again in amoment.',
              CreatedDate: new Date().toISOString()
            }
          ]);
          return;
        }

        pollForReply(convoId, messageCountBeforeReply, attempt + 1);
      } catch {
        pollForReply(convoId, messageCountBeforeReply, attempt + 1);
      }
    }, POLL_INTERVAL_MS);
  };

  const sendMessage = useMutation({
    mutationFn: (question: string) =>
      chatApi.sendMessage({ conversationId, question, language }) as any,
    onMutate: async (question: string) => {
      setLocalMessages((prev) => {
        const next = [...prev, { Role: 'user' as const, Content: question, CreatedDate: new Date().toISOString() }];
        messageCountRef.current = next.length;
        return next;
      });
      setInput('');
      setIsWaitingForReply(true);
    },
    onSuccess: (result: any) => {
      const convoId = result.data.conversationId;
      if (!conversationId) setConversationId(convoId);
      pollForReply(convoId, messageCountRef.current);
    },
    onError: () => setIsWaitingForReply(false)
  });

  const exportPdf = useMutation({
    mutationFn: () => reportsApi.exportChat(conversationId as number) as any,
    onSuccess: (result: any) => {
      const blob = new Blob([result.data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${conversationId}.html`;
      a.click();
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage.mutate(input.trim());
  };

  const handleVoiceToggle = () => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert('Voice input is not supported in this browser. Please try Chrome.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = language === 'kn' ? 'kn-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
      sendMessage.mutate(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">AI Crime Intelligence Assistant</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ask about FIRs, accused history, victims, or financial links — in English or Kannada
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
            className="btn-secondary text-xs"
          >
            {language === 'en' ? 'Switch to ಕನ್ನಡ' : 'Switch to English'}
          </button>
          {conversationId && (
            <button onClick={() => exportPdf.mutate()} className="btn-secondary text-xs flex items-center gap-1.5">
              <Download size={14} /> Export PDF
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 card overflow-y-auto space-y-4 mb-4">
        {localMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
            <Bot size={32} />
            <p className="text-sm">Try: "Show me repeat offenders with more than 2 cases"</p>
            <p className="text-sm">or: "Give me information on cyber crime cases this year"</p>
          </div>
        )}

        {localMessages.map((msg, i) => {
          const sourceRefs = msg.SourceRefsJSON ? JSON.parse(msg.SourceRefsJSON) : null;
          return (
            <div key={i} className={`flex gap-3 ${msg.Role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.Role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
              )}
              <div className={`max-w-[70%] rounded-xl px-4 py-3 text-sm ${
                msg.Role === 'user' ? 'bg-accent text-white' : 'bg-base-900 border border-base-700 text-slate-200'
              }`}>
                <p className="whitespace-pre-wrap">{msg.Content}</p>
                {sourceRefs && sourceRefs.type !== 'none' && (
                  <div className="mt-2 pt-2 border-t border-base-700 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <FileSearch2 size={12} />
                    Grounded in {sourceRefs.rowCount ?? sourceRefs.chunks?.length ?? 0} record(s) from{' '}
                    {sourceRefs.sourceType || sourceRefs.document || 'the database'}
                  </div>
                )}
              </div>
              {msg.Role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-base-700 text-slate-300 flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
              )}
            </div>
          );
        })}

        {(sendMessage.isPending || isWaitingForReply) && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-base-900 border border-base-700 rounded-xl px-4 py-3 text-sm text-slate-500">
              Analyzing crime records... this can take up to a minute
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleVoiceToggle}
          className={`p-3 rounded-lg border ${isRecording ? 'bg-risk-high/20 border-risk-high text-risk-high' : 'btn-secondary'}`}
          title="Voice input (English / Kannada)"
        >
          <Mic size={18} />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={language === 'kn' ? 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ...' : 'Type your question...'}
          className="input-field flex-1"
          disabled={isWaitingForReply}
        />
        <button onClick={handleSend} className="btn-primary flex items-center gap-2" disabled={sendMessage.isPending || isWaitingForReply}>
          <Send size={16} /> Send
        </button>
      </div>
    </div>
  );
}