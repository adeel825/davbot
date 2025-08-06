# DavBot - Voice Agent

A simple web application that connects to a voice agent created in Vapi.ai. DavBot is an interactive voice agent with a witty, weirdly believable personality inspired by Davinder Singh.

## Features

- 🎙️ Voice-activated conversation with DavBot
- 🎯 Real-time status updates (Listening, Responding, etc.)
- 📱 Responsive design that works on desktop and mobile
- 🔊 Visual feedback with animated avatar during conversations
- 📝 Conversation log to track the chat history

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Vapi Credentials

Before you can use DavBot, you need to configure your Vapi.ai credentials:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your actual credentials:
   ```
   VITE_VAPI_PUBLIC_KEY=your_actual_public_key_here
   VITE_VAPI_ASSISTANT_ID=your_actual_assistant_id_here
   ```

**Important**: The `.env` file is ignored by git for security. Never commit your actual API keys!

### 3. Create Your Vapi Assistant

1. Go to [Vapi.ai](https://vapi.ai) and create an account
2. Create a new assistant with:
   - **Personality**: Configure it as DavBot with Davinder Singh's personality
   - **Voice**: Choose a voice that matches the character
   - **Model**: Configure the LLM settings (GPT-3.5/4, Claude, etc.)
3. Copy your assistant ID and public key

### 4. Run the Application

#### Development Mode (with Vite)
```bash
npm run dev
```
Visit: `http://localhost:3000`

#### Production Build
```bash
npm run build
npm run server
```
Visit: `http://localhost:3001`

## Project Structure

```
davbot/
├── src/
│   ├── index.html      # Main HTML structure
│   ├── style.css       # Styling and animations
│   └── main.js         # Vapi integration logic
├── server.js           # Optional Express server
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies and scripts
```

## How It Works

1. **Initialization**: The app initializes the Vapi Web SDK with your credentials
2. **Voice Activation**: Click the microphone button to start a conversation
3. **Real-time Communication**: 
   - Speech-to-text captures your voice
   - Vapi processes through your configured LLM
   - Text-to-speech plays the response
4. **Visual Feedback**: The interface shows listening/responding states with animations

## Vapi Events Handled

- `call-start`: Connection established
- `call-end`: Conversation ended  
- `speech-start/end`: User speaking detection
- `message`: Transcript and function calls
- `response-start/end`: Assistant response timing
- `volume-level`: Audio level monitoring
- `error`: Error handling

## Customization

### Changing the Avatar
Edit the avatar emoji in `src/index.html`:
```html
<div class="avatar">👨‍💼</div> <!-- Change this emoji -->
```

### Modifying Colors/Styling
Update the CSS variables and gradients in `src/style.css`

### Assistant Configuration
You can configure the assistant inline in `main.js` instead of using an assistant ID:

```javascript
assistant: {
  model: {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: 'You are DavBot...'
    }]
  },
  voice: {
    provider: 'playht',
    voiceId: 'your-voice-id'
  }
}
```

## Troubleshooting

- **"Please configure your Vapi credentials"**: Make sure you've updated the API keys in `main.js`
- **Connection errors**: Check your internet connection and Vapi account status
- **No audio**: Ensure microphone permissions are granted in your browser
- **Build issues**: Make sure all dependencies are installed with `npm install`

## Technologies Used

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Build Tool**: Vite
- **Voice SDK**: Vapi.ai Web SDK
- **Server**: Express.js (optional)
- **Styling**: CSS Grid/Flexbox with animations

## License

MIT License - feel free to modify and use for your own projects!