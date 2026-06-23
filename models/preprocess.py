import numpy as np

def preprocess(input_data: dict) -> np.ndarray:
    """
    Converts the raw JSON input into a numpy array
    ready for the LogisticRegression model.

    Expected input format:
      { "features": [tenure, monthly_charges, total_charges, num_products] }

    Features (in order):
      - tenure          : int/float  — months the customer has been with the company
      - monthly_charges : float      — monthly bill amount in USD
      - total_charges   : float      — total amount paid by the customer to date
      - num_products    : int        — number of subscribed products/services
    """
    features = input_data.get("features")
    if features is None:
        raise ValueError("Input must contain a 'features' key with 4 numeric values.")
    if len(features) != 4:
        raise ValueError(f"Expected 4 features, got {len(features)}.")
    return np.array([features], dtype=float)
