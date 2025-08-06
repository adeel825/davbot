import Vapi from '@vapi-ai/web'

class DavBot {
  constructor() {
    this.vapi = null
    this.isCallActive = false
    this.wakeLock = null
    this.connectionRetries = 0
    this.maxRetries = 3
    this.initializeElements()
    this.setupEventListeners()
    this.checkMobileCompatibility()
    
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
    this.networkIndicator = document.getElementById('networkIndicator')
  }

  setupEventListeners() {
    this.micButton.addEventListener('click', () => {
      if (this.isCallActive) {
        this.endCall()
      } else {
        this.startCall()
      }
    })

    // Handle page visibility changes (mobile browsers backgrounding)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isCallActive) {
        console.log('Page hidden, monitoring connection...')
      } else if (!document.hidden && this.isCallActive) {
        console.log('Page visible again')
        this.checkConnectionHealth()
      }
    })
  }

  async checkMobileCompatibility() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    if (isMobile) {
      // Check network connection type
      const networkInfo = await this.getNetworkInfo()
      this.updateNetworkIndicator(networkInfo)
      
      if (networkInfo.cellular) {
        this.addMessage('system', '📶 Cellular connection detected. Voice quality may be affected by network stability. WiFi recommended for best experience.')
        this.addMessage('system', '💡 Tip: Try moving to an area with stronger cellular signal or switch to WiFi.')
      } else {
        this.addMessage('system', '📱 Mobile detected. For best experience: keep app in foreground during conversations.')
      }
      
      if (isIOS) {
        this.addMessage('system', '🍎 iOS users: Please use Safari browser and grant microphone permissions when prompted.')
      }
    } else {
      // Still check network for desktop
      const networkInfo = await this.getNetworkInfo()
      this.updateNetworkIndicator(networkInfo)
    }
  }

  updateNetworkIndicator(networkInfo) {
    if (!this.networkIndicator) return
    
    this.networkIndicator.className = 'network-indicator'
    
    if (networkInfo.cellular) {
      this.networkIndicator.classList.add('cellular')
      
      if (networkInfo.effectiveType && ['slow-2g', '2g'].includes(networkInfo.effectiveType)) {
        this.networkIndicator.classList.add('poor')
        this.networkIndicator.textContent = 'Poor cellular connection'
      } else if (networkInfo.effectiveType === '3g') {
        this.networkIndicator.textContent = 'Moderate cellular connection'
      } else {
        this.networkIndicator.classList.add('good')
        this.networkIndicator.textContent = 'Cellular connection'
      }
    } else {
      this.networkIndicator.classList.add('wifi')
      this.networkIndicator.classList.add('good')
      this.networkIndicator.textContent = 'Good connection'
    }
  }

  async getNetworkInfo() {
    const networkInfo = {
      cellular: false,
      effectiveType: 'unknown',
      downlink: null,
      rtt: null
    }

    // Check Network Information API (limited support)
    if ('connection' in navigator) {
      const connection = navigator.connection
      networkInfo.effectiveType = connection.effectiveType || 'unknown'
      networkInfo.downlink = connection.downlink
      networkInfo.rtt = connection.rtt
      networkInfo.cellular = connection.type === 'cellular' || 
                            ['slow-2g', '2g', '3g'].includes(connection.effectiveType)
    }

    // Fallback detection methods
    if (!networkInfo.cellular) {
      // Check if on mobile device without WiFi indicators
      const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
      if (isMobile) {
        // Simple bandwidth test to estimate connection type
        try {
          const start = performance.now()
          await fetch('/health?t=' + Date.now(), { 
            method: 'HEAD',
            cache: 'no-cache' 
          })
          const rtt = performance.now() - start
          
          // High RTT often indicates cellular
          if (rtt > 150) {
            networkInfo.cellular = true
            networkInfo.rtt = rtt
          }
        } catch (error) {
          // If health check fails, assume unstable connection
          networkInfo.cellular = true
        }
      }
    }

    return networkInfo
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

      // Request wake lock on mobile to prevent screen sleep
      await this.requestWakeLock()

      // Check network type and apply optimizations
      const networkInfo = await this.getNetworkInfo()
      if (networkInfo.cellular) {
        await this.applyCellularOptimizations()
      }

      // Start the conversation
      await this.vapi.start(this.config.assistant)
      
    } catch (error) {
      console.error('Error starting call:', error)
      this.updateStatus('Failed to start conversation', 'error')
      this.addMessage('system', `Error: ${error.message}`)
      this.setButtonState('idle')
      this.connectionRetries++
      
      // Attempt auto-retry on mobile
      if (this.connectionRetries < this.maxRetries && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        setTimeout(() => {
          this.addMessage('system', `Retrying connection... (${this.connectionRetries}/${this.maxRetries})`)
          this.startCall()
        }, 2000)
      }
    }
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen')
        console.log('Wake lock acquired')
        
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake lock released')
        })
      }
    } catch (error) {
      console.log('Wake lock not supported or failed:', error)
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release()
        this.wakeLock = null
        console.log('Wake lock released manually')
      } catch (error) {
        console.log('Error releasing wake lock:', error)
      }
    }
  }

  checkConnectionHealth() {
    if (this.isCallActive && this.vapi) {
      // Simple connection health check
      const dailyCall = this.vapi.getDailyCallObject()
      if (dailyCall) {
        const participants = dailyCall.participants()
        console.log('Connection health check - participants:', Object.keys(participants).length)
        
        if (Object.keys(participants).length === 0) {
          this.addMessage('system', '⚠️ Connection may have been lost. Try reconnecting if issues persist.')
        }
      }
    }
  }

  async applyCellularOptimizations() {
    try {
      console.log('Applying cellular network optimizations...')
      this.addMessage('system', '📶 Optimizing for cellular connection...')
      
      // Add extra buffer time for cellular connections
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.log('Could not apply cellular optimizations:', error)
    }
  }

  optimizeAudioForMobile() {
    try {
      const dailyCall = this.vapi.getDailyCallObject()
      if (dailyCall) {
        // Optimize audio settings for mobile
        dailyCall.updateInputSettings({
          audio: {
            processor: {
              type: 'none' // Disable audio processing that might cause issues on mobile
            }
          }
        })

        // Set audio output device explicitly
        dailyCall.setOutputDeviceAsync({ deviceId: 'default' })
        
        console.log('Applied mobile audio optimizations')
      }
    } catch (error) {
      console.log('Could not apply mobile audio optimizations:', error)
    }
  }

  async applyCellularAudioSettings() {
    try {
      const dailyCall = this.vapi.getDailyCallObject()
      if (dailyCall) {
        // More aggressive settings for cellular
        dailyCall.updateInputSettings({
          audio: {
            processor: {
              type: 'none'
            }
          }
        })

        // Lower quality settings for better stability on cellular
        dailyCall.updateSendSettings({
          video: false, // Disable video to save bandwidth
          audio: {
            codec: 'opus',
            bitrate: 32000 // Lower bitrate for cellular
          }
        })
        
        console.log('Applied cellular-specific audio settings')
      }
    } catch (error) {
      console.log('Could not apply cellular audio settings:', error)
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
      this.connectionRetries = 0 // Reset on successful connection
      
      // Mobile-specific audio optimization
      if (/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        this.optimizeAudioForMobile()
        
        // Apply additional cellular optimizations if needed
        this.getNetworkInfo().then(networkInfo => {
          if (networkInfo.cellular) {
            this.applyCellularAudioSettings()
          }
        })
      }
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
      this.isCallActive = false
      this.setButtonState('idle')
      this.setAvatarState('idle')
      
      // Enhanced error handling based on error type
      this.handleConnectionError(error)
    })
  }

  endCall() {
    if (this.vapi && this.isCallActive) {
      this.vapi.stop()
      this.updateStatus('Ending conversation...', 'ending')
      this.releaseWakeLock()
      this.connectionRetries = 0 // Reset retry counter
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

  async handleConnectionError(error) {
    const errorMessage = error.message || 'Unknown error occurred'
    console.log('Handling connection error:', errorMessage)
    
    // Check network type for specific error handling
    const networkInfo = await this.getNetworkInfo()
    
    if (networkInfo.cellular) {
      if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
        this.updateStatus('Cellular network issue detected', 'error')
        this.addMessage('system', '📶 Poor cellular connection detected. Try:')
        this.addMessage('system', '• Moving to an area with better signal')
        this.addMessage('system', '• Switching to WiFi if available')
        this.addMessage('system', '• Waiting a moment and retrying')
        
        // Auto-retry for network issues on cellular
        setTimeout(() => {
          if (this.connectionRetries < 2) {
            this.addMessage('system', 'Auto-retrying connection...')
            this.startCall()
          }
        }, 3000)
      } else {
        this.updateStatus('Connection error', 'error')
        this.addMessage('system', `Cellular Error: ${errorMessage}`)
      }
    } else {
      // Standard error handling for WiFi/other connections
      this.updateStatus('Connection error', 'error')
      this.addMessage('system', `Error: ${errorMessage}`)
      
      // Auto-retry for any network error
      if (this.connectionRetries < this.maxRetries && errorMessage.includes('network')) {
        setTimeout(() => {
          this.addMessage('system', `Retrying... (${this.connectionRetries + 1}/${this.maxRetries})`)
          this.startCall()
        }, 2000)
      }
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