# Searchable Encryption API Integration Guide

This document provides the server-side API endpoints and integration patterns for the searchable encryption feature.

## API Endpoints

All endpoints use **Zod validation** for request bodies and are versioned under `/v1/`. Authentication is required via JWT Bearer token.

### 1. Upsert Token Hashes

Store or update HMAC token hashes for a message to enable search functionality.

**Endpoint:** `POST /v1/search-index/upsert`

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body (Zod Schema):**

```typescript
{
  messageId: string (UUID), // Required
  sessionId: string (UUID), // Required
  tokenHashes: string[], // Required, array of HMAC hashes
  keyVersion?: number // Optional, defaults to 1, min: 1
}
```

**Example Request:**

```json
{
  "messageId": "123e4567-e89b-12d3-a456-426614174000",
  "sessionId": "123e4567-e89b-12d3-a456-426614174001",
  "tokenHashes": [
    "a1b2c3d4e5f6789abcdef1234567890abcdef1234567890abcdef1234567890",
    "b2c3d4e5f6789a1bcdef01234567890abcdef1234567890abcdef1234567890",
    "c3d4e5f6789a1b2cdef001234567890abcdef1234567890abcdef1234567890"
  ],
  "keyVersion": 1
}
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Token hashes upserted successfully",
  "data": {
    "messageId": "123e4567-e89b-12d3-a456-426614174000",
    "tokenCount": 15
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid UUID format or empty token hashes
- `403 Forbidden` - User does not have access to this session
- `404 Not Found` - Message not found or does not belong to the specified session

### 2. Query Messages by Trapdoors

Search for messages using HMAC trapdoors (query hashes).

**Endpoint:** `POST /v1/search-index/query`

**Request Body (Zod Schema):**

```typescript
{
  trapdoors: string[], // Required, array of HMAC query hashes
  sessionId?: string (UUID), // Optional, limit search to specific session
  keyVersion?: number, // Optional, defaults to 1, min: 1
  limit?: number, // Optional, defaults to 20, min: 1, max: 100
  offset?: number // Optional, defaults to 0, min: 0
}
```

**Example Request:**

```json
{
  "trapdoors": [
    "a1b2c3d4e5f6789abcdef1234567890abcdef1234567890abcdef1234567890",
    "b2c3d4e5f6789a1bcdef01234567890abcdef1234567890abcdef1234567890"
  ],
  "sessionId": "123e4567-e89b-12d3-a456-426614174001",
  "keyVersion": 1,
  "limit": 20,
  "offset": 0
}
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Search completed successfully",
  "data": {
    "messageIds": [
      "123e4567-e89b-12d3-a456-426614174000",
      "123e4567-e89b-12d3-a456-426614174002"
    ],
    "total": 42,
    "hasMore": true
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request parameters or empty trapdoors
- `403 Forbidden` - User does not have access to the specified session

### 3. Remove Token Hashes

Remove all token hashes for a specific message (when message is deleted).

**Endpoint:** `DELETE /v1/search-index/remove`

**Request Body (Zod Schema):**

```typescript
{
  messageId: string(UUID); // Required
}
```

**Example Request:**

```json
{
  "messageId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Token hashes removed successfully",
  "data": {
    "messageId": "123e4567-e89b-12d3-a456-426614174000",
    "removedCount": 15
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid UUID format
- `403 Forbidden` - User does not have access to this message

### 4. Bulk Remove Token Hashes

Remove token hashes for multiple messages at once.

**Endpoint:** `DELETE /v1/search-index/bulk-remove`

**Request Body (Zod Schema):**

```typescript
{
  messageIds: string[] (UUID[]) // Required, array of message UUIDs
}
```

**Example Request:**

```json
{
  "messageIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174002"
  ]
}
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Token hashes bulk removed successfully",
  "data": {
    "processedCount": 5,
    "totalRemoved": 75
  }
}
```

### 5. Update Token Hashes

Update token hashes for a message (when message is edited).

**Endpoint:** `PUT /v1/search-index/update`

**Request Body (Zod Schema):**

```typescript
{
  messageId: string (UUID), // Required
  tokenHashes: string[], // Required, new array of HMAC hashes
  keyVersion?: number // Optional, defaults to 1, min: 1
}
```

**Example Request:**

```json
{
  "messageId": "123e4567-e89b-12d3-a456-426614174000",
  "tokenHashes": [
    "new1hash890abcdef1234567890abcdef1234567890abcdef1234567890",
    "new2hash890abcdef1234567890abcdef1234567890abcdef1234567890",
    "new3hash890abcdef1234567890abcdef1234567890abcdef1234567890"
  ],
  "keyVersion": 1
}
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Token hashes updated successfully",
  "data": {
    "messageId": "123e4567-e89b-12d3-a456-426614174000",
    "previousCount": 12,
    "newCount": 18
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid UUID format or empty token hashes
- `404 Not Found` - Message not found or user does not have access

### 6. Get Search Index Statistics

Retrieve statistics about the search index (admin/debug endpoint).

**Endpoint:** `GET /v1/search-index/stats`

**Success Response:**

```json
{
  "status": "success",
  "message": "Search index statistics retrieved",
  "data": {
    "totalTokenHashes": 15420,
    "uniqueMessages": 1250,
    "uniqueUsers": 85,
    "keyVersions": [1, 2]
  }
}
```

### 7. Cleanup Old Token Hashes

Remove token hashes older than specified days (maintenance endpoint).

**Endpoint:** `DELETE /v1/search-index/cleanup?olderThanDays=90`

**Query Parameters:**

- `olderThanDays` (optional): Number of days, defaults to 90

**Success Response:**

```json
{
  "status": "success",
  "message": "Old token hashes cleaned up successfully",
  "data": {
    "removedCount": 1245,
    "cutoffDate": "2024-06-01T00:00:00.000Z"
  }
}
```

## Integration with Existing Chat Flow

### Sending Messages

The existing chat flow needs to be extended to include search indexing:

```typescript
// In your chat service
async sendMessage(user: any, messageDto: ChatMessageDto): Promise<SuccessResponse> {
  // Existing logic for sending message
  const chatMessage = await this.chatRepository.addMessage({
    sessionId: messageDto.sessionId,
    senderId: user.userId,
    message: messageDto.message, // This is encrypted content
    messageType: messageDto.messageType,
  });

  // Publish to real-time channel
  await this.ablyService.publishMessage(sessionId, {
    senderId: user.userId,
    senderFullname: user.userFullname,
    content: messageDto.message,
    messageType: messageDto.messageType,
    timestamp: chatMessage.createdAt,
    messageId: chatMessage.id,
  });

  // Note: Search indexing is handled by the client
  // The client will call /search-index/upsert after this response

  return new SuccessResponse('Message sent successfully', {
    messageId: chatMessage.id,
    timestamp: chatMessage.createdAt,
  });
}
```

### Message Search Flow

1. **Client initiates search:**

   ```javascript
   // Client-side: User types search query
   const query = 'stress anxiety';
   const results = await messageSearchService.searchMessages(query, sessionId);
   ```

2. **Server returns candidate IDs:**

   ```json
   {
     "messageIds": ["msg1", "msg2", "msg3"],
     "total": 25,
     "hasMore": true
   }
   ```

3. **Client fetches and verifies:**

   ```javascript
   // Client fetches encrypted messages
   const messages = await fetchMessages(results.messageIds);

   // Client decrypts and verifies matches
   const verifiedMessages = messages
     .map((msg) => ({ ...msg, plaintext: decrypt(msg.content) }))
     .filter((msg) => verifyMatch(msg.plaintext, query));
   ```

## Database Schema

The search index uses the following table structure:

```sql
CREATE TABLE message_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_search_user_token_key ON message_search_index(user_id, token_hash, key_version);
CREATE INDEX idx_search_session_user ON message_search_index(session_id, user_id);
CREATE INDEX idx_search_message_id ON message_search_index(message_id);
CREATE INDEX idx_search_user_key_version ON message_search_index(user_id, key_version);
CREATE INDEX idx_search_created_at ON message_search_index(created_at);
CREATE INDEX idx_search_session_token_key ON message_search_index(session_id, token_hash, key_version);
```

## Security Considerations

### Authentication & Authorization

All endpoints require JWT authentication:

```typescript
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchIndexController {
  // ... endpoints
}
```

### Access Control

- Users can only search their own messages
- Session-based access control is enforced
- Message ownership is validated before indexing/removing

### Data Protection

- Server never sees plaintext content
- Only HMAC hashes are stored
- Token hashes are cryptographically secure
- No correlation between hashes and original tokens

## Performance Considerations

### Query Optimization

- Use compound indexes for efficient trapdoor lookups
- Limit result sets to prevent excessive memory usage
- Implement pagination for large result sets

### Scalability

- Token hashes are distributed across multiple indexes
- Bulk operations are supported for efficiency
- Background cleanup prevents table bloat

### Monitoring

- Track search index statistics
- Monitor query performance
- Alert on excessive token hash growth

## Error Handling

### Zod Validation Errors

The API uses Zod for request validation, providing detailed error messages:

```json
// 400 Bad Request - Zod validation error
{
  "statusCode": 400,
  "message": [
    "messageId: Invalid message ID format",
    "tokenHashes: Array must contain at least 1 element(s)",
    "keyVersion: Number must be greater than or equal to 1"
  ],
  "error": "Bad Request"
}
```

### Common Error Responses

```json
// 403 Forbidden
{
  "statusCode": 403,
  "message": "User does not have access to this session",
  "error": "Forbidden"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "Message not found or does not belong to the specified session",
  "error": "Not Found"
}

// 400 Bad Request - Business logic validation
{
  "statusCode": 400,
  "message": "Token hash cannot be empty",
  "error": "Bad Request"
}
```

### Client Error Handling

```javascript
try {
  await messageSearchService.indexMessage(messageId, sessionId, plaintext);
} catch (error) {
  if (error.status === 400) {
    // Handle validation errors
    console.error('Validation failed:', error.response?.data?.message);
  } else if (error.status === 403) {
    // Handle access denied
    console.error('Access denied to session');
  } else if (error.status === 404) {
    // Handle message not found
    console.error('Message not found');
  } else {
    // Handle other errors
    console.error('Indexing failed:', error);
  }
}
```

## Migration Strategy

### For Existing Messages

If you have existing encrypted messages that need to be indexed:

1. **Client-side re-indexing:**

   ```javascript
   // Fetch all user's messages
   const allMessages = await fetchAllUserMessages();

   // Decrypt and index each message
   for (const message of allMessages) {
     const plaintext = await decryptMessage(message.content);
     await messageSearchService.indexMessage(
       message.id,
       message.sessionId,
       plaintext,
     );
   }
   ```

2. **Batch processing:**

   ```javascript
   // Process in batches to avoid overwhelming the server
   const batchSize = 10;
   for (let i = 0; i < allMessages.length; i += batchSize) {
     const batch = allMessages.slice(i, i + batchSize);
     await Promise.allSettled(batch.map((msg) => indexMessage(msg)));

     // Delay between batches
     await new Promise((resolve) => setTimeout(resolve, 1000));
   }
   ```

### Key Rotation

When users change passwords and search keys need to be rotated:

1. **Generate new key version:**

   ```javascript
   const { oldKey, newKey, keyVersion } =
     searchKeyManager.rotateKey(newPassword);
   ```

2. **Re-index with new key:**

   ```javascript
   // Re-index all messages with new key
   await reindexAllMessages(newKey, keyVersion);

   // Clean up old key version after successful migration
   await cleanupOldKeyVersion(keyVersion - 1);
   ```

## Testing

### API Testing

```javascript
describe('Search Index API', () => {
  test('should upsert token hashes', async () => {
    const response = await request(app)
      .post('/api/v1/search-index/upsert')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        messageId: 'test-message-id',
        sessionId: 'test-session-id',
        tokenHashes: ['hash1', 'hash2', 'hash3'],
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });

  test('should query messages by trapdoors', async () => {
    const response = await request(app)
      .post('/api/v1/search-index/query')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        trapdoors: ['hash1', 'hash2'],
        limit: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('messageIds');
  });
});
```

## Deployment Checklist

- [ ] Database migration applied
- [ ] Search index module integrated into chat module
- [ ] API endpoints accessible and authenticated
- [ ] Client-side search implementation complete
- [ ] Error handling implemented
- [ ] Performance monitoring in place
- [ ] Security review completed
- [ ] Migration strategy planned for existing messages

This completes the server-side implementation of the searchable encryption feature. The system provides secure, privacy-preserving search functionality while maintaining the confidentiality of user messages.
