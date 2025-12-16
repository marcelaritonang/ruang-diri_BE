# 🚀 Chat API Contract for Frontend - Counseling Chat System

## Base Configuration

```typescript
const API_BASE_URL = 'https://api.ruangdiri.com/api/v1';
const CHAT_BASE_URL = `${API_BASE_URL}/chat`;
const COUNSELING_BASE_URL = `${API_BASE_URL}/counselings`;

// Headers for all requests
const headers = {
  Authorization: `Bearer ${userToken}`,
  'Content-Type': 'application/json',
};
```

## 📋 Type Definitions

```typescript
// User roles
type UserRole =
  | 'client'
  | 'student'
  | 'employee'
  | 'psychologist'
  | 'organization'
  | 'super_admin';

// Session statuses
type SessionStatus = 'pending' | 'active' | 'completed' | 'cancelled';

// Message types
type MessageType = 'text' | 'image' | 'file' | 'automated' | 'system';

// Counseling methods
type CounselingMethod = 'online' | 'offline' | 'organization' | 'chat';

// Base API Response
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  statusCode?: number;
}

// Error Response
interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  error?: string;
}

// Chat Session (Updated for Counseling)
interface ChatSession {
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

// Chat Message (Updated for Automation)
interface ChatMessage {
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

// Counseling Booking
interface CounselingBooking {
  method: CounselingMethod;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  notes?: string;
  psychologistId?: string;
}

// Pagination
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  metadata: PaginationMeta;
}

// Ably Token Response
interface AblyTokenData {
  token: any; // Ably token object
  sessionId: string;
  channelName: string;
  typingChannelName: string;
}
```

## 🔌 API Endpoints

### 1. Create Chat Session

**Endpoint**: `POST /chat/sessions`

**Purpose**: Client requests a new chat session with a psychologist

**Request**:

```typescript
interface CreateSessionRequest {
  psychologistId: string;
}

const createChatSession = async (
  psychologistId: string,
): Promise<
  ApiResponse<{
    sessionId: string;
    psychologistId: string;
    status: SessionStatus;
  }>
> => {
  const response = await fetch(`${CHAT_BASE_URL}/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ psychologistId }),
  });
  return response.json();
};
```

**Response**:

```typescript
// Success (201)
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "psychologistId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "active"
  },
  "message": "Chat session created successfully"
}

// Error Examples
// 400 - Already has active session
{
  "success": false,
  "message": "You already have an active chat session",
  "statusCode": 400
}

// 400 - Psychologist at capacity
{
  "success": false,
  "message": "Psychologist is currently at capacity. Please try another psychologist.",
  "statusCode": 400
}
```

**Usage Example**:

```typescript
try {
  const session = await createChatSession('psychologist-uuid');
  console.log('Session created:', session.data.sessionId);
  // Redirect to chat interface or show waiting screen
} catch (error) {
  console.error('Failed to create session:', error);
  // Show error message to user
}
```

### 2. Get Ably Token (Secure Connection)

**Note**: Sessions start automatically when created - no acceptance workflow needed. Psychologists can start chatting immediately if available during the scheduled counseling time.

**Endpoint**: `GET /chat/ably-token?sessionId={sessionId}`

**Purpose**: Get secure token for Ably real-time connection

**Request**:

```typescript
const getAblyToken = async (
  sessionId: string,
): Promise<ApiResponse<AblyTokenData>> => {
  const response = await fetch(
    `${CHAT_BASE_URL}/ably-token?sessionId=${sessionId}`,
    {
      method: 'GET',
      headers,
    },
  );
  return response.json();
};
```

**Response**:

```typescript
// Success (200)
{
  "success": true,
  "data": {
    "token": {
      "tokenRequest": "...", // Ably token details
      "capability": "...",
      "clientId": "user-uuid",
      "ttl": 1800000 // 30 minutes in milliseconds
    },
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "channelName": "chat:session:550e8400-e29b-41d4-a716-446655440000",
    "typingChannelName": "typing:session:550e8400-e29b-41d4-a716-446655440000"
  },
  "message": "Ably token generated successfully"
}
```

**Usage Example**:

```typescript
import Ably from 'ably';

