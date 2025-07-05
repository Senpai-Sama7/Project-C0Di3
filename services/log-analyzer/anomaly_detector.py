"""
Anomaly detection module for log analysis using Isolation Forest algorithm.
"""

from sklearn.ensemble import IsolationForest


class AnomalyDetector:
    """
    Anomaly detector using Isolation Forest algorithm for detecting outliers in log data.
    """

    def __init__(self, contamination=0.05):
        """
        Initialize the anomaly detector.

        Args:
            contamination (float): The proportion of outliers in the data set.
        """
        self.model = IsolationForest(contamination=contamination, random_state=42)
        self.is_fitted = False

    def fit(self, data):
        """
        Fit the model to the data.

        Args:
            data: pandas DataFrame with numerical features.
        """
        self.model.fit(data)
        self.is_fitted = True

    def predict(self, data):
        """
        Predict anomalies in the data.

        Args:
            data: pandas DataFrame with numerical features.

        Returns:
            numpy array with -1 for anomalies and 1 for normal data.
        """
        if not self.is_fitted:
            raise RuntimeError("Model has not been fitted yet.")
        return self.model.predict(data)

    def fit_predict(self, data):
        """
        Fit the model and predict anomalies.

        Args:
            data: pandas DataFrame with numerical features.

        Returns:
            numpy array with -1 for anomalies and 1 for normal data.
        """
        self.fit(data)
        return self.predict(data)
