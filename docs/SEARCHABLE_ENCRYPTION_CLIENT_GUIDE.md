# Searchable Encryption - Client-Side Implementation Guide

This document provides a comprehensive guide for implementing the client-side components of the searchable encryption feature for chat messages.

## Overview

The searchable encryption system allows users to search through their encrypted messages without the server ever seeing the plaintext content. This is achieved through:

1. **Client-side encryption** of message content for storage
2. **Token-based indexing** using HMAC for searchable terms
3. **Trapdoor-based querying** to find matching messages
4. **Client-side verification** of search results

## Architecture Flow

```
1. Send Message:
   User types "I feel stressed about work"
   ↓
   Client encrypts: AES(message, messageKey) → ciphertext
   ↓
   Client tokenizes: ["feel", "stressed", "work", "fee", "eel", "str", ...]
   ↓
   Client generates hashes: HMAC(SK, token + salt) → tokenHashes[]
   ↓
   POST /chat/messages (ciphertext)
   POST /search-index/upsert (messageId, sessionId, tokenHashes)

2. Search Messages:
   User searches "stress"
   ↓
   Client tokenizes: ["stress", "str", "tre", "res", "ess"]
   ↓
   Client generates trapdoors: HMAC(SK, token + salt) → trapdoors[]
   ↓
   POST /search-index/query (trapdoors) → messageIds[]
   ↓
   Client fetches and decrypts messages
   ↓
   Client filters false positives
```

## Key Components

### 1. Search Key (SK) Derivation

Each user must derive a consistent Search Key from their account credentials.

```javascript
// Example implementation
import { pbkdf2Sync } from 'crypto';

class SearchKeyManager {
  constructor(userPassword, userId) {
    this.userPassword = userPassword;
    this.userId = userId;
    this.searchKey = null;
  }

  // Derive search key from user credentials
  deriveSearchKey() {
    const salt = `ruang-diri-search-${this.userId}`;

    // Use PBKDF2 to derive a consistent search key
    this.searchKey = pbkdf2Sync(
      this.userPassword,
      salt,
      100000, // iterations
      32, // key length (256 bits)
      'sha256',
    );

    return this.searchKey;
  }

  // Get the current search key
  getSearchKey() {
    if (!this.searchKey) {
      return this.deriveSearchKey();
    }
    return this.searchKey;
  }

  // Handle key rotation (optional)
  rotateKey(newPassword) {
    const oldKey = this.searchKey;
    this.userPassword = newPassword;
    this.searchKey = this.deriveSearchKey();

    return {
      oldKey,
      newKey: this.searchKey,
      keyVersion: Date.now(), // Use timestamp as version
    };
  }
}
```

### 2. Text Tokenization

Transform plaintext into searchable tokens using multiple strategies.

```javascript
class MessageTokenizer {
  constructor() {
    this.stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'shall',
    ]);
  }

  // Extract meaningful words (remove stopwords, punctuation)
  extractWords(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length >= 3) // Minimum word length
      .filter((word) => !this.stopWords.has(word))
      .filter((word) => !/^\d+$/.test(word)); // Remove pure numbers
  }

  // Generate trigrams for partial matching
  generateTrigrams(text) {
    const trigrams = new Set();
    const cleanText = text.toLowerCase().replace(/[^\w]/g, '');

    for (let i = 0; i <= cleanText.length - 3; i++) {
      trigrams.add(cleanText.substring(i, i + 3));
    }

    return Array.from(trigrams);
  }

  // Generate bigrams for better matching
  generateBigrams(text) {
    const bigrams = new Set();
    const words = this.extractWords(text);

    for (const word of words) {
      for (let i = 0; i <= word.length - 2; i++) {
        bigrams.add(word.substring(i, i + 2));
      }
    }

    return Array.from(bigrams);
  }

  // Main tokenization method
  tokenize(plaintext) {
    const words = this.extractWords(plaintext);
    const trigrams = this.generateTrigrams(plaintext);
    const bigrams = this.generateBigrams(plaintext);

    // Combine all tokens and remove duplicates
    const allTokens = new Set([...words, ...trigrams, ...bigrams]);

    // Filter out very short tokens and limit total count
    return Array.from(allTokens)
      .filter((token) => token.length >= 2)
      .slice(0, 100); // Limit to prevent excessive token count
  }
}
```

