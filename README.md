# Pong Online

A real-time multiplayer Pong game built with Phaser 3 and Socket.IO. Play the classic Pong game with players from around the world!

## Features

- Real-time multiplayer gameplay
- Automatic player matching
- Synchronized ball physics
- Score tracking
- Responsive controls
- Clean, modern UI
- Serverless architecture using Vercel

## Technologies Used

- Phaser 3 for game engine
- Socket.IO for real-time communication
- Vercel for serverless deployment
- Node.js for backend
- ES6+ JavaScript

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Vercel CLI (optional for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pong-online.git
cd pong-online
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

## How to Play

1. Open the game in your browser
2. Wait for an opponent to join
3. Use Up/Down arrow keys to move your paddle
4. Score points by getting the ball past your opponent's paddle
5. First player to reach the score limit wins!

## Development

To run the game locally with hot reloading:
```bash
npm run dev
```

To build for production:
```bash
npm run build
```

## Deployment

The game is set up for easy deployment to Vercel:

```bash
vercel
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 