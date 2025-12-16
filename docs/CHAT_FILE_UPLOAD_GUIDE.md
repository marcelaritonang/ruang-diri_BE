# Chat File Upload Feature Guide

## Overview

The chat system now supports file and image uploads during chat sessions. This feature allows users to share images and files as part of their conversation.

## Features

- **Image Upload**: Support for image files (JPG, PNG, GIF, etc.)
- **File Upload**: Support for general files (PDF, DOC, TXT, etc.)
- **File Metadata**: Stores file name, size, type, and URL
- **Real-time Delivery**: Files are delivered via Ably WebSocket with metadata
- **Security**: File validation and role-based access control

## Database Schema

### Chat Messages Table

The `chat_messages` table has been extended with the following fields:

```sql
-- File attachment fields
attachmentUrl: varchar(500)        -- URL to the uploaded file
attachmentType: varchar(100)       -- MIME type (e.g., 'image/jpeg', 'application/pdf')
attachmentName: varchar(255)       -- Original filename
attachmentSize: integer            -- File size in bytes
```

## API Endpoints

### Send File Message

**POST** `/api/v1/chat/messages/upload`

Send a file or image message in a chat session.

#### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

#### Form Data

- `file` (file, required): The file to upload
- `sessionId` (string, required): UUID of the chat session
- `messageType` (string, required): Either "image" or "file"
- `message` (string, optional): Caption or description (max 500 characters)

#### Example Request

```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('sessionId', 'session-uuid-here');
formData.append('messageType', 'image');
formData.append('message', 'Check out this image!');

const response = await fetch('/api/v1/chat/messages/upload', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + token,
  },
  body: formData,
});
```

#### Response

```json
{
  "success": true,
  "message": "File message sent successfully",
  "data": {
    "id": "message-uuid",
    "sessionId": "session-uuid",
    "senderId": "user-uuid",
    "message": "Check out this image!",
    "messageType": "image",
    "attachmentUrl": "https://your-domain.com/uploads/chat-attachments/filename.jpg",
    "attachmentType": "image/jpeg",
    "attachmentName": "original-filename.jpg",
    "attachmentSize": 1234567,
    "createdAt": "2025-08-19T10:30:00.000Z"
  }
}
```

## WebSocket Messages

### File Message Structure

When a file message is sent, all session participants receive a WebSocket message via Ably:

```json
{
  "senderId": "user-uuid",
  "content": "Check out this image!",
  "messageType": "image",
  "timestamp": "2025-08-19T10:30:00.000Z",
  "attachmentUrl": "https://your-domain.com/uploads/chat-attachments/filename.jpg",
  "attachmentType": "image/jpeg",
  "attachmentName": "original-filename.jpg"
}
```

## File Storage

Files are stored in the `uploads/chat-attachments/` directory with the following structure:

```
uploads/
  chat-attachments/
    2025/
      08/
        19/
          uuid-filename.ext
```

## Validation Rules

### File Upload Validation

- **File Size**: Configurable via multer config (check `multer.config.ts`)
- **File Types**: Configurable via multer config
- **Message Type**: Must be either "image" or "file"
- **Caption Length**: Maximum 500 characters
- **Session Access**: User must be a participant in the chat session
- **Session Status**: Session must be active

### Error Responses

```json
// File required
{
  "success": false,
  "message": "File is required for file/image messages"
}

// Invalid session
{
  "success": false,
  "message": "You are not a participant in this chat session"
}

// Inactive session
{
  "success": false,
  "message": "Chat session is not active"
}
```

## Frontend Integration

### React/TypeScript Example

```typescript
interface ChatFileUpload {
  sessionId: string;
  messageType: 'image' | 'file';
  message?: string;
}

async function sendFileMessage(
  file: File,
  uploadData: ChatFileUpload,
  token: string,
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionId', uploadData.sessionId);
  formData.append('messageType', uploadData.messageType);

  if (uploadData.message) {
    formData.append('message', uploadData.message);
  }

  const response = await fetch('/api/v1/chat/messages/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
}

// Usage in component
const handleFileUpload = async (file: File) => {
  try {
    const result = await sendFileMessage(
      file,
      {
        sessionId: currentSession.id,
        messageType: file.type.startsWith('image/') ? 'image' : 'file',
        message: 'Sharing a file',
      },
      authToken,
    );

    console.log('File uploaded successfully:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Displaying File Messages

```typescript
interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  messageType: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  attachmentSize?: number;
  createdAt: string;
}

function MessageComponent({ message }: { message: ChatMessage }) {
  if (message.messageType === 'image' && message.attachmentUrl) {
    return (
      <div>
        <img
          src={message.attachmentUrl}
          alt={message.attachmentName}
          style={{ maxWidth: '300px', height: 'auto' }}
        />
        {message.message && <p>{message.message}</p>}
      </div>
    );
  }

  if (message.messageType === 'file' && message.attachmentUrl) {
    return (
      <div>
        <a
          href={message.attachmentUrl}
          download={message.attachmentName}
          target="_blank"
          rel="noopener noreferrer"
        >
          📎 {message.attachmentName}
        </a>
        {message.attachmentSize && (
          <span>({formatFileSize(message.attachmentSize)})</span>
        )}
        {message.message && <p>{message.message}</p>}
      </div>
    );
  }

  return <p>{message.message}</p>;
}
```

## Security Considerations

1. **File Type Validation**: Configure allowed file types in `multer.config.ts`
2. **File Size Limits**: Set appropriate file size limits
3. **Access Control**: Only session participants can upload files
4. **File Scanning**: Consider adding virus scanning for uploaded files
5. **Content Validation**: Validate image files to prevent malicious uploads
6. **Storage Security**: Files are stored with UUID names to prevent guessing

## Performance Considerations

1. **File Optimization**: Consider compressing images before storage
2. **CDN**: Use a CDN for serving uploaded files
3. **Cleanup**: Implement cleanup for orphaned files
4. **Bandwidth**: Monitor bandwidth usage for file transfers

## Chat History

File messages are included in chat history with full metadata:

```json
{
  "data": [
    {
      "id": "message-uuid",
      "sessionId": "session-uuid",
      "senderId": "user-uuid",
      "message": "Check this out!",
      "messageType": "image",
      "attachmentUrl": "https://your-domain.com/uploads/chat-attachments/file.jpg",
      "attachmentType": "image/jpeg",
      "attachmentName": "screenshot.jpg",
      "attachmentSize": 1234567,
      "createdAt": "2025-08-19T10:30:00.000Z",
      "sender": {
        "id": "user-uuid",
        "fullName": "John Doe",
        "role": "client",
        "profilePicture": "profile-url"
      }
    }
  ]
}
```

## Testing

You can test the file upload feature using tools like Postman or curl:

```bash
curl -X POST \
  http://localhost:3000/api/v1/chat/messages/upload \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -F 'file=@/path/to/your/file.jpg' \
  -F 'sessionId=your-session-uuid' \
  -F 'messageType=image' \
  -F 'message=Test image upload'
```

## Troubleshooting

### Common Issues

1. **"File is required" error**: Make sure you're including the file in the form data
2. **"Chat session is not active" error**: Ensure the session is active before uploading
3. **Upload fails silently**: Check multer configuration and file size limits
4. **Files not accessible**: Verify the uploads directory has proper permissions

### Debug Steps

1. Check server logs for detailed error messages
2. Verify the multer configuration in `multer.config.ts`
3. Ensure the uploads directory exists and is writable
4. Test with small files first to rule out size limit issues
