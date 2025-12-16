# 📎 Chat File Upload Implementation Guide

This document provides a comprehensive technical overview of the file upload functionality implemented in the chat system.

---

## 🏗️ Backend Architecture

### Database Schema

**Chat Messages Table** (`chat_messages`)

```sql
-- New columns added for file attachments
attachment_url VARCHAR(500),     -- URL path to the uploaded file
attachment_type VARCHAR(100),    -- MIME type of the file
attachment_name VARCHAR(255),    -- Original filename
attachment_size INTEGER          -- File size in bytes
```

### API Endpoints

#### 1. File Upload Endpoint

- **URL:** `POST /api/v1/chat/messages/upload`
- **Content-Type:** `multipart/form-data`
- **Authentication:** Required (JWT Bearer token)
- **Roles:** `client`, `student`, `employee`, `psychologist`

**Request Body:**

```typescript
{
  file: File,                    // The uploaded file
  sessionId: string,             // UUID of chat session
  messageType: 'image' | 'file', // Type of message
  message?: string               // Optional caption (max 500 chars)
}
```

**Response:**

```typescript
{
  success: true,
  message: "File message sent successfully",
  data: {
    id: string,
    sessionId: string,
    senderId: string,
    message: string,
    messageType: 'image' | 'file',
    attachmentUrl: string,
    attachmentType: string,
    attachmentName: string,
    attachmentSize: number,
    createdAt: Date
  }
}
```

#### 2. Text Message Endpoint (Updated)

- **URL:** `POST /api/v1/chat/messages`
- **Content-Type:** `application/json`
- Now supports `messageType: 'text' | 'image' | 'file'`

### File Storage

- **Storage Location:** `/uploads/chat-attachments/`
- **File Naming:** Uses multer configuration for unique naming
- **URL Generation:** Uses `getImgUrl()` utility for consistent URL paths
- **Access:** Files are served through the application's static file serving

### Security & Validation

**File Type Restrictions:**

- **Images:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
- **Documents:** `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`
- Configured through multer settings

**Size Limits:**

- Maximum file size: 10MB (configurable)
- Enforced by multer configuration

**Access Control:**

- Only session participants can upload files
- Session must be in `active` status
- JWT authentication required

---

## 🔄 Real-time Integration

### Ably Message Publishing

When a file is uploaded, the message is published to the Ably channel with extended metadata:

```typescript
{
  senderId: string,
  content: string,              // Caption or filename
  messageType: 'image' | 'file',
  timestamp: Date,
  attachmentUrl: string,        // NEW: File URL
  attachmentType: string,       // NEW: MIME type
  attachmentName: string        // NEW: Original filename
}
```

### Channel Structure

- **Chat Channel:** `chat:session:{sessionId}` - For file messages
- **Typing Channel:** `typing:session:{sessionId}` - Unchanged

---

## 🗄️ Database Changes

### Migration Applied

```sql
-- Added columns to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN attachment_url VARCHAR(500),
ADD COLUMN attachment_type VARCHAR(100),
ADD COLUMN attachment_name VARCHAR(255),
ADD COLUMN attachment_size INTEGER;
```

### Schema Types Updated

```typescript
// chat-sessions.schema.ts
export type CreateChatMessage = {
  sessionId: string;
  senderId: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'automated' | 'system';
  isAutomated?: boolean;
  attachmentUrl?: string; // NEW
  attachmentType?: string; // NEW
  attachmentName?: string; // NEW
  attachmentSize?: number; // NEW
};
```

---

## 🔧 Service Layer Implementation

### ChatService.sendFileMessage()

```typescript
async sendFileMessage(
  userId: string,
  fileDto: ChatFileUploadDto,
  file: Express.Multer.File,
): Promise<SuccessResponse> {
  // 1. Validate user is session participant
  // 2. Verify session is active
  // 3. Generate file URL using getImgUrl()
  // 4. Save message to database with attachment data
  // 5. Publish to Ably with attachment metadata
  // 6. Return success response
}
```

### Key Features:

- **Validation:** Session participation and status
- **File Processing:** URL generation and metadata extraction
- **Database Storage:** Complete message with attachment info
- **Real-time Publishing:** Extended Ably message format
- **Error Handling:** Comprehensive error responses

---

## 📝 DTO Validation

### ChatFileUploadDto

```typescript
export const chatFileUploadDto = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  message: z.string().max(500, 'Caption too long').optional(),
  messageType: z.enum(['image', 'file']),
});
```

### Updated ChatMessageDto

