# DeepSeek Chat Application

A modern chat application built with Next.js 15, Supabase, and the DeepSeek AI model.

## Features

- Real-time chat with the DeepSeek AI model
- Chat history management (create, rename, delete)
- Beautiful UI with shadcn/ui components
- Streaming AI responses
- File attachment support (coming soon)
- Different avatars for AI and user

## Tech Stack

- Next.js 15
- Supabase for database
- AI SDK 4 for AI integration
- Shadcn/ui for components
- TypeScript
- Zustand for state management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account
- A DeepSeek API key

### Setup

1. Clone the repository:

```bash
git clone [your-repo-url]
cd dchat
```

2. Install dependencies:

```bash
npm install
```

3. Create a Supabase project and set up the tables:

   - Create a table named `sessions` with the following schema:
     - `id` (uuid, primary key)
     - `title` (text)
     - `created_at` (timestamp with time zone)

   - Create a table named `messages` with the following schema:
     - `id` (uuid, primary key)
     - `session_id` (uuid, foreign key to sessions.id)
     - `role` (text, either 'user' or 'assistant')
     - `content` (text)
     - `created_at` (timestamp with time zone)

4. Set up environment variables:

   Copy the `.env.local` file and fill in the values:

```bash
cp .env.local.example .env.local
```

Edit the `.env.local` file and add your Supabase URL, Supabase anonymous key, and your DeepSeek API key.

### Running the Project

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Create a new chat by clicking the "New Chat" button
2. Type your message and press Enter or click Send
3. View your chat history in the sidebar
4. Rename or delete chats using the icons next to each chat

## License

This project is licensed under the MIT License.
