# 🔔 Chat Unread Message Count Feature

## Overview

The chat system now includes comprehensive unread message count functionality. This feature provides real-time indicators of unread messages from other participants in chat sessions.

---

## 🌟 Features

### ✅ **Implemented Features**

- **Individual Session Unread Count**: Get unread count for a specific session
- **Total Unread Count**: Get total unread messages across all sessions
- **Active Sessions with Unread Counts**: Session lists include unread counts
- **Chat Histories with Unread Counts**: Historical sessions show unread counts
- **Real-time Updates**: Unread counts update instantly via Ably WebSocket
- **Automatic Count Updates**: Counts update when messages are sent/read

---

## 🗄️ Database Schema

The existing `chat_messages` table already includes:

```sql
isRead BOOLEAN NOT NULL DEFAULT FALSE
```

No additional database changes were required.

---

## 📡 API Endpoints

### 1. Get Unread Count for Specific Session

**GET** `/api/v1/chat/sessions/{sessionId}/unread-count`

**Response:**

```json
{
  "success": true,
  "message": "Unread message count retrieved successfully",
  "data": {
    "unreadCount": 5
  }
}
```

### 2. Get Total Unread Count

**GET** `/api/v1/chat/unread-count/total`

**Response:**

```json
{
  "success": true,
  "message": "Total unread count retrieved successfully",
  "data": {
    "totalUnread": 12,
    "sessionUnreadCounts": {
      "session-uuid-1": 5,
      "session-uuid-2": 7,
      "session-uuid-3": 0
    }
  }
}
```

### 3. Enhanced Active Sessions (Updated)

**GET** `/api/v1/chat/sessions/active`

**Response:** _(Now includes unreadCount)_

```json
{
  "success": true,
  "data": [
    {
      "id": "session-uuid",
      "status": "active",
      "isActive": true,
      "unreadCount": 3,
      "psychologist": {
        "id": "psych-uuid",
        "fullName": "Dr. Jane Smith",
        "profilePicture": "profile-url"
      },
      "client": {
        "id": "client-uuid",
        "fullName": "John Doe",
        "profilePicture": "profile-url"
      }
    }
  ]
}
```

### 4. Enhanced Chat Histories (Updated)

**GET** `/api/v1/chat/histories`

**Response:** _(Now includes unreadCount)_

```json
{
  "success": true,
  "data": [
    {
      "sessionId": "session-uuid",
      "status": "completed",
      "unreadCount": 2,
      "lastMessage": {
        "id": "message-uuid",
        "message": "Thank you for the session",
        "createdAt": "2025-08-19T10:30:00.000Z",
        "senderId": "sender-uuid",
        "senderFullName": "Dr. Jane Smith"
      }
    }
  ]
}
```

---

## 🔄 Real-time Updates

### Ably WebSocket Events

#### 1. Unread Count Updates

**Event:** `unread_count_update`
**Channel:** `chat:session:{sessionId}`

```typescript
{
  userId: string,           // User whose unread count changed
  unreadCount: number,      // New unread count
  timestamp: string         // ISO timestamp
}
```

#### 2. Message Events (Enhanced)

When a new message is sent, the system automatically:

1. Publishes the message via `message` event
2. Calculates unread count for the recipient
3. Publishes `unread_count_update` event for the recipient

---

## 🎯 Frontend Integration

### 1. Subscribe to Unread Count Updates

```typescript
// Subscribe to unread count updates
messageChannel.subscribe('unread_count_update', (msg) => {
  const { userId, unreadCount } = msg.data;

  // Update unread count in UI for the specific user
  if (userId === currentUser.id) {
    updateUnreadCountInUI(unreadCount);
  }
});
```

### 2. Display Unread Counts in Session List

```typescript
// Fetch active sessions with unread counts
const response = await fetch('/api/v1/chat/sessions/active', {
  headers: { Authorization: `Bearer ${token}` },
});

const { data: sessions } = await response.json();

sessions.forEach((session) => {
  // Display session with unread count badge
  displaySession(session, session.unreadCount);
});
```

### 3. Display Total Unread Count Badge

```typescript
// Get total unread count for app badge
const response = await fetch('/api/v1/chat/unread-count/total', {
  headers: { Authorization: `Bearer ${token}` },
});

const { data } = await response.json();
displayAppBadge(data.totalUnread);
```

### 4. Mark Messages as Read

