# 🔍 Chat Search Feature Documentation

This document outlines the search functionality implemented for chat histories, allowing users to search through their chat sessions by content and participant names.

---

## 🚀 Features

### Search Capabilities

- **Message Content Search**: Search within chat message text
- **File Name Search**: Search in attachment/file names
- **Participant Name Search**: Search by client or psychologist names
- **Sender Name Search**: Search by message sender names
- **Case-Insensitive**: All searches are case-insensitive
- **Partial Matching**: Uses LIKE pattern matching for flexible search

### Pagination Support

- **Limit**: Maximum number of results per page (1-50, default: 20)
- **Page**: Page number to retrieve (starts from 1, default: 1)
- **Total Count**: Returns total number of matching results
- **Total Pages**: Returns total number of pages available

---

## 📝 API Endpoints

### 1. Search Chat Histories (Dedicated Endpoint)

**GET** `/api/v1/chat/histories/search`

**Query Parameters:**

```typescript
{
  search?: string,    // Search query (optional)
  limit?: number,     // Results per page (1-50, default: 20)
  page?: number       // Page number (starts from 1, default: 1)
}
```

**Example Request:**

```bash
GET /api/v1/chat/histories/search?search=anxiety&limit=10&page=1
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Chat histories searched successfully",
  "data": {
    "data": [
      {
        "sessionId": "session-uuid",
        "clientId": "client-uuid",
        "psychologistId": "psychologist-uuid",
        "status": "completed",
        "isActive": false,
        "createdAt": "2025-08-19T10:00:00.000Z",
        "updatedAt": "2025-08-19T11:00:00.000Z",
        "unreadCount": 0,
        "client": {
          "id": "client-uuid",
          "fullName": "John Doe",
          "profilePicture": "profile-url"
        },
        "psychologist": {
          "id": "psychologist-uuid",
          "fullName": "Dr. Smith",
          "profilePicture": "profile-url"
        },
        "lastMessage": {
          "id": "message-uuid",
          "message": "I'm feeling anxious about the upcoming exam",
          "messageType": "text",
          "createdAt": "2025-08-19T10:45:00.000Z",
          "senderId": "client-uuid",
          "senderFullName": "John Doe",
          "senderProfilePicture": "profile-url"
        }
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

### 2. Get Chat Histories (With Optional Search)

**GET** `/api/v1/chat/histories`

**Query Parameters:**

```typescript
{
  search?: string,    // Optional search query
  limit?: number,     // Results per page (1-50, default: 20)
  page?: number       // Page number (starts from 1, default: 1)
}
```

**Behavior:**

- If `search` parameter is provided, performs search functionality
- If no `search` parameter, returns all chat histories for the user
- Maintains backward compatibility with existing implementations

---

## 🔍 Search Logic

### Search Fields

The search functionality searches across multiple fields:

1. **Chat Message Content** (`chat_messages.message`)
2. **Attachment Names** (`chat_messages.attachment_name`)
3. **Client Full Name** (`users.full_name` where user is client)
4. **Psychologist Full Name** (`users.full_name` where user is psychologist)
5. **Message Sender Name** (`users.full_name` where user sent the message)

### Search Implementation

```sql
-- Example SQL search logic
WHERE (
  LOWER(chat_messages.message) LIKE '%search_term%' OR
  LOWER(chat_messages.attachment_name) LIKE '%search_term%' OR
  LOWER(client_user.full_name) LIKE '%search_term%' OR
  LOWER(psychologist_user.full_name) LIKE '%search_term%' OR
  LOWER(message_sender.full_name) LIKE '%search_term%'
)
```

### Security & Access Control

- Users can only search their own chat sessions
- Filters by sessions where user is either client or psychologist
- Maintains all existing authentication and authorization rules

---

## 💻 Frontend Integration

### React/TypeScript Example

```typescript
interface ChatSearchParams {
  search?: string;
  limit?: number;
  page?: number;
}

