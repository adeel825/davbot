import Vapi from '@vapi-ai/web'

class DavBot {
  constructor() {
    this.vapi = null
    this.isCallActive = false
    this.initializeElements()
    this.setupEventListeners()
    
    // Configuration - Uses environment variables
    this.config = {
      publicKey: import.meta.env.VITE_VAPI_PUBLIC_KEY,
      assistant: import.meta.env.VITE_VAPI_ASSISTANT_ID
    }
  }

  initializeElements() {
    this.micButton = document.getElementById('micButton')
    this.status = document.getElementById('status')
    this.conversationLog = document.getElementById('conversationLog')
    this.avatar = document.querySelector('.avatar')
    this.buttonText = document.querySelector('.button-text')
  }

  setupEventListeners() {
    this.micButton.addEventListener('click', () => {
      if (this.isCallActive) {
        this.endCall()
      } else {
        this.startCall()
      }
    })
  }

  async startCall() {
    try {
      // Check if we have the required configuration
      if (!this.config.publicKey || !this.config.assistant) {
        this.updateStatus('Please configure your Vapi credentials', 'error')
        this.addMessage('system', 'Error: Please set VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID environment variables')
        return
      }

      this.updateStatus('Initializing...', 'connecting')
      this.setButtonState('connecting')

      // Initialize Vapi instance
      this.vapi = new Vapi(this.config.publicKey)
      
      // Set up event listeners
      this.setupVapiEventListeners()

      // Start the conversation
      await this.vapi.start(this.config.assistant)
      
    } catch (error) {
      console.error('Error starting call:', error)
      this.updateStatus('Failed to start conversation', 'error')
      this.addMessage('system', `Error: ${error.message}`)
      this.setButtonState('idle')
    }
  }

  setupVapiEventListeners() {
    // Call started
    this.vapi.on('call-start', () => {
      console.log('Call started')
      this.isCallActive = true
      this.updateStatus('Connected! Start speaking...', 'listening')
      this.setButtonState('active')
      this.setAvatarState('listening')
      this.addMessage('system', 'Connected to DavBot! You can start speaking now.')
    })

    // Call ended
    this.vapi.on('call-end', () => {
      console.log('Call ended')
      this.isCallActive = false
      this.updateStatus('Conversation ended', 'idle')
      this.setButtonState('idle')
      this.setAvatarState('idle')
      this.addMessage('system', 'Conversation ended.')
    })

    // Speech start (user started speaking)
    this.vapi.on('speech-start', () => {
      console.log('User started speaking')
      this.updateStatus('Listening...', 'listening')
      this.setAvatarState('listening')
    })

    // Speech end (user stopped speaking)
    this.vapi.on('speech-end', () => {
      console.log('User stopped speaking')
      this.updateStatus('Processing...', 'responding')
      this.setAvatarState('responding')
    })

    // Message received (transcript or response)
    this.vapi.on('message', (message) => {
      console.log('Message received:', message)
      
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        // User's final transcript
        this.addMessage('user', message.transcript)
      } else if (message.type === 'function-call') {
        // Handle function calls if your assistant uses them
        console.log('Function call:', message)
      }
    })

    // Response received from the assistant
    this.vapi.on('response-start', () => {
      console.log('Assistant response started')
      this.updateStatus('DavBot is responding...', 'responding')
      this.setAvatarState('speaking')
    })

    this.vapi.on('response-end', () => {
      console.log('Assistant response ended')
      this.updateStatus('Listening...', 'listening')
      this.setAvatarState('listening')
    })

    // Volume level updates
    this.vapi.on('volume-level', (volume) => {
      // You can use this to create visual feedback for speech levels
      // console.log('Volume level:', volume)
    })

    // Error handling
    this.vapi.on('error', (error) => {
      console.error('Vapi error:', error)
      this.updateStatus('Connection error', 'error')
      this.addMessage('system', `Error: ${error.message || 'Unknown error occurred'}`)
      this.isCallActive = false
      this.setButtonState('idle')
      this.setAvatarState('idle')
    })
  }

  endCall() {
    if (this.vapi && this.isCallActive) {
      this.vapi.stop()
      this.updateStatus('Ending conversation...', 'ending')
    }
  }

  updateStatus(message, type = 'idle') {
    this.status.textContent = message
    this.status.className = `status ${type}`
  }

  setButtonState(state) {
    this.micButton.className = `mic-button ${state}`
    
    switch (state) {
      case 'idle':
        this.buttonText.textContent = 'Start Conversation'
        this.micButton.disabled = false
        break
      case 'connecting':
        this.buttonText.textContent = 'Connecting...'
        this.micButton.disabled = true
        break
      case 'active':
        this.buttonText.textContent = 'End Conversation'
        this.micButton.disabled = false
        this.micButton.classList.add('recording')
        break
      case 'ending':
        this.buttonText.textContent = 'Ending...'
        this.micButton.disabled = true
        break
    }
  }

  setAvatarState(state) {
    // Remove all existing animation classes
    this.avatar.classList.remove('speaking', 'listening', 'responding')
    
    // Add the new state class
    if (state !== 'idle') {
      this.avatar.classList.add(state)
    }
  }

  addMessage(type, content) {
    const messageDiv = document.createElement('div')
    messageDiv.className = `message ${type}-message`
    messageDiv.textContent = content
    
    this.conversationLog.appendChild(messageDiv)
    this.conversationLog.scrollTop = this.conversationLog.scrollHeight
  }
}

// Initialize DavBot when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new DavBot()
  
  // Add initial welcome message
  setTimeout(() => {
    const welcomeMsg = document.createElement('div')
    welcomeMsg.className = 'message system-message'
    welcomeMsg.innerHTML = `
      <strong>Welcome to DavBot!</strong>
    `
    document.getElementById('conversationLog').appendChild(welcomeMsg)
  }, 1000)
})