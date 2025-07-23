# DuoNest Chat Backend

A real-time chat application backend built with Node.js, Express, Socket.io, and PostgreSQL. Designed for 1-on-1 conversations with advanced messaging features and live typing functionality.

## 🚀 Features

### 💬 **Core Messaging**

- **Real-time messaging** with Socket.io
- **Message delivery & read receipts** with status tracking
- **Message persistence** in PostgreSQL database
- **Media support** - text, images, videos, files, voice, locations
- **Message types** - replies, forwards, emoji reactions, system messages
- **Disappearing messages** with expiration timestamps
- **View-once messages** for sensitive content

### 🔴 **Live Features**

- **Live typing indicators** - See exactly what others are typing in real-time
- **Real-time presence** - Online/offline status tracking
- **Instant delivery** - Messages appear immediately when sent
- **Typing analytics** - Optional session logging for insights

### 👥 **User Management**

- **Auto user creation** with unique ID generation
- **Room-based conversations** (1-on-1 chat rooms)
- **User presence tracking** with Socket.io integration
- **Recent chats** - Track and display user's chat history

### 🔒 **Security & Performance**

- **Rate limiting** - Configurable limits to prevent abuse
- **Input validation** - Comprehensive data validation
- **Room access control** - Users can only access rooms they belong to
- **Content filtering** - Length limits and content validation
- **Throttling** - Live typing throttled to 10 updates/second
- **CORS protection** with helmet security middleware

### 📊 **Database Features**

- **Auto-migrations** - Database setup on first run
- **Optimized queries** with proper indexing
- **Connection pooling** for performance
- **Cleanup functions** for inactive data
- **Analytics logging** for typing patterns (optional)

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Database**: PostgreSQL with connection pooling
- **Security**: Helmet, CORS, rate limiting
- **Development**: tsx for hot reloading

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## ⚡ Quick Start

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd duonest-backend
   npm install
   ```

2. **Environment setup**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Database configuration**

   ```env
   Check example env for env variables
   ```

4. **Start the server**

   ```bash
   # Development with hot reload
   npm run dev

   # Production build
   npm run build
   npm start
   ```

5. **Database auto-setup**
   - Tables are created automatically on first run
   - Migrations run automatically on server startup
   - No manual database setup required!

## 📡 API Endpoints

### **User Management**

- `POST /api/generate-user-id` - Generate unique user ID
- `GET /api/u/:userId` - User dashboard/info

### **Room Management**

- `POST /api/u/:userId/create-room` - Create new chat room
- `POST /api/c/:roomId/join` - Join existing room
- `GET /api/c/:roomId` - Get room information
- `GET /api/c/:roomId/messages` - Get room message history

### **Messaging**

- `GET /api/u/:userId/messages/:roomId` - Get user's messages in room
- `GET /api/u/:userId/unread-messages/:roomId` - Get unread messages
- `POST /api/u/:userId/mark-messages-seen/:roomId` - Mark messages as read
- `DELETE /api/u/:userId/message/:messageId` - Delete message

### **Recent Chats**

- `GET /api/recent-chats/:userId` - Get user's recent chats
- `POST /api/recent-chats` - Add/update recent chat
- `PUT /api/recent-chats/:userId/:roomId` - Update chat info
- `DELETE /api/recent-chats/:userId/:roomId` - Remove recent chat

### **Health Check**

- `GET /health` - Server health status

## 🔌 Socket.io Events

### **Connection & Presence**

- `identify-user` - Register user for presence tracking
- `user-online` / `user-offline` - Presence updates
- `join-room` / `leave-room` - Room management

### **Messaging**

- `chat-message` - Send message
- `message-sent` - Message delivery confirmation
- `message-delivered` - Delivery receipt
- `message-seen` - Read receipt

### **Live Typing**

- `live-typing` - Send live typing updates
- `user-live-typing` - Receive others' typing
- `stop-live-typing` - Stop typing indicator
- `typing-session-end` - Analytics logging

### **Traditional Typing Indicators**

- `typing` - Simple typing indicator
- `user-typing` - Receive typing status

## 🗄️ Database Schema

### **Core Tables**

- `users` - User accounts and status
- `couple_rooms` - Chat rooms (1-on-1)
- `messages` - All messages with rich metadata
- `recent_chats` - User's recent chat history
- `live_typing_logs` - Typing analytics (optional)
- `migrations` - Database version tracking

### **Key Features**

- **Auto-incrementing message IDs** for proper ordering
- **Comprehensive indexes** for query performance
- **Foreign key constraints** for data integrity
- **Automatic timestamps** with triggers
- **Cleanup functions** for maintenance

## 🔧 Configuration

### **Rate Limiting**

```javascript
// Current settings (adjustable)
windowMs: 60 * 1000,     // 1 minute window
max: 50,                 // 50 requests per minute
// GET requests to rooms bypass rate limiting
```

### **Live Typing**

```javascript
throttleMs: 100,         // Max 10 updates/second
maxLength: 1000,         // Character limit
enabled: true            // Can be disabled via env
```

### **Socket.io CORS**

```javascript
// Allowed origins (development)
"http://localhost:3000";
"http://localhost:5173";
"http://localhost:5174";
```

## 🧪 Testing

### **Manual API Testing**

```bash
# Test recent chats functionality
node test-recent-chats.js
```

### **Database Testing**

```bash
# Check database connection
npm run dev
# Look for "✅ Database connected successfully"
```

## 📊 Performance Features

- **Connection pooling** - Max 20 concurrent database connections
- **Query optimization** - Proper indexes on all frequently queried columns
- **Memory management** - Automatic cleanup of typing throttle maps
- **Graceful shutdown** - Proper connection cleanup on exit
- **Error handling** - Comprehensive error catching and logging

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS protection** - Configurable allowed origins
- **Rate limiting** - Per-IP request limits
- **Input validation** - All user inputs validated
- **SQL injection protection** - Parameterized queries
- **Room access control** - Users only access their rooms
- **Content length limits** - Prevent abuse

## 🚦 Current Status

### ✅ **Completed Features**

- Real-time messaging with Socket.io
- Database persistence with PostgreSQL
- User and room management
- Message delivery/read receipts
- Live typing functionality
- Recent chats tracking
- Auto-migrations system
- Comprehensive error handling
- Security middleware
- Performance optimizations

### 🔄 **Recent Updates**

- Added live typing with keystroke-level updates
- Implemented recent chats API
- Enhanced rate limiting configuration
- Added typing analytics logging
- Fixed TypeScript compilation issues
- Improved database migration system

### 🎯 **Production Ready**

- Auto-database setup
- Error handling & logging
- Security best practices
- Performance optimizations
- Comprehensive API documentation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For issues or questions:

1. Check the console logs for error messages
2. Verify database connection settings
3. Ensure all environment variables are set
4. Check CORS settings match your frontend URL

---

**DuoNest Backend** - Real-time chat with live typing and advanced messaging features! 🚀