interface ChatSearchResponse {
  data: ChatSession[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Search function
async function searchChatHistories(
  params: ChatSearchParams,
  token: string,
): Promise<ChatSearchResponse> {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.page) queryParams.append('page', params.page.toString());

  const response = await fetch(`/api/v1/chat/histories/search?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();
  return result.data;
}

// Usage example
const searchResults = await searchChatHistories(
  {
    search: 'anxiety',
    limit: 10,
    page: 1,
  },
  authToken,
);

console.log(`Found ${searchResults.pagination.total} results`);
searchResults.data.forEach((session) => {
  console.log(
    `Session with ${session.client.fullName}: ${session.lastMessage?.message}`,
  );
});
```

### Search Component Example

```tsx
import React, { useState, useEffect } from 'react';

interface ChatSearchProps {
  onResultsChange: (results: ChatSession[]) => void;
}

const ChatSearch: React.FC<ChatSearchProps> = ({ onResultsChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ChatSession[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 0,
  });

  const performSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      setResults([]);
      onResultsChange([]);
      return;
    }

    setLoading(true);
    try {
      const response = await searchChatHistories(
        {
          search: query,
          limit: 20,
          page,
        },
        authToken,
      );

      setResults(page === 1 ? response.data : [...results, ...response.data]);
      setPagination({
        total: response.pagination.total,
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
      });

      onResultsChange(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMore = () => {
    if (pagination.page < pagination.totalPages && !loading) {
      performSearch(searchQuery, pagination.page + 1);
    }
  };

  return (
    <div className="chat-search">
      <input
        type="text"
        placeholder="Search chats, messages, or participants..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />

      {loading && <div className="loading">Searching...</div>}

      {results.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            Found {pagination.total} result(s)
          </div>

          {results.map((session) => (
            <div key={session.sessionId} className="search-result-item">
              <div className="participant-info">
                <strong>
                  {session.client.fullName} ↔ {session.psychologist.fullName}
                </strong>
                {session.unreadCount > 0 && (
                  <span className="unread-badge">{session.unreadCount}</span>
                )}
              </div>

              {session.lastMessage && (
                <div className="last-message">
                  <span className="sender">
                    {session.lastMessage.senderFullName}:
                  </span>
                  <span className="content">{session.lastMessage.message}</span>
                  <span className="timestamp">
                    {new Date(
                      session.lastMessage.createdAt,
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ))}

          {pagination.hasNext && (
            <button onClick={loadMore} disabled={loading}>
              Load More
            </button>
          )}
        </div>
      )}

      {searchQuery && results.length === 0 && !loading && (
        <div className="no-results">
          No chat sessions found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};
```

---

## 🧪 Testing

### Backend Tests

1. **Search by message content**: Verify messages containing search terms are returned
2. **Search by participant names**: Verify sessions with matching client/psychologist names
3. **Search by file names**: Verify sessions with matching attachment names
4. **Case insensitive search**: Verify search works regardless of case
5. **Pagination**: Verify page, limit, and total count work correctly
6. **Access control**: Verify users only see their own sessions
7. **Empty search**: Verify appropriate behavior with empty search terms

### Frontend Tests

1. **Debounced search**: Verify search waits for user to stop typing
2. **Loading states**: Verify loading indicators during search
3. **Pagination**: Verify load more functionality
4. **Empty results**: Verify appropriate empty state messaging
5. **Error handling**: Verify graceful error handling

### Test Cases

```bash
# Test search by message content
GET /api/v1/chat/histories/search?search=anxiety

# Test search by participant name
GET /api/v1/chat/histories/search?search=Dr.%20Smith

# Test search by file name
GET /api/v1/chat/histories/search?search=document.pdf

# Test pagination
GET /api/v1/chat/histories/search?search=therapy&limit=5&page=1
GET /api/v1/chat/histories/search?search=therapy&limit=5&page=2

# Test case insensitive
GET /api/v1/chat/histories/search?search=ANXIETY
GET /api/v1/chat/histories/search?search=anxiety
```

---

## 🔧 Performance Considerations

### Database Optimization

- **Indexes**: Consider adding indexes on frequently searched columns
- **Full-Text Search**: For production, consider implementing PostgreSQL full-text search
- **Query Optimization**: Current implementation uses LIKE queries which may be slow on large datasets

### Suggested Improvements for Production

1. **Full-Text Search**: Implement PostgreSQL's full-text search capabilities
2. **Search Indexes**: Add GIN indexes for better text search performance
3. **Caching**: Cache frequently searched terms and results
4. **Rate Limiting**: Implement rate limiting for search endpoints

### Example Index Creation

```sql
-- Add indexes for better search performance
CREATE INDEX idx_chat_messages_message_search ON chat_messages USING gin(to_tsvector('english', message));
CREATE INDEX idx_users_fullname_search ON users USING gin(to_tsvector('english', full_name));
CREATE INDEX idx_chat_messages_attachment_name_search ON chat_messages USING gin(to_tsvector('english', attachment_name));
```

---

## 📋 Summary

The chat search functionality provides comprehensive search capabilities across:

- ✅ **Message content** in all chat sessions
- ✅ **Participant names** (clients and psychologists)
- ✅ **File/attachment names**
- ✅ **Case-insensitive matching**
- ✅ **Pagination support**
- ✅ **Unread count integration**
- ✅ **Real-time frontend integration**

This implementation maintains all existing security and access control measures while providing powerful search capabilities to enhance user experience in finding relevant chat sessions quickly.
