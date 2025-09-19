"""HTTP microservice that performs lightweight prompt enrichment."""

from __future__ import annotations

from flask import Flask, Response, jsonify, request

app = Flask(__name__)


@app.route('/', methods=['POST'])
def enhance_prompt() -> tuple[Response, int]:
    """Enhance an incoming prompt using optional contextual metadata."""
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '')
    context = data.get('context') or {}

    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    # Incorporate high-level context keys to demonstrate enrichment without
    # leaking sensitive values in the response payload.
    context_keys = ', '.join(sorted(context.keys())) if context else 'none'
    enhanced_prompt = f"{prompt}\n\n[context keys: {context_keys}]"
    return jsonify({'enhanced': enhanced_prompt}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005)
