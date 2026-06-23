def postprocess(prediction, probabilities=None) -> dict:
    """
    Converts the raw model output into a human-readable JSON response.

    Args:
        prediction  : numpy array — the model's predicted class [0 or 1]
        probabilities: numpy array — the model's predict_proba output [[stay_prob, churn_prob]]

    Returns:
        dict with keys: prediction (str), class (int), probability (dict)
    """
    class_id = int(prediction[0])
    label = "Churn" if class_id == 1 else "Stay"

    result = {
        "prediction": label,
        "class": class_id,
    }

    if probabilities is not None:
        proba = probabilities[0]
        result["probability"] = {
            "stay": round(float(proba[0]), 4),
            "churn": round(float(proba[1]), 4),
        }

    return result