```typescript
// When user opens a chat session
const markAsRead = async (sessionId: string) => {
  await fetch(`/api/v1/chat/sessions/${sessionId}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  // Unread count will be updated via WebSocket
};
```

---

## 🎨 UI/UX Implementation Examples

### 1. Session List with Unread Badges

```typescript
function SessionListItem({ session }: { session: SessionWithUnread }) {
  return (
    <div className="session-item">
      <div className="session-info">
        <img src={session.psychologist.profilePicture} alt="Profile" />
        <div>
          <h3>{session.psychologist.fullName}</h3>
          <p>Active Session</p>
        </div>
      </div>

      {session.unreadCount > 0 && (
        <div className="unread-badge">
          {session.unreadCount}
        </div>
      )}
    </div>
  );
}
```

### 2. App-wide Unread Count Badge

```typescript
function AppNavigation({ totalUnreadCount }: { totalUnreadCount: number }) {
  return (
    <nav>
      <div className="nav-item">
        <span>Chat</span>
        {totalUnreadCount > 0 && (
          <span className="unread-badge-small">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </div>
    </nav>
  );
}
```

### 3. Real-time Unread Count Updates

```typescript
const ChatProvider = ({ children }) => {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    // Subscribe to unread count updates for all active sessions
    activeSessions.forEach(session => {
      const channel = ably.channels.get(`chat:session:${session.id}`);

      channel.subscribe('unread_count_update', (msg) => {
        const { userId, unreadCount } = msg.data;

        if (userId === currentUser.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [session.id]: unreadCount
          }));

          // Recalculate total
          const newTotal = Object.values({
            ...unreadCounts,
            [session.id]: unreadCount
          }).reduce((sum, count) => sum + count, 0);

          setTotalUnread(newTotal);
        }
      });
    });

    return () => {
      // Cleanup subscriptions
      activeSessions.forEach(session => {
        const channel = ably.channels.get(`chat:session:${session.id}`);
        channel.unsubscribe('unread_count_update');
      });
    };
  }, [activeSessions]);

  return (
    <ChatContext.Provider value={{ unreadCounts, totalUnread }}>
      {children}
    </ChatContext.Provider>
  );
};
```

---

## 📊 Implementation Details

### Backend Logic

#### 1. Unread Count Calculation

```typescript
// Get unread count for a user in a specific session
const unreadCount = await chatRepository.getUnreadMessageCount(
  sessionId,
  userId,
);

// SQL equivalent:
// SELECT COUNT(*) FROM chat_messages
// WHERE session_id = ? AND sender_id != ? AND is_read = false
```

#### 2. Bulk Unread Counts

```typescript
// Get unread counts for all user's sessions efficiently
const unreadCounts = await chatRepository.getUnreadMessageCountsForUser(
  userId,
  role,
);

// Uses a single query with GROUP BY for performance
```

#### 3. Real-time Updates

```typescript
// When a message is sent:
1. Save message to database
2. Publish message via Ably
3. Calculate unread count for recipient
4. Publish unread count update via Ably

// When messages are marked as read:
1. Update database (set is_read = true)
2. Publish unread count update (count = 0) via Ably
```

---

## 🔒 Security & Validation

### Access Control

- ✅ **Session Participation**: Only session participants can get unread counts
- ✅ **User Isolation**: Users only see their own unread counts
- ✅ **JWT Authentication**: All endpoints require valid authentication

### Performance Optimizations

- ✅ **Efficient Queries**: Bulk queries for multiple sessions
- ✅ **Database Indexes**: Existing indexes on `session_id`, `sender_id`, `is_read`
- ✅ **Real-time Updates**: Minimal database queries via WebSocket events

---

## 🧪 Testing Scenarios

### Manual Testing

1. **Send Message**: Verify recipient's unread count increases
2. **Mark as Read**: Verify unread count resets to 0
3. **Multiple Sessions**: Verify total count aggregates correctly
4. **Real-time Updates**: Verify WebSocket events work instantly
5. **Session Switching**: Verify counts update when switching between sessions

### Automated Testing

```typescript
describe('Unread Message Counts', () => {
  it('should increase unread count when message is sent', async () => {
    // Send message from user A to user B
    // Check user B's unread count increased
  });

  it('should reset unread count when messages are marked as read', async () => {
    // Mark messages as read
    // Check unread count is 0
  });

  it('should publish real-time updates via Ably', async () => {
    // Mock Ably service
    // Verify publishUnreadCountUpdate is called
  });
});
```

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Push Notifications**: Trigger push notifications based on unread counts
2. **Unread Message Highlights**: Highlight specific unread messages
3. **Read Receipts**: Show read status for individual messages
4. **Typing Indicators**: Enhanced with unread count context
5. **Message Priority**: Different unread counts for urgent messages
6. **Bulk Mark as Read**: Mark all messages across sessions as read
7. **Unread Count Persistence**: Cache unread counts for offline scenarios

---

## 📋 Deployment Checklist

### Backend

- [ ] Repository methods implemented and tested
- [ ] Service methods implemented and tested
- [ ] Controller endpoints implemented and tested
- [ ] Ably integration tested
- [ ] Database indexes verified
- [ ] Error handling implemented

### Frontend

- [ ] Unread count display implemented
- [ ] Real-time updates subscription implemented
- [ ] Total count badge implemented
- [ ] Mark as read functionality implemented
- [ ] Session list with counts implemented
- [ ] WebSocket event handling tested

### Testing

- [ ] Unit tests for repository methods
- [ ] Integration tests for service methods
- [ ] End-to-end tests for real-time updates
- [ ] Performance tests for bulk operations
- [ ] Security tests for access control

---

This implementation provides a robust, real-time unread message count system that enhances user experience by providing clear indicators of new messages across all chat sessions.
