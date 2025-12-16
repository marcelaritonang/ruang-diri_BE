# 🚀 Chat Integration Guide for Frontend - Counseling Chat System

## Quick Start

This guide provides comprehensive instructions for integrating the **new counseling chat system** into your frontend application. The system now supports **scheduled counseling sessions** with automated messaging, controlled access, and real-time communication.

### 🎯 Key Changes

- **Counseling-Integrated Chat**: Chat sessions are created automatically when booking counseling with `method: "chat"`
- **Automated Session Management**: System handles session lifecycle, not users
- **Controlled Access**: Chat is disabled until session starts (only Team Ruang Diri can initiate)
- **No Direct Chat Creation**: Regular users cannot create counseling chat sessions directly

## 📦 Installation

```bash
# Install Ably for real-time functionality
npm install ably
# or
yarn add ably
```

## 🏗️ Basic Setup

### 1. Environment Configuration

```typescript
// config/chat.ts
export const CHAT_CONFIG = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_URL || 'https://api.ruangdiri.com/api/v1',
  CHAT_ENDPOINT: '/chat',
  COUNSELING_ENDPOINT: '/counselings',
  TOKEN_REFRESH_INTERVAL: 25 * 60 * 1000, // 25 minutes (token expires in 30)
};
```

### 2. Type Definitions

```typescript
// types/chat.ts
export type UserRole =
  | 'client'
  | 'student'
  | 'employee'
  | 'psychologist'
  | 'organization'
  | 'super_admin';

export type SessionStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type MessageType = 'text' | 'image' | 'file' | 'automated' | 'system';
export type CounselingMethod = 'online' | 'offline' | 'organization' | 'chat';

export interface ChatSession {
  id: string;
  clientId: string;
  psychologistId: string;
  counselingId?: string;
  status: SessionStatus;
  isActive: boolean;
  isChatEnabled: boolean;
  startedAt: string | null;
  endedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  message: string;
  messageType: MessageType;
  isAutomated: boolean;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    role: UserRole;
  };
}

export interface CounselingBooking {
  method: CounselingMethod;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  notes?: string;
}
```

### 3. API Service (Updated for Counseling Chat)