```typescript
export const chatMessageDto = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  message: z.string().min(1).max(1000).optional(), // Now optional for file messages
  messageType: z.enum(['text', 'image', 'file']).default('text'),
});
```

---

## 🎯 Frontend Integration Points

### 1. File Upload

```typescript
// POST /api/v1/chat/messages/upload
const formData = new FormData();
formData.append('file', file);
formData.append('sessionId', sessionId);
formData.append('messageType', messageType);
formData.append('message', caption); // optional
```

### 2. Message Display

```typescript
// Handle different message types
switch (messageType) {
  case 'image':
    displayImage(attachmentUrl, attachmentName, message);
    break;
  case 'file':
    displayFileLink(attachmentUrl, attachmentName, attachmentType, message);
    break;
  case 'text':
    displayText(message);
    break;
}
```

### 3. Real-time Updates

```typescript
// Ably subscription now includes attachment data
messageChannel.subscribe('message', (msg) => {
  const {
    messageType,
    content,
    attachmentUrl,
    attachmentType,
    attachmentName,
  } = msg.data;
  // Handle file messages with attachment metadata
});
```

---

## 🧪 Testing Scenarios

### Backend Tests

1. **File Upload Success:** Valid file upload with all metadata saved
2. **File Type Validation:** Reject unsupported file types
3. **File Size Validation:** Reject files exceeding size limit
4. **Session Validation:** Reject uploads to inactive sessions
5. **Participant Validation:** Reject uploads from non-participants
6. **Ably Publishing:** Verify message published with attachment data

### Frontend Tests

1. **Upload Progress:** Show progress during file upload
2. **File Preview:** Display file preview before sending
3. **Error Handling:** Handle upload errors gracefully
4. **Message Display:** Correctly display different file types
5. **Download Functionality:** Files can be downloaded successfully
6. **Real-time Updates:** File messages appear instantly

---

## 🔒 Security Considerations

### File Access Control

- Files stored in `/uploads/chat-attachments/`
- Access controlled through application routing
- No direct file system access from external requests

### Validation Layers

1. **Frontend:** File type and size validation for UX
2. **Multer:** Server-side file type and size enforcement
3. **Business Logic:** Session and participant validation
4. **Database:** Schema constraints and data integrity

### Potential Vulnerabilities Addressed

- **File Type Spoofing:** Multer validates actual file content
- **Directory Traversal:** Controlled file naming and location
- **Unauthorized Access:** Session participation validation
- **Resource Exhaustion:** File size limits and storage quotas

---

## 📊 Performance Considerations

### File Storage

- **Local Storage:** Files stored on server filesystem
- **URL Generation:** Optimized path generation using `getImgUrl()`
- **Caching:** Static file serving with appropriate headers

### Database Impact

- **Minimal Schema Changes:** Only 4 additional nullable columns
- **Indexing:** Existing indexes sufficient for queries
- **Query Performance:** No impact on existing message queries

### Network Optimization

- **Progressive Upload:** Frontend can show upload progress
- **Error Recovery:** Failed uploads can be retried
- **Compression:** Consider implementing file compression for large files

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Cloud Storage Integration:** S3/CloudFront for better scalability
2. **Image Optimization:** Automatic image resizing and compression
3. **File Encryption:** End-to-end encryption for sensitive files
4. **Thumbnail Generation:** Automatic thumbnails for images and documents
5. **Virus Scanning:** Integration with antivirus services
6. **File Versioning:** Support for file updates and versions
7. **Bulk Upload:** Support for multiple file uploads
8. **File Categories:** Organized file management with categories

### Migration Considerations

- Current implementation provides solid foundation
- Schema designed to support future enhancements
- API structure allows for backward-compatible additions
- Frontend patterns established for extensibility

---

## 📋 Deployment Checklist

### Backend Deployment

- [ ] Database migration applied (`0037_...sql`)
- [ ] File upload directory permissions set correctly
- [ ] Multer configuration verified
- [ ] Static file serving enabled for `/uploads/chat-attachments/`
- [ ] File size limits configured appropriately

### Frontend Deployment

- [ ] File upload UI components implemented
- [ ] File validation logic added
- [ ] Progress indicators functional
- [ ] Error handling implemented
- [ ] Real-time file message display working
- [ ] Download functionality tested

### Testing Verification

- [ ] End-to-end file upload flow tested
- [ ] All file types supported
- [ ] Error scenarios handled
- [ ] Real-time updates working
- [ ] Performance acceptable under load
- [ ] Security validations effective

---

This implementation provides a robust, secure, and scalable foundation for file sharing in the chat system while maintaining consistency with the existing architecture and real-time messaging patterns.