### 3. HMAC Token Hash Generation

Generate secure, deterministic hashes for each token.

```javascript
import { createHmac } from 'crypto';

class TokenHashGenerator {
  constructor(searchKey, keyVersion = 1) {
    this.searchKey = searchKey;
    this.keyVersion = keyVersion;
  }

  // Generate HMAC hash for a single token
  generateTokenHash(token, salt = '') {
    const hmac = createHmac('sha256', this.searchKey);
    hmac.update(`${token}${salt}${this.keyVersion}`);
    return hmac.digest('hex');
  }

  // Generate hashes for multiple tokens
  generateTokenHashes(tokens, salt = '') {
    return tokens.map((token) => this.generateTokenHash(token, salt));
  }

  // Generate trapdoors (same as token hashes, but used for querying)
  generateTrapdoors(queryTokens, salt = '') {
    return this.generateTokenHashes(queryTokens, salt);
  }
}
```

### 4. Complete Message Indexing Service

Integrate all components for message processing.

```javascript
class MessageSearchService {
  constructor(searchKeyManager) {
    this.searchKeyManager = searchKeyManager;
    this.tokenizer = new MessageTokenizer();
    this.hashGenerator = new TokenHashGenerator(
      searchKeyManager.getSearchKey(),
    );
  }

  // Process message for indexing when sending
  async indexMessage(messageId, sessionId, plaintext) {
    try {
      // Tokenize the plaintext
      const tokens = this.tokenizer.tokenize(plaintext);

      // Generate token hashes
      const tokenHashes = this.hashGenerator.generateTokenHashes(tokens);

      // Send to server
      const response = await fetch('/v1/search-index/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          messageId,
          sessionId,
          tokenHashes,
          keyVersion: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to index message: ${response.statusText}`);
      }

      console.log(
        `Indexed message ${messageId} with ${tokenHashes.length} token hashes`,
      );
      return true;
    } catch (error) {
      console.error('Failed to index message:', error);
      throw error;
    }
  }

  // Search for messages
  async searchMessages(query, sessionId = null, limit = 20, offset = 0) {
    try {
      // Tokenize the search query
      const queryTokens = this.tokenizer.tokenize(query);

      if (queryTokens.length === 0) {
        return { messages: [], total: 0, hasMore: false };
      }

      // Generate trapdoors
      const trapdoors = this.hashGenerator.generateTrapdoors(queryTokens);

      // Query the server
      const response = await fetch('/v1/search-index/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          trapdoors,
          sessionId,
          keyVersion: 1,
          limit,
          offset,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const result = await response.json();
      const { messageIds, total, hasMore } = result.data;

      // Fetch and decrypt the candidate messages
      const messages = await this.fetchAndVerifyMessages(messageIds, query);

      return {
        messages,
        total: messages.length, // Actual count after verification
        hasMore,
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  // Fetch messages and verify they actually match the query
  async fetchAndVerifyMessages(messageIds, originalQuery) {
    if (messageIds.length === 0) return [];

    try {
      // Fetch encrypted messages from chat API
      const messages = await this.fetchMessages(messageIds);

      // Decrypt and verify each message
      const verifiedMessages = [];

      for (const message of messages) {
        // Decrypt the message content
        const plaintext = await this.decryptMessage(message.message);

        // Verify the message actually contains the search terms
        if (this.verifyMatch(plaintext, originalQuery)) {
          verifiedMessages.push({
            ...message,
            decryptedContent: plaintext,
          });
        }
      }

      return verifiedMessages;
    } catch (error) {
      console.error('Failed to fetch and verify messages:', error);
      return [];
    }
  }

  // Verify that decrypted message actually matches the search query
  verifyMatch(plaintext, query) {
    const messageTokens = new Set(this.tokenizer.tokenize(plaintext));
    const queryTokens = this.tokenizer.tokenize(query);

    // Check if any query token is present in the message
    return queryTokens.some((token) => messageTokens.has(token));
  }

  // Remove message from search index when deleted
  async removeMessage(messageId) {
    try {
      const response = await fetch('/v1/search-index/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({ messageId }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to remove message from index: ${response.statusText}`,
        );
      }

      console.log(`Removed message ${messageId} from search index`);
      return true;
    } catch (error) {
      console.error('Failed to remove message from index:', error);
      throw error;
    }
  }

  // Update message index when edited
  async updateMessage(messageId, newPlaintext) {
    try {
      // Tokenize the new content
      const tokens = this.tokenizer.tokenize(newPlaintext);

      // Generate new token hashes
      const tokenHashes = this.hashGenerator.generateTokenHashes(tokens);

      // Update on server
      const response = await fetch('/v1/search-index/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          messageId,
          tokenHashes,
          keyVersion: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update message index: ${response.statusText}`,
        );
      }

      console.log(
        `Updated message ${messageId} index with ${tokenHashes.length} token hashes`,
      );
      return true;
    } catch (error) {
      console.error('Failed to update message index:', error);
      throw error;
    }
  }

  // Helper methods (implement based on your existing encryption system)
  async fetchMessages(messageIds) {
    // Implement: Fetch messages from your chat API
    throw new Error('fetchMessages not implemented');
  }

  async decryptMessage(encryptedContent) {
    // Implement: Decrypt message using your existing decryption logic
    throw new Error('decryptMessage not implemented');
  }

  getAuthToken() {
    // Implement: Get JWT token for API calls
    throw new Error('getAuthToken not implemented');
  }
}
```

### 5. Integration Example

How to integrate with your existing chat system:

```javascript
// Initialize the search service
const searchKeyManager = new SearchKeyManager(userPassword, userId);
const messageSearchService = new MessageSearchService(searchKeyManager);

// When sending a message
async function sendMessage(sessionId, plaintext) {
  try {
    // 1. Encrypt and send the message
    const encryptedMessage = await encryptMessage(plaintext);
    const response = await fetch('/v1/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        sessionId,
        message: encryptedMessage,
        messageType: 'text',
      }),
    });

    const result = await response.json();
    const messageId = result.data.messageId;

    // 2. Index the message for search
    await messageSearchService.indexMessage(messageId, sessionId, plaintext);

    return result;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

// When searching messages
async function searchMessages(query, sessionId = null) {
  try {
    const results = await messageSearchService.searchMessages(query, sessionId);
    return results;
  } catch (error) {
    console.error('Search failed:', error);
    return { messages: [], total: 0, hasMore: false };
  }
}

// When deleting a message
async function deleteMessage(messageId) {
  try {
    // 1. Delete the message
    await fetch(`/v1/chat/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });

    // 2. Remove from search index
    await messageSearchService.removeMessage(messageId);
  } catch (error) {
    console.error('Failed to delete message:', error);
    throw error;
  }
}

// When editing a message
async function editMessage(messageId, newPlaintext) {
  try {
    // 1. Encrypt and update the message
    const encryptedMessage = await encryptMessage(newPlaintext);
    await fetch(`/v1/chat/messages/${messageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ message: encryptedMessage }),
    });

    // 2. Update search index
    await messageSearchService.updateMessage(messageId, newPlaintext);
  } catch (error) {
    console.error('Failed to edit message:', error);
    throw error;
  }
}
```

## Security Considerations

### 1. Key Management

- **Never send the Search Key to the server**
- Store the search key securely in the client (consider using secure storage APIs)
- Implement key rotation when user changes password
- Use strong key derivation (PBKDF2 with high iteration count)

### 2. Token Selection

- Filter out sensitive tokens that might reveal too much information
- Implement stop-word filtering to reduce noise
- Limit the number of tokens per message to prevent excessive leakage

### 3. Query Privacy

- Batch queries when possible to obscure query patterns
- Add dummy queries periodically to obfuscate access patterns
- Consider query result caching to reduce server calls

### 4. Error Handling

- Handle network failures gracefully
- Implement retry logic for failed indexing operations
- Provide fallback search mechanisms

## Performance Optimization

### 1. Caching

```javascript
class SearchCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(query, results) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(query, results);
  }

  get(query) {
    return this.cache.get(query);
  }

  clear() {
    this.cache.clear();
  }
}
```

### 2. Batch Operations

```javascript
// Batch index multiple messages
async function batchIndexMessages(messages) {
  const operations = messages.map((msg) =>
    messageSearchService.indexMessage(msg.id, msg.sessionId, msg.plaintext),
  );

  await Promise.allSettled(operations);
}
```

### 3. Background Indexing

```javascript
// Index messages in the background
class BackgroundIndexer {
  constructor(messageSearchService) {
    this.service = messageSearchService;
    this.queue = [];
    this.processing = false;
  }

  addToQueue(messageId, sessionId, plaintext) {
    this.queue.push({ messageId, sessionId, plaintext });
    this.processQueue();
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 5); // Process 5 at a time

      await Promise.allSettled(
        batch.map((item) =>
          this.service.indexMessage(
            item.messageId,
            item.sessionId,
            item.plaintext,
          ),
        ),
      );

      // Small delay to prevent overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
  }
}
```

## Testing

### 1. Unit Tests

```javascript
// Test tokenization
describe('MessageTokenizer', () => {
  const tokenizer = new MessageTokenizer();

  test('should extract words correctly', () => {
    const tokens = tokenizer.extractWords('I feel stressed about work!');
    expect(tokens).toContain('feel');
    expect(tokens).toContain('stressed');
    expect(tokens).toContain('work');
    expect(tokens).not.toContain('I'); // stopword
  });

  test('should generate trigrams', () => {
    const trigrams = tokenizer.generateTrigrams('stress');
    expect(trigrams).toContain('str');
    expect(trigrams).toContain('tre');
    expect(trigrams).toContain('res');
    expect(trigrams).toContain('ess');
  });
});

// Test HMAC generation
describe('TokenHashGenerator', () => {
  const searchKey = Buffer.from('test-key-32-bytes-long-for-testing');
  const generator = new TokenHashGenerator(searchKey);

  test('should generate consistent hashes', () => {
    const hash1 = generator.generateTokenHash('test');
    const hash2 = generator.generateTokenHash('test');
    expect(hash1).toBe(hash2);
  });

  test('should generate different hashes for different tokens', () => {
    const hash1 = generator.generateTokenHash('test1');
    const hash2 = generator.generateTokenHash('test2');
    expect(hash1).not.toBe(hash2);
  });
});
```

### 2. Integration Tests

```javascript
// Test complete search flow
describe('Message Search Integration', () => {
  let searchService;

  beforeEach(() => {
    const searchKeyManager = new SearchKeyManager('test-password', 'user-123');
    searchService = new MessageSearchService(searchKeyManager);
  });

  test('should index and search messages', async () => {
    // Mock API responses
    fetchMock.mockResponses(
      [JSON.stringify({ status: 'success' }), { status: 200 }], // upsert
      [
        JSON.stringify({
          status: 'success',
          data: { messageIds: ['msg-1'], total: 1, hasMore: false },
        }),
        { status: 200 },
      ], // query
    );

    // Index a message
    await searchService.indexMessage('msg-1', 'session-1', 'I feel stressed');

    // Search for it
    const results = await searchService.searchMessages('stress');

    expect(results.total).toBeGreaterThan(0);
  });
});
```
