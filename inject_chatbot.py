import os

target = r"c:\Users\User\OneDrive\Documents\Projects Git Hub\CAT404\DebriSense\app.py"
with open(target, 'r', encoding='utf-8') as f:
    content = f.read()

chatbot_route = """
# ============================================
# AI Chatbot API
# ============================================

import google.generativeai as genai

@app.route('/api/chatbot/message', methods=['POST'])
def chatbot_message():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        user_role = data.get('role', 'Public')
        
        if not user_message:
            return jsonify({'success': False, 'error': 'Empty message'}), 400
            
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return jsonify({'success': False, 'error': 'Gemini API key not configured in .env'}), 500
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f'''
        You are DebriSense Assistant, an AI expert for the DebriSense river debris monitoring platform in Malaysia.
        The user you are speaking to has the role: {user_role}.
        
        Platform Features:
        - DRI (Debris Risk Index): 0-100 score predicting river debris risk.
        - NGO Users: Submit Hotspot Reports, request monitoring locations, manage Watchlists, export CSV data.
        - Public Users: View map, add rivers to Watchlist, submit Hotspot Reports natively.
        - Admin Users: Manage rivers, approve/reject reports, manage NGO access, view advanced Hotspot Analysis.
        
        Formatting Rules:
        - Provide answers as purely formatted HTML (using <br>, <strong>, <em>, <ul>, <li>) so it renders correctly in the chat widget. Do NOT use markdown.
        - Keep answers concise (1-3 short paragraphs).
        - Directly directly address the user's question, taking their assigned Role into account.
        
        User Message: {user_message}
        '''
        
        response = model.generate_content(prompt)
        
        return jsonify({'success': True, 'response': response.text})
    except Exception as e:
        print(f"Chatbot Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

"""

if "def chatbot_message():" not in content:
    content = content.replace("# ============================================\n# Utility Routes", chatbot_route + "\n# ============================================\n# Utility Routes")
    with open(target, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected Chatbot API route.")
else:
    print("Already injected.")
