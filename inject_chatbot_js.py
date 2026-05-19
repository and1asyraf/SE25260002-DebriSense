import os

target = r"c:\Users\User\OneDrive\Documents\Projects Git Hub\CAT404\DebriSense\static\js\chatbot.js"
with open(target, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace processBotResponse entirely
start_str = "    processBotResponse(userMessage) {"
end_str = "    // Knowledge Base Methods"

if start_str in content and end_str in content:
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    
    new_method = """    async processBotResponse(userMessage) {
        try {
            const response = await fetch('/api/chatbot/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    role: this.userRole
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Strip markdown formatting if any accidentally leaked through, keeping HTML
                let formattedText = data.response.replace(/```html\\n?|```/g, '').trim();
                this.addBotMessage(formattedText);
            } else {
                this.addBotMessage(`⚠️ Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Chatbot API Error:', error);
            this.addBotMessage("Sorry, I'm having trouble connecting to my AI brain. Please try again later. 🤖⚡");
        }
    }
    
"""
    
    content = content[:start_idx] + new_method + content[end_idx:]
    with open(target, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected Chatbot JS logic.")
else:
    print("Could not find targets in JS.")
