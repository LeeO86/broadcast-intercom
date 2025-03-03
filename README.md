# Broadcast Intercom System

A professional-grade intercom system for broadcast productions built with Nuxt 3. This application provides real-time audio communication between production team members with features like push-to-talk, program sound distribution, and group management.

## Features

- **Real-time Communication**: Low-latency audio communication between team members
- **Push-to-Talk (PTT)**: Intuitive push-to-talk functionality with lock option
- **Program Sound Distribution**: Dedicated channels for program audio
- **Group Management**: Create and manage multiple communication groups
- **User-friendly Interface**: Clean, responsive UI with dark mode support
- **Customizable Settings**: Personalize audio processing and interface preferences
- **Persistent Settings**: User preferences are saved locally
- **WebRTC Integration**: Uses Janus WebRTC Gateway for audio streaming

## Technology Stack

- **Frontend**: Vue.js 3 with Nuxt 3
- **UI Framework**: Tailwind CSS
- **State Management**: Pinia with persistence
- **Real-time Communication**: Socket.IO
- **WebRTC**: Janode library for Janus WebRTC Gateway integration
- **Database**: SQLite for server-side storage
- **Backend**: Node.js with Nitro server

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Janus WebRTC Gateway server (for production use)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/broadcast-intercom.git
   cd broadcast-intercom
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Production Deployment

#### Using Docker

1. Build the Docker image:
   ```bash
   docker build -t broadcast-intercom .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 -v $(pwd)/data:/app/data -e JANUS_URL=ws://your-janus-server:8188/ broadcast-intercom
   ```

3. Access the application at `http://localhost:3000`

#### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   node .output/server/index.mjs
   ```

## Janus WebRTC Gateway Setup

This application requires a Janus WebRTC Gateway server for audio streaming. You can set up Janus in several ways:

### Using Docker

```bash
docker run --name janus -p 8188:8188 -p 8088:8088 -p 8089:8089 -p 8889:8889 -p 8000:8000 -p 7088:7088 -p 7089:7089 canyan/janus-gateway
```

### Manual Installation

Follow the [official Janus installation guide](https://janus.conf.meetecho.com/docs/install.html).

### Configuration

Make sure the AudioBridge plugin is enabled in your Janus configuration.

## Environment Variables

The application can be configured using environment variables:

- `JANUS_URL`: URL of the Janus WebRTC server (default: `ws://localhost:8188/`)
- `JANUS_API_SECRET`: Secret for Janus API (optional)
- `SOCKET_URL`: Custom Socket.IO server URL (optional, defaults to same host)

## Project Structure

- `components/`: Vue components
- `composables/`: Reusable Vue composition functions
- `layouts/`: Page layouts
- `pages/`: Application pages and routes
- `plugins/`: Nuxt plugins
- `public/`: Static assets
- `server/`: Server-side code
  - `api/`: API endpoints
  - `database/`: Database modules
  - `plugins/`: Server plugins
  - `utils/`: Utility functions
- `stores/`: Pinia stores
- `types/`: TypeScript type definitions

## Usage

### Joining a Production

1. Enter the production access code
2. Enter your display name
3. Click "Join Production"

### Using the Intercom

- **Push-to-Talk**: Press and hold the "TALK" button to speak
- **Lock Mode**: Click the lock icon to keep the microphone open
- **Volume Control**: Adjust the vertical slider to change volume
- **Mute**: Click the speaker icon to mute a channel

### Admin Panel

Access the admin panel at `/admin` to:

- Create and manage productions
- Configure communication groups
- Customize email templates for invitations
- Monitor system activity

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Nuxt.js](https://nuxt.com/)
- [Vue.js](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Socket.IO](https://socket.io/)
- [Janus WebRTC Server](https://janus.conf.meetecho.com/)
- [Janode](https://github.com/meetecho/janode) - Janus API client for Node.js