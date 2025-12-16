# 🔄 Chat Flow Documentation

## Overview

The chat system enables real-time communication between psychologists and clients (students/employees) using Ably for real-time messaging. The system supports **scheduled counseling sessions** with automated messaging, session management, secure token-based authentication, and real-time messaging capabilities.

### Key Features

- **Scheduled Counseling Chat**: Users book counseling sessions with chat method
- **Automated Messaging**: System sends automated messages 10 minutes before and at session start
- **Controlled Access**: Chat is disabled until session starts (only Team Ruang Diri can initiate)
- **Auto Session Management**: Sessions end automatically with 5-minute warning
- **Real-time Communication**: Powered by Ably for instant messaging

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Client      │    │   Backend API   │    │   Ably Service  │
│   (Frontend)    │    │    (NestJS)     │    │   (Real-time)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chat Sessions  │    │   PostgreSQL    │    │  Message Queues │
│   Management    │    │    Database     │    │   (BullMQ)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Complete Chat Flow

### 1. 🎯 Counseling Booking with Chat Method

**Actor**: Client (Student/Employee)

1. **Client Action**: Client books a counseling session and selects "chat" as the method
2. **Frontend Request**:

   ```typescript
   POST /api/v1/counselings/book
   Headers: { Authorization: 'Bearer <jwt_token>' }
   Body: {
     method: 'chat',
     date: '2025-08-11',
     startTime: '14:00',
     endTime: '14:30',
     timezone: 'Asia/Jakarta',
     notes: 'Need support with anxiety'
   }
   ```

3. **Backend Processing**:

   - Books the counseling appointment
   - Automatically creates a chat session with status `pending`
   - Schedules automated messaging jobs:
     - Initial message: 10 minutes before session
     - Enable chat: At session start time
     - End button: 5 minutes before session ends
     - Auto-end: At session end time

4. **Response**:
   ```json
   {
     "success": true,
     "data": {
       "id": "counseling-uuid",
       "scheduledAt": "2025-08-11T14:00:00Z",
       "chatSession": {
         "sessionId": "session-uuid",
         "status": "pending",
         "isChatEnabled": false
       }
     },
     "message": "Counseling booked successfully"
   }
   ```

### 2. 🕐 Automated Pre-Session Message (10 minutes before)

**Actor**: System (BullMQ Job)

1. **Automatic Processing**:

   - BullMQ job executes 10 minutes before scheduled time
   - Sends automated message from psychologist to client
   - Chat remains disabled for user input

2. **Automated Message**:

   ```
   "Halo! Saya akan segera memulai sesi konseling kita. Mohon tunggu sebentar, ya! 😊"
   ```

3. **Real-time Delivery**:
   - Message appears in client's chat interface
   - Shows as automated message type
   - Client can see but cannot respond yet

### 3. 🚀 Session Start & Chat Enablement

**Actor**: System (BullMQ Job) - Only Team Ruang Diri can start sessions

1. **Automatic Processing at Session Time**:

   - BullMQ job executes at scheduled session start
   - Sends final automated message
   - **Enables chat for both participants**
   - Updates session status to `active`

2. **Final Automated Message**:

   ```
   "Sesi konseling dimulai! Silakan ceritakan apa yang ingin Anda bagikan hari ini. Saya siap mendengarkan 🤗"
   ```

3. **Chat Activation**:
   - Client can now send messages
   - Psychologist receives notification
   - Both participants can communicate freely

### 4. 💬 Real-time Messaging

**Actor**: Both Client and Psychologist

1. **Send Message**:

   ```typescript
   POST /api/v1/chat/messages
   Headers: { Authorization: "Bearer <jwt_token>" }
   Body: {
     sessionId: "session-uuid",
     message: "Hello, I've been feeling anxious lately...",
     messageType: "text"
   }
   ```

2. **Backend Processing**:

   - Validates user is session participant
   - Validates chat is enabled for the session
   - Saves message to database
   - Publishes message to Ably channel

3. **Real-time Delivery**: Message instantly appears in both participants' chat interfaces

### 5. ⌨️ Typing Indicators

**Real-time Feature**: Shows when someone is typing

- Published to `typing:session:<sessionId>` channel
- Payload: `{ userId, isTyping: true/false, timestamp }`

### 6. ⏰ Session End Warning (5 minutes before end)

**Actor**: System (BullMQ Job)

1. **Automatic Processing**:

   - BullMQ job executes 5 minutes before session end
   - Publishes `ending_soon` status to Ably
   - Frontend shows end session button to both participants

2. **Frontend Response**:
   ```javascript
   // Both participants see end session button
   showEndSessionButton();
   startCountdownTimer(5); // 5 minutes countdown
   ```

### 7. 🏁 Session Termination

**Actor**: Either Client or Psychologist (Manual) or System (Automatic)

#### Manual End:

1. **End Session Request**:

   ```typescript
   PUT / api / v1 / chat / sessions / { sessionId } / end;
   Headers: {
     Authorization: 'Bearer <jwt_token>';
   }
   ```