const connectToChat = async (sessionId: string) => {
  try {
    // Get token from backend
    const tokenResponse = await getAblyToken(sessionId);
    const { token, channelName, typingChannelName } = tokenResponse.data;

    // Initialize Ably client
    const ably = new Ably.Rest({
      authCallback: (tokenParams, callback) => {
        callback(null, token);
      },
    });

    // Subscribe to message channel
    const messageChannel = ably.channels.get(channelName);
    messageChannel.subscribe('message', (message) => {
      console.log('New message:', message.data);
      // Update UI with new message
    });

    // Subscribe to typing channel
    const typingChannel = ably.channels.get(typingChannelName);
    typingChannel.subscribe('typing', (typingData) => {
      console.log('Typing indicator:', typingData.data);
      // Show/hide typing indicator
    });

    return { ably, messageChannel, typingChannel };
  } catch (error) {
    console.error('Failed to connect to chat:', error);
  }
};
```

### 4. Send Message

**Endpoint**: `POST /chat/messages`

**Purpose**: Send a message in an active chat session

**Request**:

```typescript
interface SendMessageRequest {
  sessionId: string;
  message: string;
  messageType: MessageType;
}

const sendMessage = async (
  sessionId: string,
  message: string,
  messageType: MessageType = 'text',
): Promise<ApiResponse<ChatMessage>> => {
  const response = await fetch(`${CHAT_BASE_URL}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId,
      message,
      messageType,
    }),
  });
  return response.json();
};
```

**Response**:

```typescript
// Success (201)
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "sessionId": "session-uuid",
    "senderId": "user-uuid",
    "message": "Hello, how can I help you today?",
    "messageType": "text",
    "isRead": false,
    "createdAt": "2025-01-15T10:35:00.000Z"
  },
  "message": "Message sent successfully"
}
```

**Usage Example**:

```typescript
const handleSendMessage = async () => {
  const messageText = messageInput.value;
  if (!messageText.trim()) return;

  try {
    const response = await sendMessage(currentSessionId, messageText);

    // Add message to local state immediately
    addMessageToChat(response.data);

    // Clear input
    messageInput.value = '';

    // The message will also be received via Ably real-time
  } catch (error) {
    console.error('Failed to send message:', error);
    // Show error state
  }
};
```

### 5. Get Chat History

**Endpoint**: `GET /chat/history?sessionId={sessionId}&page={page}&limit={limit}`

**Purpose**: Retrieve previous messages from a chat session

**Request**:

```typescript
const getChatHistory = async (
  sessionId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ApiResponse<PaginatedResponse<ChatMessage>>> => {
  const response = await fetch(
    `${CHAT_BASE_URL}/history?sessionId=${sessionId}&page=${page}&limit=${limit}`,
    { method: 'GET', headers },
  );
  return response.json();
};
```

**Response**:

```typescript
// Success (200)
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "message-uuid-1",
        "sessionId": "session-uuid",
        "senderId": "client-uuid",
        "message": "Hi, I need help with anxiety",
        "messageType": "text",
        "isRead": true,
        "createdAt": "2025-01-15T10:31:00.000Z",
        "sender": {
          "id": "client-uuid",
          "fullName": "John Doe",
          "role": "client"
        }
      },
      {
        "id": "message-uuid-2",
        "sessionId": "session-uuid",
        "senderId": "psychologist-uuid",
        "message": "Hello John! I'm here to help. Can you tell me more about what you're experiencing?",
        "messageType": "text",
        "isRead": true,
        "createdAt": "2025-01-15T10:32:00.000Z",
        "sender": {
          "id": "psychologist-uuid",
          "fullName": "Dr. Sarah Wilson",
          "role": "psychologist"
        }
      }
    ],
    "metadata": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "message": "Chat history retrieved successfully"
}
```

### 6. Get Active Sessions

**Endpoint**: `GET /chat/sessions/active`

**Purpose**: Get user's currently active chat sessions

**Request**:

```typescript
const getActiveSessions = async (): Promise<ApiResponse<ChatSession[]>> => {
  const response = await fetch(`${CHAT_BASE_URL}/sessions/active`, {
    method: 'GET',
    headers,
  });
  return response.json();
};
```

**Response**:

```typescript
// Success (200)
{
  "success": true,
  "data": [
    {
      "id": "session-uuid",
      "clientId": "client-uuid",
      "psychologistId": "psychologist-uuid",
      "status": "active",
      "isActive": true,
      "startedAt": "2025-01-15T10:30:00.000Z",
      "endedAt": null,
      "createdAt": "2025-01-15T10:25:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "message": "Active sessions retrieved successfully"
}
```

### 7. End Chat Session

**Endpoint**: `PUT /chat/sessions/{sessionId}/end`

**Purpose**: End an active chat session (available to both participants)

**Request**:

```typescript
const endChatSession = async (
  sessionId: string,
): Promise<ApiResponse<ChatSession>> => {
  const response = await fetch(`${CHAT_BASE_URL}/sessions/${sessionId}/end`, {
    method: 'PUT',
    headers,
  });
  return response.json();
};
```

**Response**:

```typescript
// Success (200)
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "clientId": "client-uuid",
    "psychologistId": "psychologist-uuid",
    "status": "completed",
    "isActive": false,
    "startedAt": "2025-01-15T10:30:00.000Z",
    "endedAt": "2025-01-15T11:00:00.000Z",
    "createdAt": "2025-01-15T10:25:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Chat session ended successfully"
}
```

### 8. Mark Messages as Read

**Endpoint**: `PUT /chat/sessions/{sessionId}/read`

**Purpose**: Mark all messages in a session as read by the current user

**Request**:

```typescript
const markMessagesAsRead = async (
  sessionId: string,
): Promise<ApiResponse<null>> => {
  const response = await fetch(`${CHAT_BASE_URL}/sessions/${sessionId}/read`, {
    method: 'PUT',
    headers,
  });
  return response.json();
};
```

**Response**:

```typescript
// Success (200)
{
  "success": true,
  "data": null,
  "message": "Messages marked as read"
}
```

## 🎯 Real-time Integration

### Ably Connection Setup

```typescript
import Ably from 'ably';

class ChatService {
  private ably: Ably.Realtime | null = null;
  private messageChannel: Ably.Types.RealtimeChannelPromise | null = null;
  private typingChannel: Ably.Types.RealtimeChannelPromise | null = null;

  async initializeChat(sessionId: string) {
    try {
      // Get Ably token
      const tokenResponse = await getAblyToken(sessionId);
      const { token, channelName, typingChannelName } = tokenResponse.data;

      // Initialize Ably client
      this.ably = new Ably.Realtime({
        authCallback: (tokenParams, callback) => {
          callback(null, token);
        },
      });

      // Setup message channel
      this.messageChannel = this.ably.channels.get(channelName);
      this.messageChannel.subscribe(
        'message',
        this.onMessageReceived.bind(this),
      );
      this.messageChannel.subscribe(
        'session_status',
        this.onSessionStatusChanged.bind(this),
      );

      // Setup typing channel
      this.typingChannel = this.ably.channels.get(typingChannelName);
      this.typingChannel.subscribe('typing', this.onTypingIndicator.bind(this));

      console.log('Chat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      throw error;
    }
  }

  private onMessageReceived(message: Ably.Types.Message) {
    const messageData = message.data;
    console.log('New message received:', messageData);

    // Update UI with new message
    this.addMessageToChat(messageData);
  }

  private onSessionStatusChanged(statusMessage: Ably.Types.Message) {
    const { status, participants } = statusMessage.data;
    console.log('Session status changed:', status);

    // Handle status changes
    switch (status) {
      case 'active':
        this.showChatInterface();
        break;
      case 'completed':
        this.showSessionEndedMessage();
        break;
    }
  }

  private onTypingIndicator(typingMessage: Ably.Types.Message) {
    const { userId, isTyping } = typingMessage.data;

    // Show/hide typing indicator
    this.updateTypingIndicator(userId, isTyping);
  }

  async sendTypingIndicator(isTyping: boolean) {
    if (this.typingChannel) {
      await this.typingChannel.publish('typing', {
        userId: currentUserId,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    }
  }

  disconnect() {
    if (this.ably) {
      this.ably.close();
      this.ably = null;
      this.messageChannel = null;
      this.typingChannel = null;
    }
  }
}
```

### Frontend Implementation Example

```typescript
// React Hook Example
import { useState, useEffect, useCallback } from 'react';

interface UseChatProps {
  sessionId: string;
  onMessageReceived?: (message: ChatMessage) => void;
  onSessionStatusChanged?: (status: SessionStatus) => void;
}

export const useChat = ({
  sessionId,
  onMessageReceived,
  onSessionStatusChanged,
}: UseChatProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatService] = useState(() => new ChatService());

  useEffect(() => {
    const initChat = async () => {
      try {
        await chatService.initializeChat(sessionId);
        setIsConnected(true);

        // Load chat history
        const history = await getChatHistory(sessionId);
        setMessages(history.data.data);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };

    initChat();

    return () => {
      chatService.disconnect();
    };
  }, [sessionId]);

  const sendMessage = useCallback(
    async (message: string) => {
      try {
        const response = await sendMessage(sessionId, message);
        // Message will be received via real-time, no need to add manually
        return response;
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
    [sessionId],
  );

  const sendTypingIndicator = useCallback((typing: boolean) => {
    chatService.sendTypingIndicator(typing);
  }, []);

  return {
    isConnected,
    messages,
    isTyping,
    sendMessage,
    sendTypingIndicator,
  };
};
```

## 🛡️ Error Handling

### HTTP Status Codes

| Code | Description           | Common Scenarios                       |
| ---- | --------------------- | -------------------------------------- |
| 200  | Success               | Successful operations                  |
| 201  | Created               | Session or message created             |
| 400  | Bad Request           | Invalid input, session limits exceeded |
| 401  | Unauthorized          | Missing or invalid JWT token           |
| 403  | Forbidden             | Not a session participant, wrong role  |
| 404  | Not Found             | Session or message not found           |
| 429  | Too Many Requests     | Rate limiting (if implemented)         |
| 500  | Internal Server Error | Server-side errors                     |

### Error Handling Best Practices

```typescript
const handleApiError = (error: ApiError) => {
  switch (error.statusCode) {
    case 401:
      // Redirect to login
      redirectToLogin();
      break;
    case 403:
      // Show access denied message
      showErrorMessage('You do not have permission to access this chat');
      break;
    case 404:
      // Show not found message
      showErrorMessage('Chat session not found');
      break;
    case 400:
      // Show validation error
      showErrorMessage(error.message);
      break;
    default:
      // Show generic error
      showErrorMessage('Something went wrong. Please try again.');
  }
};

// Usage in API calls
try {
  const response = await createChatSession(psychologistId);
  // Handle success
} catch (error) {
  handleApiError(error);
}
```

## 🔄 Connection Management

### Auto-reconnection Strategy

```typescript
class ConnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  async reconnect(sessionId: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return false;
    }

    try {
      this.reconnectAttempts++;
      await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));

      await this.initializeChat(sessionId);

      // Reset on successful reconnection
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      return true;
    } catch (error) {
      // Exponential backoff
      this.reconnectDelay *= 2;
      console.error(
        `Reconnection attempt ${this.reconnectAttempts} failed:`,
        error,
      );

      // Try again
      return this.reconnect(sessionId);
    }
  }
}
```

## 📱 Usage Examples

### Complete Chat Component

```typescript
import React, { useState, useEffect } from 'react'

interface ChatComponentProps {
  sessionId: string
  currentUserId: string
}

export const ChatComponent: React.FC<ChatComponentProps> = ({ sessionId, currentUserId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { isConnected, sendMessage, sendTypingIndicator } = useChat({
    sessionId,
    onMessageReceived: (message) => {
      setMessages(prev => [...prev, message])
    }
  })

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      await sendMessage(newMessage)
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleTyping = (isTyping: boolean) => {
    sendTypingIndicator(isTyping)
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.senderId === currentUserId ? 'own' : 'other'}`}>
            <div className="message-content">{message.message}</div>
            <div className="message-time">{new Date(message.createdAt).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>

      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onFocus={() => handleTyping(true)}
          onBlur={() => handleTyping(false)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <button onClick={handleSendMessage} disabled={!isConnected || !newMessage.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
```

This comprehensive API contract provides everything your frontend team needs to implement the chat functionality successfully!
