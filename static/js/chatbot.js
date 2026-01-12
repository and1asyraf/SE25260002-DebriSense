// Interactive Chatbot Module
// This module provides AI-powered assistance for DebriSense users

class DebriSenseChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.userName = this.getUserName();
        this.userRole = this.getUserRole();
        
        this.init();
    }
    
    init() {
        this.createChatbotUI();
        this.attachEventListeners();
        this.loadWelcomeMessage();
    }
    
    getUserName() {
        // Try to get user name from various sources
        const userNameElement = document.querySelector('.user-name');
        const mobileUserInfo = document.querySelector('.mobile-user-info span');
        
        if (userNameElement) {
            return userNameElement.textContent.trim();
        } else if (mobileUserInfo) {
            return mobileUserInfo.textContent.trim();
        }
        return 'User';
    }
    
    getUserRole() {
        // Determine user role based on page elements
        if (document.querySelector('.ngo-badge')) {
            return 'NGO';
        } else if (document.querySelector('.admin-badge')) {
            return 'Admin';
        }
        return 'Public';
    }
    
    createChatbotUI() {
        // Create chatbot button
        const chatbotButton = document.createElement('button');
        chatbotButton.className = 'chatbot-button';
        chatbotButton.id = 'chatbot-button';
        chatbotButton.setAttribute('aria-label', 'Open chatbot');
        chatbotButton.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.38 0-2.68-.31-3.85-.85l-.28-.14-2.88.49.49-2.88-.14-.28C4.31 14.68 4 13.38 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4-9h-3V8c0-.55-.45-1-1-1s-1 .45-1 1v3H8c-.55 0-1 .45-1 1s.45 1 1 1h3v3c0 .55.45 1 1 1s1-.45 1-1v-3h3c.55 0 1-.45 1-1s-.45-1-1-1z"/>
            </svg>
        `;
        document.body.appendChild(chatbotButton);
        
        // Create chatbot widget
        const chatbotWidget = document.createElement('div');
        chatbotWidget.className = 'chatbot-widget';
        chatbotWidget.id = 'chatbot-widget';
        chatbotWidget.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-header-content">
                    <div class="chatbot-avatar">🤖</div>
                    <div class="chatbot-info">
                        <h3>DebriSense Assistant</h3>
                        <div class="chatbot-status">
                            <span class="status-dot"></span>
                            <p>Online</p>
                        </div>
                    </div>
                </div>
                <button class="chatbot-minimize" id="chatbot-minimize" aria-label="Minimize chatbot">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <div class="chatbot-messages" id="chatbot-messages">
                <!-- Messages will be added here -->
            </div>
            <div class="chatbot-input-area">
                <textarea 
                    class="chatbot-input" 
                    id="chatbot-input" 
                    placeholder="Type your message..." 
                    rows="1"
                    aria-label="Chat message input"
                ></textarea>
                <button class="chatbot-send-btn" id="chatbot-send-btn" aria-label="Send message">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        `;
        document.body.appendChild(chatbotWidget);
    }
    
    attachEventListeners() {
        const chatbotButton = document.getElementById('chatbot-button');
        const chatbotWidget = document.getElementById('chatbot-widget');
        const minimizeBtn = document.getElementById('chatbot-minimize');
        const sendBtn = document.getElementById('chatbot-send-btn');
        const input = document.getElementById('chatbot-input');
        
        // Toggle chatbot
        chatbotButton.addEventListener('click', () => this.toggleChatbot());
        minimizeBtn.addEventListener('click', () => this.toggleChatbot());
        
        // Send message
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter to send (Shift+Enter for new line)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });
    }
    
    toggleChatbot() {
        this.isOpen = !this.isOpen;
        const button = document.getElementById('chatbot-button');
        const widget = document.getElementById('chatbot-widget');
        
        if (this.isOpen) {
            button.classList.add('active');
            widget.classList.add('active');
            document.getElementById('chatbot-input').focus();
            this.scrollToBottom();
        } else {
            button.classList.remove('active');
            widget.classList.remove('active');
        }
    }
    
    loadWelcomeMessage() {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        // Welcome screen
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <div class="bot-icon">🤖</div>
            <h4>Hello${this.userName !== 'User' ? ', ' + this.userName : ''}! 👋</h4>
            <p>I'm your DebriSense Assistant. I can help you with monitoring rivers, understanding debris data, and navigating the platform.</p>
        `;
        messagesContainer.appendChild(welcomeDiv);
        
        // Add quick replies after a short delay
        setTimeout(() => {
            this.addBotMessage(
                "How can I assist you today?",
                this.getQuickReplies()
            );
        }, 800);
    }
    
    getQuickReplies() {
        const roleBasedReplies = {
            'NGO': [
                'How do I report debris?',
                'Explain DRI scores',
                'Request new location',
                'Export data'
            ],
            'Admin': [
                'How to add locations?',
                'Manage user accounts',
                'View reports',
                'System overview'
            ],
            'Public': [
                'What is DebriSense?',
                'How does DRI work?',
                'View river status',
                'Contact support'
            ]
        };
        
        return roleBasedReplies[this.userRole] || roleBasedReplies['Public'];
    }
    
    sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.addUserMessage(message);
        
        // Clear input
        input.value = '';
        input.style.height = 'auto';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Process message (simulated bot response)
        setTimeout(() => {
            this.hideTypingIndicator();
            this.processBotResponse(message);
        }, 1000 + Math.random() * 1000);
    }
    
    addUserMessage(text) {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        
        const initial = this.userName.charAt(0).toUpperCase();
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${initial}</div>
            <div>
                <div class="message-content">${this.escapeHtml(text)}</div>
                <div class="message-time">${this.getCurrentTime()}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        this.messages.push({
            type: 'user',
            text: text,
            timestamp: new Date()
        });
    }
    
    addBotMessage(text, quickReplies = null) {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div>
                <div class="message-content">${text}</div>
                <div class="message-time">${this.getCurrentTime()}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // Add quick replies if provided
        if (quickReplies && quickReplies.length > 0) {
            const quickRepliesDiv = document.createElement('div');
            quickRepliesDiv.className = 'quick-replies';
            
            quickReplies.forEach(reply => {
                const button = document.createElement('button');
                button.className = 'quick-reply-btn';
                button.textContent = reply;
                button.addEventListener('click', () => {
                    document.getElementById('chatbot-input').value = reply;
                    this.sendMessage();
                });
                quickRepliesDiv.appendChild(button);
            });
            
            messagesContainer.appendChild(quickRepliesDiv);
        }
        
        this.scrollToBottom();
        
        this.messages.push({
            type: 'bot',
            text: text,
            timestamp: new Date()
        });
    }
    
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="typing-dots">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    processBotResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Knowledge base responses
        const responses = {
            'report': this.getReportHelp(),
            'dri': this.getDRIExplanation(),
            'location': this.getLocationHelp(),
            'export': this.getExportHelp(),
            'add location': this.getAddLocationHelp(),
            'user account': this.getUserManagementHelp(),
            'what is debrisense': this.getAboutDebriSense(),
            'contact': this.getContactInfo(),
            'river': this.getRiverStatusHelp()
        };
        
        // Find matching response
        let response = null;
        for (const [keyword, responseFunc] of Object.entries(responses)) {
            if (lowerMessage.includes(keyword)) {
                response = responseFunc;
                break;
            }
        }
        
        // Default response if no match
        if (!response) {
            response = this.getDefaultResponse();
        }
        
        this.addBotMessage(response);
    }
    
    // Knowledge Base Methods
    getReportHelp() {
        return `To report debris sightings:<br><br>
            1. Click on <strong>"NGO Tools"</strong> in the top navigation<br>
            2. Select <strong>"Report Debris"</strong><br>
            3. Fill in the form with:<br>
            &nbsp;&nbsp;• River location<br>
            &nbsp;&nbsp;• Debris type<br>
            &nbsp;&nbsp;• Estimated amount<br>
            &nbsp;&nbsp;• Optional photo<br>
            4. Submit your report<br><br>
            Your reports help improve monitoring accuracy! 📋`;
    }
    
    getDRIExplanation() {
        return `<strong>Debris Risk Index (DRI)</strong> is a weighted scoring system (0-100) that predicts debris accumulation risk:<br><br>
            🟢 <strong>0-30:</strong> Low Risk - Minimal debris expected<br>
            🟡 <strong>31-60:</strong> Moderate Risk - Some debris accumulation<br>
            🟠 <strong>61-80:</strong> High Risk - Significant debris likely<br>
            🔴 <strong>81-100:</strong> Critical Risk - Severe debris accumulation<br><br>
            The DRI considers rainfall, land use, water level, and population density.`;
    }
    
    getLocationHelp() {
        return `To request a new monitoring location:<br><br>
            1. Open <strong>"NGO Tools"</strong><br>
            2. Click <strong>"Request Location"</strong><br>
            3. Provide:<br>
            &nbsp;&nbsp;• Location name & coordinates<br>
            &nbsp;&nbsp;• State & district<br>
            &nbsp;&nbsp;• Reason for monitoring<br>
            4. Submit request<br><br>
            Admins will review your request within 48 hours. 📍`;
    }
    
    getExportHelp() {
        return `You can export DRI data in CSV format:<br><br>
            • <strong>Watchlist Export:</strong> All rivers you're monitoring<br>
            • <strong>Single River:</strong> Historical data for specific river<br>
            • Choose time range (7-90 days)<br><br>
            Click "Export Data" in NGO Tools to get started! 📥`;
    }
    
    getAddLocationHelp() {
        return `To add a new monitoring location:<br><br>
            1. Click <strong>"Add Location"</strong> in the top bar<br>
            2. Enter river details:<br>
            &nbsp;&nbsp;• River name<br>
            &nbsp;&nbsp;• Latitude & longitude<br>
            &nbsp;&nbsp;• Land use type<br>
            &nbsp;&nbsp;• Optional image<br>
            3. Submit<br><br>
            The location will appear immediately on the map! 🗺️`;
    }
    
    getUserManagementHelp() {
        return `To manage NGO user accounts:<br><br>
            1. Navigate to <strong>"NGO Users"</strong> page<br>
            2. You can:<br>
            &nbsp;&nbsp;• View all registered NGOs<br>
            &nbsp;&nbsp;• Approve/reject registrations<br>
            &nbsp;&nbsp;• Delete inactive accounts<br>
            &nbsp;&nbsp;• View NGO activity<br><br>
            Click "Manage Users" in Quick Actions. 👥`;
    }
    
    getAboutDebriSense() {
        return `<strong>DebriSense</strong> is a predictive debris risk monitoring system for Malaysian rivers.<br><br>
            <strong>Key Features:</strong><br>
            • Real-time DRI calculations<br>
            • Interactive map interface<br>
            • NGO collaboration tools<br>
            • Historical data tracking<br>
            • Transparent, rule-based predictions<br><br>
            <em>No AI/ML - just clear, weighted index calculations!</em> 🌊`;
    }
    
    getContactInfo() {
        return `<strong>Need Help?</strong><br><br>
            📧 Email: support@debrisense.my<br>
            📞 Phone: +60 3-1234 5678<br>
            🌐 Website: www.debrisense.my<br><br>
            For technical issues, please include:<br>
            • Your account type (${this.userRole})<br>
            • Description of the issue<br>
            • Screenshots if applicable`;
    }
    
    getRiverStatusHelp() {
        return `To check river status:<br><br>
            1. Click on any marker on the map<br>
            2. View the sidebar with:<br>
            &nbsp;&nbsp;• Current DRI score<br>
            &nbsp;&nbsp;• Risk level & trend<br>
            &nbsp;&nbsp;• Environmental factors<br>
            &nbsp;&nbsp;• Historical data<br><br>
            ${this.userRole === 'NGO' ? '💡 <em>Tip: Add rivers to your watchlist for quick access!</em>' : ''}`;
    }
    
    getDefaultResponse() {
        const defaultResponses = [
            `I'm here to help! You can ask me about:<br><br>
            • Reporting debris sightings<br>
            • Understanding DRI scores<br>
            • Using platform features<br>
            • Exporting data<br>
            • System navigation<br><br>
            What would you like to know?`,
            `I didn't quite understand that. Here are some things I can help with:<br><br>
            📊 Explain DRI scores<br>
            📋 Report debris<br>
            🗺️ Navigate the system<br>
            📥 Export data<br><br>
            Try asking about one of these topics!`
        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
    
    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatbot-messages');
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new DebriSenseChatbot();
    
    // Make chatbot accessible globally for debugging
    window.debriSenseChatbot = chatbot;
});

