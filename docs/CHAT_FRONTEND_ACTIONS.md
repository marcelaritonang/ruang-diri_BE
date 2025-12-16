# 🧑‍💻 Frontend Actions for Counseling Chat Integration

This document summarizes **what the frontend must do** to integrate with the new counseling chat system, based on the backend chat service implementation and business rules.

---

## 1. Booking a Counseling Chat Session

- **Action:** Use the counseling booking API (`/counselings/book`) with `method: "chat"` t## 6. Automated Messages & Session Events

- **Frontend must handle:**
  - Automated system messages (10 min before, at start, 5 min before end, at end)
  - Session status events: `chat_enabled`, `ending_soon`, `completed`
  - **Unread count updates**: Real-time unread message count changes
  - Update UI accordingly (enable/disable input, show warnings, update badges, etc.)

---

## 7. Unread Message Count Management

### 7.1 Display Unread Counts

**Individual Session Unread Count:**

```typescript
// Get unread count for specific session
const response = await fetch(
  `/api/v1/chat/sessions/${sessionId}/unread-count`,
  {
    headers: { Authorization: `Bearer ${token}` },
  },
);
const { data } = await response.json();
console.log(data.unreadCount); // e.g., 5
```

**Total Unread Count Across All Sessions:**

```typescript
// Get total unread count for app badge
const response = await fetch('/api/v1/chat/unread-count/total', {
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await response.json();
console.log(data.totalUnread); // e.g., 12
console.log(data.sessionUnreadCounts); // Object with per-session counts
```

**Active Sessions with Unread Counts:**

```typescript
// Active sessions now include unreadCount property
const response = await fetch('/api/v1/chat/sessions/active');
const { data: sessions } = await response.json();

sessions.forEach((session) => {
  console.log(
    `Session ${session.id} has ${session.unreadCount} unread messages`,
  );
});
```

### 7.2 Real-time Unread Count Updates

**Subscribe to Unread Count Changes:**

```typescript
// Subscribe to unread count updates
messageChannel.subscribe('unread_count_update', (msg) => {
  const { userId, unreadCount, timestamp } = msg.data;

  // Update unread count in UI if it's for current user
  if (userId === currentUser.id) {
    updateUnreadBadge(unreadCount);
    updateSessionUnreadCount(sessionId, unreadCount);
  }
});
```

**Complete Real-time Integration:**

