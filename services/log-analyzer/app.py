"""
Flask application for log analysis and anomaly detection.
"""

import json
from flask import Flask, request, jsonify
import pandas as pd
from anomaly_detector import AnomalyDetector

app = Flask(__name__)

detector = AnomalyDetector()

@app.route('/analyze', methods=['POST'])
def analyze_logs():
    """
    Analyze logs for anomalies using machine learning.

    Returns:
        JSON response with anomaly analysis results.
    """
    log_data = request.json
    if not log_data:
        return jsonify({'error': 'No log data provided'}), 400

    try:
        # Assuming log_data is a list of JSON objects
        df = pd.DataFrame(log_data)

        # Basic feature engineering (you'll likely need to customize this)
        # For now, we'll use numerical features if they exist, or create some.
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['hour'] = df['timestamp'].dt.hour
            df['day_of_week'] = df['timestamp'].dt.dayofweek

        # Select only numerical columns for the model
        numerical_cols = df.select_dtypes(include=['number']).columns
        if len(numerical_cols) == 0:
            # If no numerical columns, create a dummy feature
            df['dummy_feature'] = range(len(df))
            numerical_cols = ['dummy_feature']

        # Fit the model and predict
        anomalies = detector.fit_predict(df[numerical_cols])
        df['is_anomaly'] = anomalies

        # Return the logs with anomaly flags
        result = df.to_json(orient='records')
        return jsonify(json.loads(result))

    except (pd.errors.EmptyDataError, KeyError) as e:
        return jsonify({'error': f"Invalid log data format: {e}"}), 400
    except Exception as e:
        app.logger.error(f"An unexpected error occurred: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
