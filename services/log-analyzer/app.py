"""Flask application for log analysis and anomaly detection."""

from __future__ import annotations

import json

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
import pandas as pd

from anomaly_detector import AnomalyDetector

app = Flask(__name__)

detector = AnomalyDetector()


@app.errorhandler(Exception)
def handle_unexpected_error(error: Exception):
    """Convert unexpected errors into structured 500 responses."""
    if isinstance(error, HTTPException):
        return error
    app.logger.exception("Unhandled error during log analysis: %s", error)
    return jsonify({'error': 'An internal server error occurred'}), 500


@app.route('/analyze', methods=['POST'])
def analyze_logs():
    """Analyze logs for anomalies using machine learning."""
    log_data = request.json
    if not log_data:
        return jsonify({'error': 'No log data provided'}), 400

    try:
        df = pd.DataFrame(log_data)

        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['hour'] = df['timestamp'].dt.hour
            df['day_of_week'] = df['timestamp'].dt.dayofweek

        numerical_cols = df.select_dtypes(include=['number']).columns
        if numerical_cols.empty:
            df['dummy_feature'] = range(len(df))
            numerical_cols = ['dummy_feature']

        anomalies = detector.fit_predict(df[numerical_cols])
        df['is_anomaly'] = anomalies

        result = df.to_json(orient='records')
        return jsonify(json.loads(result))

    except (pd.errors.EmptyDataError, KeyError, ValueError, TypeError) as error:
        return jsonify({'error': f"Invalid log data format: {error}"}), 400


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