```typescript
const ChatComponent = ({ sessionId }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Get initial unread count
    fetchUnreadCount(sessionId).then(count => {
      setUnreadCount(count);
    });

    // Subscribe to real-time updates
    const channel = ably.channels.get(`chat:session:${sessionId}`);

    channel.subscribe('unread_count_update', (msg) => {
      const { userId, unreadCount: newCount } = msg.data;
      if (userId === currentUser.id) {
        setUnreadCount(newCount);
      }
    });

    return () => {
      channel.unsubscribe('unread_count_update');
    };
  }, [sessionId]);

  // Mark messages as read when user views the chat
  const markAsRead = async () => {
    await fetch(`/api/v1/chat/sessions/${sessionId}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Unread count will be updated via WebSocket (should become 0)
  };

  return (
    <div>
      {unreadCount > 0 && (
        <div className="unread-badge">{unreadCount}</div>
      )}
      {/* Chat messages and input */}
    </div>
  );
};
```

### 7.3 UI Components for Unread Indicators

**Session List with Unread Badges:**

```typescript
function SessionListItem({ session }) {
  return (
    <div className="session-item">
      <div className="session-info">
        <img src={session.psychologist.profilePicture} />
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

**App Navigation with Total Count:**

```typescript
function AppNavigation({ totalUnreadCount }) {
  return (
    <nav>
      <div className="nav-item">
        <span>Chat</span>
        {totalUnreadCount > 0 && (
          <span className="total-unread-badge">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </div>
    </nav>
  );
}
```

---

## 8. Marking Messages as Read counseling chat session.

- **Do NOT** call any direct chat session creation endpoint for counseling (e.g., `/chat/sessions/counseling`).
- **After booking:** Extract the `sessionId` from the response for chat usage.

---

## 2. Connecting to a Chat Session

- **Action:**
  - Use the `sessionId` from the booking response or from the user's active sessions list.
  - Call `/chat/ably-token?sessionId=...` to get a real-time Ably token and channel info.
  - Connect to Ably using the provided token and channel names.

---

## 3. Chat Access Control

- **Before session start:**
  - Chat is **disabled** (`isChatEnabled: false`).
  - Show a waiting message: "Chat will be enabled when your session starts."
  - Do NOT allow sending messages or typing indicators.
- **When session starts:**
  - Backend will enable chat (`isChatEnabled: true`) and send an automated welcome message.
  - Enable chat input and allow sending messages.
- **When session is ending:**
  - Show a warning and an "End Session" button 5 minutes before scheduled end.
- **When session ends:**
  - Chat is disabled again. Show a summary or "Session Ended" message.

---

## 4. Real-time Messaging

- **Action:**
  - Use `/chat/messages` to send text messages (requires `sessionId`).
  - Use `/chat/messages/upload` to send file/image messages (requires `sessionId` and file).
  - Listen for incoming messages and session status events via Ably.
  - Implement typing indicators using the `typing` Ably channel.

---

## 5. File and Image Upload

### 5.1 Supported File Types

- **Images:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
- **Documents:** `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`
- **Other files:** As configured in the backend multer settings

### 5.2 File Size Limits

- **Maximum file size:** Check backend configuration (typically 10MB)
- **Frontend should validate** file size before upload to provide immediate feedback

### 5.3 Upload Implementation

**API Endpoint:** `POST /chat/messages/upload`

**Request Format:** `multipart/form-data`

**Required Fields:**

- `file`: The actual file to upload
- `sessionId`: UUID of the chat session
- `messageType`: Either `"image"` or `"file"`
- `message`: Optional caption/description (max 500 characters)

**Example Implementation:**

```typescript
// File upload function
async function uploadFile(file: File, sessionId: string, caption?: string) {
  const formData = new FormData();

  // Determine message type based on file type
  const messageType = file.type.startsWith('image/') ? 'image' : 'file';

  formData.append('file', file);
  formData.append('sessionId', sessionId);
  formData.append('messageType', messageType);
  if (caption) {
    formData.append('message', caption);
  }

  const response = await fetch('/api/v1/chat/messages/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type header, let browser set it with boundary
    },
    body: formData,
  });

  return await response.json();
}

// Usage example
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const file = fileInput.files[0];
const caption = 'Here is the document you requested';

if (file) {
  try {
    const result = await uploadFile(file, sessionId, caption);
    console.log('File uploaded successfully:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### 5.4 File Validation (Frontend)

**Before uploading, validate:**

```typescript
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (example: 10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  // Check file type
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported' };
  }

  return { valid: true };
}
```

### 5.5 Handling File Messages

**When receiving file messages via Ably:**

```typescript
messageChannel.subscribe('message', (msg) => {
  const {
    messageType,
    content,
    attachmentUrl,
    attachmentType,
    attachmentName,
  } = msg.data;

  if (messageType === 'image') {
    // Display image preview
    displayImageMessage(content, attachmentUrl, attachmentName);
  } else if (messageType === 'file') {
    // Display file download link
    displayFileMessage(content, attachmentUrl, attachmentName, attachmentType);
  } else {
    // Regular text message
    displayTextMessage(content);
  }
});

function displayImageMessage(
  caption: string,
  imageUrl: string,
  fileName: string,
) {
  // Create image element with preview
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = fileName;
  img.style.maxWidth = '300px';
  img.style.borderRadius = '8px';

  // Add caption if provided
  const messageDiv = document.createElement('div');
  if (caption && caption !== fileName) {
    const captionDiv = document.createElement('div');
    captionDiv.textContent = caption;
    messageDiv.appendChild(captionDiv);
  }
  messageDiv.appendChild(img);

  // Add to chat
  addMessageToChat(messageDiv);
}

function displayFileMessage(
  caption: string,
  fileUrl: string,
  fileName: string,
  fileType: string,
) {
  const messageDiv = document.createElement('div');

  // File icon and name
  const fileLink = document.createElement('a');
  fileLink.href = fileUrl;
  fileLink.download = fileName;
  fileLink.textContent = fileName;
  fileLink.style.textDecoration = 'none';
  fileLink.style.color = '#007bff';

  messageDiv.appendChild(fileLink);

  // Add caption if provided and different from filename
  if (caption && caption !== fileName) {
    const captionDiv = document.createElement('div');
    captionDiv.textContent = caption;
    messageDiv.appendChild(captionDiv);
  }

  // Add to chat
  addMessageToChat(messageDiv);
}
```

### 5.6 Upload Progress and Error Handling

```typescript
async function uploadFileWithProgress(
  file: File,
  sessionId: string,
  caption?: string,
  onProgress?: (percent: number) => void,
) {
  const formData = new FormData();
  const messageType = file.type.startsWith('image/') ? 'image' : 'file';

  formData.append('file', file);
  formData.append('sessionId', sessionId);
  formData.append('messageType', messageType);
  if (caption) {
    formData.append('message', caption);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });

    xhr.open('POST', '/api/v1/chat/messages/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
```

### 5.7 UI Components for File Upload

**File Upload Button:**

```html
<div class="file-upload-container">
  <input
    type="file"
    id="file-input"
    accept="image/*,.pdf,.doc,.docx,.txt"
    style="display: none;"
  />
  <button onclick="document.getElementById('file-input').click()">
    📎 Attach File
  </button>
  <button
    onclick="document.getElementById('file-input').accept='image/*'; document.getElementById('file-input').click()"
  >
    📷 Send Image
  </button>
</div>

<div id="upload-progress" style="display: none;">
  <div class="progress-bar">
    <div
      id="progress-fill"
      style="width: 0%; background: #007bff; height: 4px;"
    ></div>
  </div>
  <span id="progress-text">Uploading...</span>
</div>
```

**File Preview Before Send:**

```typescript
function previewFile(file: File) {
  const previewDiv = document.createElement('div');
  previewDiv.className = 'file-preview';

  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = '200px';
    img.style.maxHeight = '200px';
    previewDiv.appendChild(img);
  } else {
    const fileInfo = document.createElement('div');
    fileInfo.innerHTML = `
      <div>📄 ${file.name}</div>
      <div>${(file.size / 1024 / 1024).toFixed(2)} MB</div>
    `;
    previewDiv.appendChild(fileInfo);
  }

  // Add caption input
  const captionInput = document.createElement('input');
  captionInput.type = 'text';
  captionInput.placeholder = 'Add a caption (optional)';
  captionInput.maxLength = 500;
  previewDiv.appendChild(captionInput);

  // Add send/cancel buttons
  const buttonDiv = document.createElement('div');
  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.onclick = () => sendFileMessage(file, captionInput.value);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => previewDiv.remove();

  buttonDiv.appendChild(sendBtn);
  buttonDiv.appendChild(cancelBtn);
  previewDiv.appendChild(buttonDiv);

  // Add to chat input area
  document.getElementById('chat-input-area').appendChild(previewDiv);
}
```

---

## 6. Automated Messages & Session Events

- **Frontend must handle:**
  - Automated system messages (10 min before, at start, 5 min before end, at end)
  - Session status events: `chat_enabled`, `ending_soon`, `completed`
  - Update UI accordingly (enable/disable input, show warnings, etc.)

---

## 8. Marking Messages as Read

- **Action:**
  - Call `/chat/sessions/:sessionId/read` when the user views the chat to mark messages as read.
  - **Real-time update**: Unread count will automatically update to 0 via WebSocket

---

## 9. Error Handling

- **Handle these scenarios:**
  - Chat not enabled yet (show waiting message)
  - Session not found (redirect or show error)
  - Session ended (show summary, disable chat)
  - Connection lost (show reconnecting indicator)
  - File upload errors (file too large, unsupported format, network issues)
  - File download errors (file not found, access denied)

---

## 8. Session Management

- **Action:**
  - Use `/chat/sessions/active` to get the user's current active chat sessions.
  - Use `/counselings/user-sessions` to get all counseling sessions (with chat info).

---

## 9. Mobile & Offline Considerations

- **Action:**
  - Disconnect Ably when app goes to background, reconnect on foreground.
  - Show offline indicator and queue messages if needed.
  - Handle file uploads on poor network connections with retry mechanisms.
  - Cache downloaded files for offline viewing.

---

## 10. UI/UX Requirements

- **Show:**
  - Waiting state before session starts
  - Automated/system messages
  - Typing indicators
  - Session ending warning and "End Session" button
  - Session ended state
  - File upload progress
  - Image previews and file download links
  - File upload errors and validation messages
- **Disable:**
  - Chat input when not allowed
  - File upload when session is not active

---

## 11. Testing Checklist

- Booking flow creates chat session
- Chat is disabled before session starts
- Automated messages appear at correct times
- Chat is enabled at session start
- Real-time messaging works
- **File upload functionality:**
  - Image uploads work correctly
  - Document uploads work correctly
  - File size validation works
  - File type validation works
  - Upload progress is shown
  - Upload errors are handled gracefully
  - Uploaded files are displayed correctly in chat
  - File downloads work correctly
- Session ending and ended states are handled
- Error scenarios are handled gracefully

---

## 12. Subscribing to Ably Events (Real-time Updates)

- **How to subscribe:**

  1. **Get Ably token and channel info:**
     - Call `/chat/ably-token?sessionId=...` to get the Ably token, chat channel name, and typing channel name from the backend.
  2. **Initialize Ably client:**

     ```typescript
     import Ably from 'ably';

     // Get token from backend
     const response = await fetch('/api/v1/chat/ably-token?sessionId=...');
     const { data } = await response.json();

     const ably = new Ably.Realtime({
       authCallback: (tokenParams, callback) => {
         // Pass the complete token object from backend response
         callback(null, data.token);
       },
       // Alternative: Direct token auth (if you want to handle refresh manually)
       // token: data.token,
     });

     // Store channel names for easy access
     const chatChannel = data.channels.chat;
     const typingChannel = data.channels.typing;
     ```

  3. **Subscribe to channels:**

     ```typescript
     // Main chat channel for messages and session events
     const messageChannel = ably.channels.get(chatChannelName);
     messageChannel.subscribe('message', (msg) => {
       /* handle chat message */
     });
     messageChannel.subscribe('session_status', (statusMsg) => {
       /* handle session events */
     });

     // Typing channel for typing indicators
     const typingChannel = ably.channels.get(typingChannelName);
     typingChannel.subscribe('typing', (typingMsg) => {
       /* handle typing indicator */
     });

     // Unread count updates
     messageChannel.subscribe('unread_count_update', (unreadMsg) => {
       /* handle unread count update */
     });
     ```

  4. **Handle connection state:**
     ```typescript
     ably.connection.on('connected', () => {
       /* update UI */
     });
     ably.connection.on('disconnected', () => {
       /* update UI */
     });
     ably.connection.on('failed', (error) => {
       /* handle error */
     });
     ```
  5. **Cleanup:**
     - Unsubscribe and close Ably when leaving the chat or unmounting the component.
     ```typescript
     messageChannel.unsubscribe();
     typingChannel.unsubscribe();
     ably.close();
     ```

- **What to listen for:**

  - `message`: New chat messages.
  - `session_status`: Session state changes (`chat_enabled`, `ending_soon`, `completed`, etc.).
  - `typing`: Typing indicators from other users.
  - `unread_count_update`: Updates to unread message counts for the user.

- **Why:**
  - This enables instant, real-time updates for chat and session state, without polling.
  - The backend pushes all relevant events to the frontend via Ably.

---

## 13. Sending Typing Indicators

- **Action:**

  - When the user starts or stops typing in the chat input, call the backend endpoint:
    - `POST /chat/typing`
    - Body: `{ sessionId: string, isTyping: boolean }`
  - The backend will broadcast the typing event to all participants in the session via Ably.
  - The frontend should still subscribe to the Ably typing channel to receive typing indicators from other users.

- **Example:**

  ```typescript
  // When user types:
  await fetch('/api/v1/chat/typing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ...`,
    },
    body: JSON.stringify({ sessionId, isTyping: true }),
  });

  // When user stops typing:
  await fetch('/api/v1/chat/typing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ...`,
    },
    body: JSON.stringify({ sessionId, isTyping: false }),
  });
  ```

- **Why:**
  - This ensures all typing indicators are sent through the backend and broadcast to all clients in real time.
  - The backend validates the user and session, and publishes the event to Ably.

---

**Summary:**

- The frontend must strictly follow the session lifecycle and access control enforced by the backend.
- All chat access, state, and messaging is controlled by the backend and communicated via API and Ably events.
- **File upload functionality** is now fully supported for both images and documents with proper validation and error handling.
- **Real-time file sharing** is enabled through the same Ably channels used for text messages.
- Do NOT allow users to bypass or create chat sessions outside the counseling booking flow.
- Always update the UI based on session state and backend events.
- Validate file uploads on the frontend before sending to provide immediate user feedback.
- Handle file upload progress and errors gracefully to ensure a smooth user experience.
