from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/', methods=['POST'])
def enhance_prompt():
    data = request.get_json()
    prompt = data.get('prompt', '')
    context = data.get('context', {})
    # Stub: In production, enhance prompt with context/CVE info
    enhanced = prompt  # For now, just echo
    return jsonify({'enhanced': enhanced})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005)