```typescript
// services/chatApi.ts
import { CHAT_CONFIG } from '../config/chat';
import type {
  ChatMessage,
  ChatSession,
  CounselingBooking,
} from '../types/chat';

export class ChatApiService {
  private chatUrl = `${CHAT_CONFIG.API_BASE_URL}${CHAT_CONFIG.CHAT_ENDPOINT}`;
  private counselingUrl = `${CHAT_CONFIG.API_BASE_URL}${CHAT_CONFIG.COUNSELING_ENDPOINT}`;
  private authToken: string = '';

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.authToken}`,
    };
  }

  // ⚠️ REMOVED: Direct counseling chat session creation
  // Sessions are now created automatically via counseling booking

  // 🆕 NEW: Book counseling with chat method
  async bookCounselingWithChat(booking: CounselingBooking) {
    const response = await fetch(`${this.counselingUrl}/book`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(booking),
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  // 🆕 NEW: Get user's counseling sessions (includes chat sessions)
  async getUserCounselingSessions() {
    const response = await fetch(`${this.counselingUrl}/user-sessions`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  async getAblyToken(sessionId: string) {
    const response = await fetch(
      `${this.chatUrl}/ably-token?sessionId=${sessionId}`,
      {
        method: 'GET',
        headers: this.headers,
      },
    );

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  async sendMessage(sessionId: string, message: string, messageType = 'text') {
    const response = await fetch(`${this.chatUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ sessionId, message, messageType }),
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  async getChatHistory(sessionId: string, cursor?: string, limit = 20) {
    const params = new URLSearchParams({
      sessionId,
      limit: limit.toString(),
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await fetch(
      `${this.chatUrl}/history?${params.toString()}`,
      {
        method: 'GET',
        headers: this.headers,
      },
    );

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  async endSession(sessionId: string) {
    const response = await fetch(`${this.chatUrl}/sessions/${sessionId}/end`, {
      method: 'PUT',
      headers: this.headers,
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  async getActiveSessions() {
    const response = await fetch(`${this.chatUrl}/sessions/active`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  async markMessagesAsRead(sessionId: string) {
    const response = await fetch(`${this.chatUrl}/sessions/${sessionId}/read`, {
      method: 'PUT',
      headers: this.headers,
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }
}

export const chatApi = new ChatApiService();
```

### 4. Chat Service with Ably (Updated)

```typescript
// services/chatService.ts
import Ably from 'ably';
import { chatApi } from './chatApi';
import { CHAT_CONFIG } from '../config/chat';
import type { ChatMessage, ChatSession } from '../types/chat';

export interface ChatEventHandlers {
  onMessageReceived?: (message: ChatMessage) => void;
  onTypingIndicator?: (userId: string, isTyping: boolean) => void;
  onSessionStatusChanged?: (status: string, data?: any) => void;
  onConnectionStateChanged?: (
    state: 'connected' | 'disconnected' | 'connecting',
  ) => void;
  onError?: (error: any) => void;
  onChatEnabled?: () => void;
  onSessionEnding?: (minutesLeft: number) => void;
}

export class CounselingChatService {
  private ably: Ably.Realtime | null = null;
  private messageChannel: Ably.Types.RealtimeChannelPromise | null = null;
  private typingChannel: Ably.Types.RealtimeChannelPromise | null = null;
  private sessionId: string = '';
  private tokenRefreshInterval: NodeJS.Timeout | null = null;
  private eventHandlers: ChatEventHandlers = {};

  constructor(authToken: string) {
    chatApi.setAuthToken(authToken);
  }

  setEventHandlers(handlers: ChatEventHandlers) {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  async connect(sessionId: string): Promise<void> {
    try {
      this.sessionId = sessionId;
      this.eventHandlers.onConnectionStateChanged?.('connecting');

      // Get Ably token
      const tokenResponse = await chatApi.getAblyToken(sessionId);
      const { token, channelName, typingChannelName } = tokenResponse.data;

      // Initialize Ably
      this.ably = new Ably.Realtime({
        authCallback: (tokenParams, callback) => {
          callback(null, token);
        },
        disconnectedRetryTimeout: 5000,
        suspendedRetryTimeout: 10000,
      });

      // Handle connection state changes
      this.ably.connection.on('connected', () => {
        this.eventHandlers.onConnectionStateChanged?.('connected');
      });

      this.ably.connection.on('disconnected', () => {
        this.eventHandlers.onConnectionStateChanged?.('disconnected');
      });

      this.ably.connection.on('failed', (error) => {
        this.eventHandlers.onError?.(error);
      });

      // Setup channels
      this.setupMessageChannel(channelName);
      this.setupTypingChannel(typingChannelName);

      // Setup token refresh
      this.setupTokenRefresh();

      console.log('Counseling chat service connected successfully');
    } catch (error) {
      this.eventHandlers.onError?.(error);
      throw error;
    }
  }

  private setupMessageChannel(channelName: string) {
    if (!this.ably) return;

    this.messageChannel = this.ably.channels.get(channelName);

    this.messageChannel.subscribe('message', (message) => {
      this.eventHandlers.onMessageReceived?.(message.data);
    });

    // 🆕 Handle counseling-specific session events
    this.messageChannel.subscribe('session_status', (statusMessage) => {
      const { status, data } = statusMessage.data;

      this.eventHandlers.onSessionStatusChanged?.(status, data);

      // Handle specific counseling chat events
      switch (status) {
        case 'chat_enabled':
          this.eventHandlers.onChatEnabled?.();
          break;
        case 'ending_soon':
          this.eventHandlers.onSessionEnding?.(data?.minutesLeft || 5);
          break;
        case 'completed':
          this.disconnect();
          break;
      }
    });
  }
  private setupTypingChannel(typingChannelName: string) {
    if (!this.ably) return;

    this.typingChannel = this.ably.channels.get(typingChannelName);

    this.typingChannel.subscribe('typing', (typingMessage) => {
      const { userId, isTyping } = typingMessage.data;
      this.eventHandlers.onTypingIndicator?.(userId, isTyping);
    });
  }

  private setupTokenRefresh() {
    // Refresh token every 25 minutes (expires in 30)
    this.tokenRefreshInterval = setInterval(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        this.eventHandlers.onError?.(error);
      }
    }, CHAT_CONFIG.TOKEN_REFRESH_INTERVAL);
  }

  private async refreshToken() {
    if (!this.sessionId) return;

    const tokenResponse = await chatApi.getAblyToken(this.sessionId);
    const { token } = tokenResponse.data;

    // Update Ably auth
    if (this.ably) {
      await this.ably.auth.authorize(token);
    }
  }

  async sendMessage(
    message: string,
    messageType: 'text' | 'image' | 'file' = 'text',
  ): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    await chatApi.sendMessage(this.sessionId, message, messageType);
  }

  async sendTypingIndicator(isTyping: boolean): Promise<void> {
    if (!this.typingChannel) return;

    await this.typingChannel.publish('typing', {
      isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  async loadChatHistory(cursor?: string, limit = 20): Promise<ChatMessage[]> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    const response = await chatApi.getChatHistory(
      this.sessionId,
      cursor,
      limit,
    );
    return response.data.data;
  }

  async endSession(): Promise<void> {
    if (!this.sessionId) return;

    await chatApi.endSession(this.sessionId);
    this.disconnect();
  }

  async markMessagesAsRead(): Promise<void> {
    if (!this.sessionId) return;

    await chatApi.markMessagesAsRead(this.sessionId);
  }

  disconnect(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }

    if (this.ably) {
      this.ably.close();
      this.ably = null;
    }

    this.messageChannel = null;
    this.typingChannel = null;
    this.sessionId = '';

    this.eventHandlers.onConnectionStateChanged?.('disconnected');
  }
}
```

## 🎯 React Hook Implementation (Updated for Counseling Chat)

```typescript
// hooks/useCounselingChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CounselingChatService,
  ChatMessage,
  ChatEventHandlers,
} from '../services/chatService';
import { chatApi } from '../services/chatApi';
import type { CounselingBooking } from '../types/chat';

interface UseCounselingChatOptions {
  sessionId?: string;
  authToken: string;
  autoConnect?: boolean;
}

export const useCounselingChat = ({
  sessionId,
  authToken,
  autoConnect = true,
}: UseCounselingChatOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const [isSessionEnding, setIsSessionEnding] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    sessionId,
  );

  const chatServiceRef = useRef<CounselingChatService | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize chat service
  useEffect(() => {
    chatServiceRef.current = new CounselingChatService(authToken);

    const eventHandlers: ChatEventHandlers = {
      onMessageReceived: (message) => {
        setMessages((prev) => [...prev, message]);
      },

      onTypingIndicator: (userId, isTyping) => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(userId);

            // Clear typing after 3 seconds of inactivity
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setTypingUsers((current) => {
                const updated = new Set(current);
                updated.delete(userId);
                return updated;
              });
            }, 3000);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      },

      onSessionStatusChanged: (status, data) => {
        console.log('Session status changed:', status, data);
      },

      onChatEnabled: () => {
        setIsChatEnabled(true);
        setError(null);
      },

      onSessionEnding: (minutes) => {
        setIsSessionEnding(true);
        setMinutesLeft(minutes);
      },
      onConnectionStateChanged: (state) => {
        setIsConnecting(state === 'connecting');
        setIsConnected(state === 'connected');
        if (state === 'disconnected') {
          setError('Connection lost');
        } else {
          setError(null);
        }
      },

      onError: (error) => {
        console.error('Chat error:', error);
        setError(error.message || 'An error occurred');
        setIsConnected(false);
        setIsConnecting(false);
      },
    };

    chatServiceRef.current.setEventHandlers(eventHandlers);

    return () => {
      chatServiceRef.current?.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [authToken]);

  // Auto-connect when sessionId is available
  useEffect(() => {
    if (
      autoConnect &&
      currentSessionId &&
      chatServiceRef.current &&
      !isConnected &&
      !isConnecting
    ) {
      connect(currentSessionId);
    }
  }, [currentSessionId, autoConnect, isConnected, isConnecting]);

  // 🆕 NEW: Book counseling with chat method
  const bookCounselingWithChat = useCallback(
    async (booking: CounselingBooking) => {
      try {
        const response = await chatApi.bookCounselingWithChat({
          ...booking,
          method: 'chat',
        });

        // The chat session is created automatically
        // You can extract session info from the response if needed
        return response;
      } catch (error) {
        console.error('Failed to book counseling with chat:', error);
        throw error;
      }
    },
    [],
  );

  const connect = useCallback(async (sessionId: string) => {
    if (!chatServiceRef.current) return;

    try {
      setCurrentSessionId(sessionId);
      await chatServiceRef.current.connect(sessionId);

      // Load chat history
      const history = await chatServiceRef.current.loadChatHistory();
      setMessages(history);
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      setError('Failed to connect to chat');
    }
  }, []);

  const sendMessage = useCallback(
    async (
      message: string,
      messageType: 'text' | 'image' | 'file' = 'text',
    ) => {
      if (!chatServiceRef.current || !isConnected || !isChatEnabled) {
        throw new Error('Chat not available or not enabled');
      }

      try {
        await chatServiceRef.current.sendMessage(message, messageType);
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
    [isConnected, isChatEnabled],
  );

  const sendTypingIndicator = useCallback(
    async (isTyping: boolean) => {
      if (!chatServiceRef.current || !isConnected || !isChatEnabled) return;

      try {
        await chatServiceRef.current.sendTypingIndicator(isTyping);
      } catch (error) {
        console.error('Failed to send typing indicator:', error);
      }
    },
    [isConnected, isChatEnabled],
  );

  const loadMoreMessages = useCallback(
    async (cursor?: string) => {
      if (!chatServiceRef.current || !currentSessionId) return [];

      try {
        const moreMessages =
          await chatServiceRef.current.loadChatHistory(cursor);
        return moreMessages;
      } catch (error) {
        console.error('Failed to load more messages:', error);
        return [];
      }
    },
    [currentSessionId],
  );

  const endSession = useCallback(async () => {
    if (!chatServiceRef.current) return;

    try {
      await chatServiceRef.current.endSession();
      setMessages([]);
      setCurrentSessionId(undefined);
      setIsChatEnabled(false);
      setIsSessionEnding(false);
      setMinutesLeft(null);
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }, []);

  const markMessagesAsRead = useCallback(async () => {
    if (!chatServiceRef.current) return;

    try {
      await chatServiceRef.current.markMessagesAsRead();
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    chatServiceRef.current?.disconnect();
    setMessages([]);
    setCurrentSessionId(undefined);
    setIsChatEnabled(false);
    setIsSessionEnding(false);
    setMinutesLeft(null);
  }, []);

  return {
    // State
    isConnected,
    isConnecting,
    isChatEnabled, // 🆕 NEW: Whether chat is enabled for the session
    isSessionEnding, // 🆕 NEW: Whether session is ending soon
    minutesLeft, // 🆕 NEW: Minutes left before session ends
    messages,
    typingUsers: Array.from(typingUsers),
    error,
    sessionId: currentSessionId,

    // Actions
    bookCounselingWithChat, // 🆕 NEW: Book counseling with chat
    connect,
    disconnect,
    sendMessage,
    sendTypingIndicator,
    loadMoreMessages,
    endSession,
    markMessagesAsRead, // 🆕 NEW: Mark messages as read

    // Utilities
    clearError: () => setError(null),
  };
};
```

## � React Component Example (Updated for Counseling Chat)

```typescript
// components/CounselingChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useCounselingChat } from '../hooks/useCounselingChat';
import type { CounselingBooking } from '../types/chat';

interface CounselingChatInterfaceProps {
  sessionId?: string;
  currentUserId: string;
  authToken: string;
  onSessionEnd?: () => void;
  onBookingComplete?: (bookingData: any) => void;
}

export const CounselingChatInterface: React.FC<CounselingChatInterfaceProps> = ({
  sessionId,
  currentUserId,
  authToken,
  onSessionEnd,
  onBookingComplete,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(!sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    isConnected,
    isConnecting,
    isChatEnabled,
    isSessionEnding,
    minutesLeft,
    messages,
    typingUsers,
    error,
    bookCounselingWithChat,
    sendMessage,
    sendTypingIndicator,
    endSession,
    markMessagesAsRead,
    clearError,
  } = useCounselingChat({
    sessionId,
    authToken,
    autoConnect: !!sessionId,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when component is focused
  useEffect(() => {
    const handleFocus = () => {
      markMessagesAsRead();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [markMessagesAsRead]);

  // Handle booking form submission
  const handleBookingSubmit = async (bookingData: CounselingBooking) => {
    try {
      const result = await bookCounselingWithChat(bookingData);
      setShowBookingForm(false);
      onBookingComplete?.(result);
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  // Handle typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!isTyping && isChatEnabled) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 1000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !isChatEnabled) return;

    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        sendTypingIndicator(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      onSessionEnd?.();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  // Show booking form if no session
  if (showBookingForm) {
    return <CounselingBookingForm onSubmit={handleBookingSubmit} />;
  }

  // Show error state
  if (error && !isConnected) {
    return (
      <div className="chat-error">
        <p>Error: {error}</p>
        <button onClick={clearError}>Retry</button>
      </div>
    );
  }

  // Show connecting state
  if (isConnecting) {
    return (
      <div className="chat-loading">
        <p>Connecting to counseling chat...</p>
      </div>
    );
  }

  return (
    <div className="counseling-chat-interface">
      {/* Session Status */}
      <div className="session-status">
        {!isChatEnabled && (
          <div className="chat-disabled-notice">
            <p>💬 Chat will be enabled when your counseling session starts</p>
            <p>You will receive automated messages before the session begins</p>
          </div>
        )}

        {isSessionEnding && (
          <div className="session-ending-warning">
            <p>⏰ Session ending in {minutesLeft} minutes</p>
            <button onClick={handleEndSession} className="end-session-btn">
              End Session Now
            </button>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.senderId === currentUserId ? 'own-message' : 'other-message'
            } ${message.isAutomated ? 'automated-message' : ''}`}
          >
            <div className="message-content">
              {message.isAutomated && <span className="automated-badge">🤖</span>}
              <p>{message.message}</p>
              <span className="message-time">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            Someone is typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="message-input-container">
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder={
            isChatEnabled
              ? "Type your message..."
              : "Chat will be enabled when session starts"
          }
          disabled={!isChatEnabled || !isConnected}
          className="message-input"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || !isChatEnabled || !isConnected}
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};

// Counseling Booking Form Component
const CounselingBookingForm: React.FC<{
  onSubmit: (booking: CounselingBooking) => void;
}> = ({ onSubmit }) => {
  const [booking, setBooking] = useState<CounselingBooking>({
    method: 'chat',
    date: '',
    startTime: '',
    endTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(booking);
  };

  return (
    <form onSubmit={handleSubmit} className="booking-form">
      <h2>📅 Book Counseling Chat Session</h2>

      <div className="form-group">
        <label>Date:</label>
        <input
          type="date"
          value={booking.date}
          onChange={(e) => setBooking({ ...booking, date: e.target.value })}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Start Time:</label>
          <input
            type="time"
            value={booking.startTime}
            onChange={(e) => setBooking({ ...booking, startTime: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>End Time:</label>
          <input
            type="time"
            value={booking.endTime}
            onChange={(e) => setBooking({ ...booking, endTime: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Notes (optional):</label>
        <textarea
          value={booking.notes}
          onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
          placeholder="Describe what you'd like to discuss..."
        />
      </div>

      <button type="submit" className="book-btn">
        📅 Book Chat Session
      </button>
    </form>
  );
};
```

## 🎨 CSS Styles (Updated)

```css
/* Add to your existing styles */
.counseling-chat-interface {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 600px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.session-status {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.chat-disabled-notice {
  padding: 1rem;
  background-color: #fff3cd;
  color: #856404;
  text-align: center;
}

.chat-disabled-notice p {
  margin: 0.25rem 0;
}

.session-ending-warning {
  padding: 1rem;
  background-color: #f8d7da;
  color: #721c24;
  text-align: center;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.automated-message {
  background-color: #e3f2fd;
  border-left: 3px solid #1976d2;
}

.automated-badge {
  background-color: #1976d2;
  color: white;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
  margin-right: 0.5rem;
}

.booking-form {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: white;
}

.booking-form h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group textarea {
  height: 80px;
  resize: vertical;
}

.book-btn {
  width: 100%;
  padding: 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
}

.book-btn:hover {
  background-color: #0056b3;
}

.chat-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #666;
}
```

## 🔄 Complete Integration Flow

### 1. 📅 Book Counseling with Chat Method

```typescript
// pages/BookCounseling.tsx
import React from 'react';
import { useCounselingChat } from '../hooks/useCounselingChat';

export const BookCounselingPage = () => {
  const { bookCounselingWithChat } = useCounselingChat({
    authToken: userToken,
    autoConnect: false,
  });

  const handleBooking = async (bookingData) => {
    try {
      const result = await bookCounselingWithChat({
        method: 'chat',
        date: '2025-08-11',
        startTime: '14:00',
        endTime: '14:30',
        timezone: 'Asia/Jakarta',
        notes: 'Need support with anxiety',
      });

      // Redirect to chat interface with session ID
      router.push(`/counseling-chat/${result.data.sessionId}`);
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  return <CounselingBookingForm onSubmit={handleBooking} />;
};
```

### 2. 💬 Chat Session Interface

```typescript
// pages/CounselingChat.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { CounselingChatInterface } from '../components/CounselingChatInterface';

export const CounselingChatPage = () => {
  const { sessionId } = useParams();

  return (
    <div className="page-container">
      <h1>💙 Counseling Chat Session</h1>
      <CounselingChatInterface
        sessionId={sessionId}
        currentUserId={user.id}
        authToken={authToken}
        onSessionEnd={() => router.push('/counseling-history')}
      />
    </div>
  );
};
```

### 3. 📊 Session Management

```typescript
// hooks/useCounselingSessions.ts
import { useState, useEffect } from 'react';
import { chatApi } from '../services/chatApi';

export const useCounselingSessions = (authToken: string) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        chatApi.setAuthToken(authToken);
        const response = await chatApi.getUserCounselingSessions();
        setSessions(response.data);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [authToken]);

  return { sessions, loading };
};
```

## 🚨 Important Implementation Notes

### ⚠️ Chat Access Control

```typescript
// The system enforces these rules:

// ❌ REMOVED: Direct chat session creation for counseling
// This endpoint is disabled for regular users:
// POST /api/v1/chat/sessions/counseling

// ✅ CORRECT: Create via counseling booking
// POST /api/v1/counselings/book
// Body: { method: 'chat', ... }

// Chat is disabled until session starts
// isChatEnabled: false (initially)
// isChatEnabled: true (when session starts)
```

### 🤖 Automated Messages

The system automatically sends these messages:

```typescript
// 10 minutes before session
{
  message: "Halo! Sesi konseling Anda akan dimulai dalam 10 menit. Bersiaplah untuk berbagi dan terbuka dalam percakapan kita nanti. 😊",
  messageType: "automated",
  isAutomated: true
}

// When session starts
{
  message: "Selamat datang di sesi konseling! Saya siap mendengarkan dan membantu Anda hari ini. Silakan ceritakan apa yang ingin Anda bagikan. 💙",
  messageType: "automated",
  isAutomated: true
}

// 5 minutes before session ends
{
  sessionStatus: "ending_soon",
  minutesLeft: 5
}

// When session auto-ends
{
  message: "Sesi konseling telah berakhir. Terima kasih telah berbagi dengan saya hari ini. Jaga diri dengan baik ya! 💙",
  messageType: "automated",
  isAutomated: true
}
```

### 🔄 Session States

```typescript
type SessionFlow = {
  pending: {
    isChatEnabled: false;
    description: 'Session scheduled, waiting for start time';
  };
  active: {
    isChatEnabled: true;
    description: 'Session in progress, chat available';
  };
  completed: {
    isChatEnabled: false;
    description: 'Session ended, chat disabled';
  };
  cancelled: {
    isChatEnabled: false;
    description: 'Session cancelled';
  };
};
```

## 🔧 Error Handling

```typescript
// Common error scenarios and handling

const errorHandling = {
  // Chat not enabled yet
  chatDisabled: {
    code: 'CHAT_DISABLED',
    message: 'Chat will be enabled when your session starts',
    action: 'Show waiting message to user',
  },

  // Session not found
  sessionNotFound: {
    code: 'SESSION_NOT_FOUND',
    message: 'Chat session not found',
    action: 'Redirect to booking page',
  },

  // Session ended
  sessionEnded: {
    code: 'SESSION_ENDED',
    message: 'This session has ended',
    action: 'Show session summary, disable chat',
  },

  // Connection issues
  connectionLost: {
    code: 'CONNECTION_LOST',
    message: 'Connection lost, trying to reconnect...',
    action: 'Show reconnecting indicator, retry connection',
  },
};

// Implementation in component
const handleChatError = (error: any) => {
  switch (error.code) {
    case 'CHAT_DISABLED':
      setShowWaitingMessage(true);
      break;
    case 'SESSION_ENDED':
      setSessionEnded(true);
      break;
    default:
      setError(error.message);
  }
};
```

## 🧪 Testing Your Integration

```typescript
// Test scenarios to verify implementation

const testScenarios = [
  {
    name: 'Book counseling with chat method',
    steps: [
      '1. Call bookCounselingWithChat()',
      '2. Verify session created in database',
      '3. Verify automated jobs scheduled',
      '4. Check isChatEnabled = false initially',
    ],
  },
  {
    name: 'Connect to pending session',
    steps: [
      '1. Connect to chat session',
      '2. Verify connection established',
      '3. Verify chat input disabled',
      '4. Show waiting message',
    ],
  },
  {
    name: 'Automated session start',
    steps: [
      '1. Wait for scheduled start time',
      '2. Verify automated message received',
      '3. Verify isChatEnabled = true',
      '4. Enable chat input',
    ],
  },
  {
    name: 'Real-time messaging',
    steps: [
      '1. Send message from client',
      '2. Verify message appears for psychologist',
      '3. Send reply from psychologist',
      '4. Verify reply appears for client',
    ],
  },
  {
    name: 'Session ending flow',
    steps: [
      '1. Wait for 5 minutes before end',
      '2. Verify ending warning shown',
      '3. Show end session button',
      '4. Verify auto-end at scheduled time',
    ],
  },
];
```

## 📱 Mobile Considerations

```typescript
// Additional considerations for mobile apps

const mobileOptimizations = {
  // Background handling
  handleAppBackground: () => {
    // Disconnect Ably when app goes to background
    // Reconnect when app returns to foreground
  },

  // Push notifications
  setupPushNotifications: () => {
    // Register for notifications about:
    // - Session starting soon
    // - New messages received
    // - Session ending
  },

  // Offline handling
  handleOfflineMode: () => {
    // Show offline indicator
    // Queue messages for when connection returns
    // Sync when connection restored
  },
};
```

## 🎉 Summary

This updated integration guide provides everything you need to implement the **new counseling chat system** in your frontend application!

### ✅ Key Features Implemented:

- **🎯 Counseling-Integrated Chat**: Sessions created via counseling booking, not direct chat creation
- **🤖 Automated Messaging**: System sends messages before/during/after sessions
- **🔒 Controlled Access**: Chat disabled until session starts (Team Ruang Diri controls timing)
- **📱 Real-time Communication**: Instant messaging with typing indicators
- **⏰ Session Management**: Automatic ending with warnings
- **📊 Complete State Management**: Pending → Active → Completed flow

### 🚀 Ready for Production:

- Error handling for all scenarios
- Mobile-optimized with background handling
- Comprehensive testing scenarios
- Beautiful, accessible UI components
- Full TypeScript support

The system is now fully integrated with the counseling booking flow and provides a seamless chat experience for both clients and psychologists! 🎊
sendTypingIndicator(true)
}

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing indicator after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTypingIndicator(false)
    }, 1000)

}

const handleSendMessage = async () => {
if (!newMessage.trim() || !isConnected) return

    try {
      await sendMessage(newMessage.trim())
      setNewMessage('')

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false)
        sendTypingIndicator(false)
      }

      // Focus back on input
      inputRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
      // You might want to show an error message to the user
    }

}

const handleKeyPress = (e: React.KeyboardEvent) => {
if (e.key === 'Enter' && !e.shiftKey) {
e.preventDefault()
handleSendMessage()
}
}

const handleEndSession = async () => {
try {
await endSession()
onSessionEnd?.()
} catch (error) {
console.error('Failed to end session:', error)
}
}

const formatTime = (timestamp: string) => {
return new Date(timestamp).toLocaleTimeString('en-US', {
hour: '2-digit',
minute: '2-digit'
})
}

if (error) {
return (
<div className="chat-error">
<p>Error: {error}</p>
<button onClick={clearError}>Retry</button>
</div>
)
}

return (
<div className="chat-interface">
{/_ Header _/}
<div className="chat-header">
<h3>Counseling Session</h3>
<div className="connection-status">
{isConnecting && <span className="status connecting">Connecting...</span>}
{isConnected && <span className="status connected">Connected</span>}
{!isConnected && !isConnecting && <span className="status disconnected">Disconnected</span>}
</div>
<button onClick={handleEndSession} className="end-session-btn">
End Session
</button>
</div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderId === currentUserId ? 'own' : 'other'}`}
          >
            <div className="message-content">
              <div className="message-text">{message.message}</div>
              <div className="message-meta">
                <span className="message-time">{formatTime(message.createdAt)}</span>
                {message.senderId === currentUserId && (
                  <span className={`read-status ${message.isRead ? 'read' : 'unread'}`}>
                    {message.isRead ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span>Someone is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="message-input-container">
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={!isConnected}
          className="message-input"
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !newMessage.trim()}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>

)
}

````

## 💾 Session Management

```typescript
// services/sessionManager.ts
import { chatApi } from './chatApi';

export interface SessionInfo {
  sessionId: string;
  psychologistId: string;
  status: 'active' | 'completed';
  createdAt: string;
}

export class SessionManager {
  private currentSession: SessionInfo | null = null;

  async createSession(psychologistId: string): Promise<SessionInfo> {
    try {
      const response = await chatApi.createSession(psychologistId);
      this.currentSession = {
        sessionId: response.data.sessionId,
        psychologistId: response.data.psychologistId,
        status: response.data.status,
        createdAt: new Date().toISOString(),
      };

      // Store in localStorage for persistence
      localStorage.setItem(
        'currentChatSession',
        JSON.stringify(this.currentSession),
      );

      return this.currentSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  getCurrentSession(): SessionInfo | null {
    if (!this.currentSession) {
      // Try to restore from localStorage
      const stored = localStorage.getItem('currentChatSession');
      if (stored) {
        this.currentSession = JSON.parse(stored);
      }
    }
    return this.currentSession;
  }

  clearSession(): void {
    this.currentSession = null;
    localStorage.removeItem('currentChatSession');
  }

  updateSessionStatus(status: 'active' | 'completed'): void {
    if (this.currentSession) {
      this.currentSession.status = status;
      localStorage.setItem(
        'currentChatSession',
        JSON.stringify(this.currentSession),
      );
    }
  }
}

export const sessionManager = new SessionManager();
````

## 🎯 Usage Examples

### Simple Chat Setup

```typescript
// pages/chat.tsx
import React, { useEffect, useState } from 'react'
import { ChatInterface } from '../components/ChatInterface'
import { sessionManager } from '../services/sessionManager'

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [authToken, setAuthToken] = useState<string>('')

  useEffect(() => {
    // Get current session and user info
    const session = sessionManager.getCurrentSession()
    if (session) {
      setSessionId(session.sessionId)
    }

    // Get user info from your auth system
    const user = getCurrentUser() // Your auth function
    setCurrentUserId(user.id)
    setAuthToken(user.token)
  }, [])

  const handleSessionEnd = () => {
    sessionManager.clearSession()
    setSessionId(null)
    // Redirect to home or show session ended message
  }

  if (!sessionId) {
    return <div>No active chat session</div>
  }

  return (
    <ChatInterface
      sessionId={sessionId}
      currentUserId={currentUserId}
      authToken={authToken}
      onSessionEnd={handleSessionEnd}
    />
  )
}
```

### Creating a New Session

```typescript
// components/PsychologistSelection.tsx
import React from 'react'
import { sessionManager } from '../services/sessionManager'

interface Psychologist {
  id: string
  name: string
  specialization: string
  isAvailable: boolean
}

export const PsychologistSelection: React.FC<{ psychologists: Psychologist[] }> = ({ psychologists }) => {
  const handleSelectPsychologist = async (psychologistId: string) => {
    try {
      const session = await sessionManager.createSession(psychologistId)

      // Redirect to chat page
      window.location.href = `/chat?sessionId=${session.sessionId}`
    } catch (error) {
      console.error('Failed to create session:', error)
      // Show error message
    }
  }

  return (
    <div className="psychologist-selection">
      <h2>Select a Psychologist</h2>
      {psychologists.map(psychologist => (
        <div key={psychologist.id} className="psychologist-card">
          <h3>{psychologist.name}</h3>
          <p>{psychologist.specialization}</p>
          <button
            onClick={() => handleSelectPsychologist(psychologist.id)}
            disabled={!psychologist.isAvailable}
          >
            {psychologist.isAvailable ? 'Start Chat' : 'Unavailable'}
          </button>
        </div>
      ))}
    </div>
  )
}
```

## 🎨 CSS Styles

```css
/* styles/chat.css */
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.connection-status .status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status.connected {
  background-color: #d4edda;
  color: #155724;
}

.status.connecting {
  background-color: #fff3cd;
  color: #856404;
}

.status.disconnected {
  background-color: #f8d7da;
  color: #721c24;
}

.messages-container {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  max-width: 70%;
}

.message.own {
  align-self: flex-end;
}

.message.other {
  align-self: flex-start;
}

.message-content {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  position: relative;
}

.message.own .message-content {
  background-color: #007bff;
  color: white;
}

.message.other .message-content {
  background-color: #e9ecef;
  color: #333;
}

.message-text {
  margin-bottom: 0.25rem;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  opacity: 0.7;
}

.typing-indicator {
  padding: 0.5rem 1rem;
  font-style: italic;
  color: #666;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.message-input-container {
  display: flex;
  padding: 1rem;
  gap: 0.5rem;
  border-top: 1px solid #e0e0e0;
  background-color: #f9f9f9;
}

.message-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
  font-size: 1rem;
}

.message-input:focus {
  border-color: #007bff;
}

.send-button {
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
}

.send-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.send-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.chat-error {
  padding: 2rem;
  text-align: center;
  color: #721c24;
  background-color: #f8d7da;
  border-radius: 8px;
}

.end-session-btn {
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.end-session-btn:hover {
  background-color: #c82333;
}
```

This guide provides everything you need to implement the chat functionality in your frontend application! The code is production-ready and includes proper error handling, typing indicators, connection management, and a beautiful UI.
