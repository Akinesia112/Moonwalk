// web-interface-design/app/lib/hooks/useChat.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  chatApi,
  ChatSession,
  ChatMessage,
  ChatType,
  ChatContext,
} from '../api/chatApi';

export interface ChatState {
  // 會話相關
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  sessionsLoading: boolean;
  sessionsError: string | null;

  // 消息相關
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesError: string | null;

  // 發送狀態
  sending: boolean;
  sendError: string | null;

  // WebSocket 狀態
  isConnected: boolean;
  connectionError: string | null;
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    sessions: [],
    currentSession: null,
    sessionsLoading: false,
    sessionsError: null,
    messages: [],
    messagesLoading: false,
    messagesError: null,
    sending: false,
    sendError: null,
    isConnected: false,
    connectionError: null,
  });

  const wsRef = useRef<WebSocket | null>(null);

  // ============================================================
  // 會話管理
  // ============================================================

  const loadSessions = useCallback(async (project_id: string) => {
    setState((prev) => ({
      ...prev,
      sessionsLoading: true,
      sessionsError: null,
    }));

    try {
      const sessions = await chatApi.getSessions(project_id);
      setState((prev) => ({
        ...prev,
        sessions,
        sessionsLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        sessionsError: error instanceof Error ? error.message : 'Failed to load sessions',
        sessionsLoading: false,
      }));
    }
  }, []);

  const createSession = useCallback(
    async (params: {
      project_id: string;
      chat_type: ChatType;
      title: string;
      description?: string;
      context?: ChatContext;
    }): Promise<ChatSession | null> => {
      setState((prev) => ({
        ...prev,
        sessionsError: null,
      }));

      try {
        const session = await chatApi.createSession(params);
        setState((prev) => ({
          ...prev,
          sessions: [...prev.sessions, session],
          currentSession: session,
        }));
        return session;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          sessionsError: error instanceof Error ? error.message : 'Failed to create session',
        }));
        return null;
      }
    },
    []
  );

  const selectSession = useCallback(
    async (project_id: string, chat_id: string) => {
      setState((prev) => ({
        ...prev,
        messagesLoading: true,
        messagesError: null,
      }));

      try {
        const session = await chatApi.getSession(project_id, chat_id);
        const messages = await chatApi.getMessages(chat_id);

        setState((prev) => ({
          ...prev,
          currentSession: session,
          messages,
          messagesLoading: false,
        }));

        // 連接 WebSocket
        connectWebSocket(chat_id);

        return session;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          messagesError: error instanceof Error ? error.message : 'Failed to load session',
          messagesLoading: false,
        }));
        return null;
      }
    },
    []
  );

  const updateSession = useCallback(
    async (chat_id: string, updates: Partial<ChatSession>): Promise<boolean> => {
      try {
        const updated = await chatApi.updateSession(chat_id, updates);
        setState((prev) => ({
          ...prev,
          currentSession: updated,
          sessions: prev.sessions.map((s) => (s.id === chat_id ? updated : s)),
        }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          sessionsError: error instanceof Error ? error.message : 'Failed to update session',
        }));
        return false;
      }
    },
    []
  );

  const deleteSession = useCallback(async (chat_id: string): Promise<boolean> => {
    try {
      await chatApi.deleteSession(chat_id);
      setState((prev) => ({
        ...prev,
        sessions: prev.sessions.filter((s) => s.id !== chat_id),
        currentSession: prev.currentSession?.id === chat_id ? null : prev.currentSession,
        messages: [],
      }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        sessionsError: error instanceof Error ? error.message : 'Failed to delete session',
      }));
      return false;
    }
  }, []);

  // ============================================================
  // 消息管理
  // ============================================================

  const sendMessage = useCallback(
    async (chat_id: string, content: string): Promise<ChatMessage | null> => {
      setState((prev) => ({
        ...prev,
        sending: true,
        sendError: null,
      }));

      try {
        // 樂觀更新：立即添加消息到列表
        const tempMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          chat_id,
          role: 'user',
          content,
          status: 'sending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, tempMessage],
        }));

        // 發送消息到服務器
        const message = await chatApi.sendMessage(chat_id, content);

        // 替換臨時消息
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === tempMessage.id ? message : m
          ),
          sending: false,
        }));

        return message;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== `temp-${Date.now()}`),
          sending: false,
          sendError: error instanceof Error ? error.message : 'Failed to send message',
        }));
        return null;
      }
    },
    []
  );

  const deleteMessage = useCallback(
    async (chat_id: string, message_id: string): Promise<boolean> => {
      try {
        await chatApi.deleteMessage(chat_id, message_id);
        setState((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== message_id),
        }));
        return true;
      } catch (error) {
        console.error('Failed to delete message:', error);
        return false;
      }
    },
    []
  );

  // ============================================================
  // WebSocket 連接
  // ============================================================

  const connectWebSocket = useCallback((chat_id: string) => {
    // 關閉舊連接
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      wsRef.current = chatApi.connectChatStream(
        chat_id,
        (message) => {
          setState((prev) => {
            // 檢查消息是否已存在
            const exists = prev.messages.some((m) => m.id === message.id);
            if (exists) return prev;

            return {
              ...prev,
              messages: [...prev.messages, message],
            };
          });
        },
        (error) => {
          setState((prev) => ({
            ...prev,
            connectionError: 'WebSocket connection failed',
            isConnected: false,
          }));
        }
      );

      setState((prev) => ({
        ...prev,
        isConnected: true,
        connectionError: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        connectionError: error instanceof Error ? error.message : 'Failed to connect',
        isConnected: false,
      }));
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
    }));
  }, []);

  // 組件卸載時斷開連接
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // ============================================================
  // 清除錯誤
  // ============================================================

  const clearError = useCallback((field: 'sessionsError' | 'messagesError' | 'sendError' | 'connectionError') => {
    setState((prev) => ({
      ...prev,
      [field]: null,
    }));
  }, []);

  // ============================================================
  // 重置狀態
  // ============================================================

  const reset = useCallback(() => {
    disconnectWebSocket();
    setState({
      sessions: [],
      currentSession: null,
      sessionsLoading: false,
      sessionsError: null,
      messages: [],
      messagesLoading: false,
      messagesError: null,
      sending: false,
      sendError: null,
      isConnected: false,
      connectionError: null,
    });
  }, [disconnectWebSocket]);

  return {
    ...state,
    loadSessions,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
    sendMessage,
    deleteMessage,
    connectWebSocket,
    disconnectWebSocket,
    clearError,
    reset,
  };
}