2. **Backend Processing**:
   - Updates session status to `completed`
   - Sets `ended_at` timestamp
   - Sets `is_active` to `false`
   - Sets `is_chat_enabled` to `false`
   - Removes all scheduled automation jobs
   - Notifies both participants

#### Automatic End:

1. **System Processing**:

   - BullMQ job executes at session end time
   - Sends final automated message
   - Automatically ends the session

2. **Final Automated Message**:
   ```
   "Sesi konseling telah berakhir. Terima kasih telah berbagi dengan saya hari ini. Jaga diri dengan baik ya! 💙"
   ```

### 8. 📚 Chat History

**Retrieve Previous Messages**:

```typescript
GET /api/v1/chat/history?sessionId=<uuid>&page=1&limit=20
Headers: { Authorization: "Bearer <jwt_token>" }
```

## Session States

### Status Flow:

```
pending → active → completed
   ↓         ↓         ↓
   ↓    cancelled     ↓
   ↓         ↓         ↓
   └─────────┴─────────┘
```

### Chat Enabled Flow:

```
false (initial) → false (pre-session) → true (active session) → false (ended)
```

## Automated Job Scheduling

### BullMQ Jobs Created on Counseling Booking:

1. **Initial Message Job**

   - Scheduled: 10 minutes before session
   - Action: Send pre-session automated message
   - Message: "Halo! Saya akan segera memulai sesi konseling kita..."

2. **Enable Chat Job**

   - Scheduled: At session start time
   - Action: Send start message + enable chat
   - Message: "Sesi konseling dimulai! Silakan ceritakan..."

3. **End Button Job**

   - Scheduled: 5 minutes before session end
   - Action: Show end button to participants
   - Frontend: Display countdown and end session button

4. **Auto End Job**
   - Scheduled: At session end time
   - Action: Send final message + end session
   - Message: "Sesi konseling telah berakhir..."

## Business Rules

### Session Management:

- ✅ Only Team Ruang Diri can start chat sessions (via scheduled jobs)
- ✅ Users cannot manually start counseling chat sessions
- ✅ Both users can end sessions manually
- ✅ Sessions auto-end at scheduled time
- ✅ Chat is disabled until session officially starts

### Access Control:

- ✅ 1 active session per client maximum
- ✅ 5 active sessions per psychologist maximum
- ✅ Only session participants can send/receive messages
- ✅ Chat history only accessible to participants

### Automation:

- ✅ All automated messages appear to come from psychologist
- ✅ Automated messages are marked with `is_automated: true`
- ✅ Jobs are cleaned up when sessions end manually
- ✅ Failed jobs are retried with exponential backoff

## Security Features

### 🔒 Authentication & Authorization

- **JWT Required**: All endpoints require valid JWT token
- **Role-Based Access**: Different roles have different permissions
- **Session Participation**: Only session participants can access chat data
- **Counseling Validation**: Chat sessions tied to valid counseling bookings

### 🛡️ Token Security

- **Short-lived Tokens**: Ably tokens expire after 30 minutes
- **Capability-based**: Tokens only allow access to specific channels
- **Client ID Binding**: Tokens are bound to specific user IDs

### 🚫 Rate Limiting & Validation

- **Session Limits**: 1 active session per client, 5 per psychologist
- **Message Validation**: Message length and type validation
- **Participant Validation**: Strict checks for session participation
- **Chat State Validation**: Messages only allowed when chat is enabled

## Error Handling

### Common Error Scenarios:

1. **Chat Disabled**:

   ```json
   {
     "success": false,
     "message": "Chat is not enabled for this session yet",
     "statusCode": 400
   }
   ```

2. **Session Not Found**:

   ```json
   {
     "success": false,
     "message": "Chat session not found",
     "statusCode": 404
   }
   ```

3. **Not Participant**:

   ```json
   {
     "success": false,
     "message": "You are not a participant in this chat session",
     "statusCode": 403
   }
   ```

4. **Session Ended**:
   ```json
   {
     "success": false,
     "message": "Chat session has ended",
     "statusCode": 400
   }
   ```

## Frontend Integration Points

### Key Differences from Standard Chat:

1. **No Manual Session Creation**: Sessions are created through counseling booking
2. **Disabled State Handling**: Chat input disabled until session starts
3. **Automated Message Display**: Special styling for automated messages
4. **Session Countdown**: Show time remaining when end button appears
5. **Status Monitoring**: Listen for session state changes via Ably

### Real-time Event Handling:

```javascript
// Listen for session status changes
channel.subscribe('session-status', (message) => {
  const { status, sessionId } = message.data;

  switch (status) {
    case 'chat_enabled':
      enableChatInput();
      break;
    case 'ending_soon':
      showEndSessionButton();
      startCountdownTimer();
      break;
    case 'completed':
      disableChatInput();
      showSessionEndedMessage();
      break;
  }
});

// Listen for automated messages
channel.subscribe('message', (message) => {
  const { isAutomated, messageType, content } = message.data;

  if (isAutomated) {
    displayAutomatedMessage(content);
  } else {
    displayRegularMessage(content);
  }
});
```
