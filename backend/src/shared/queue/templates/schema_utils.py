"""
schema_utils.py
---------------
Shared output schema enforcement utilities for all serve templates.
Loads the output schema from OUTPUT_SCHEMA_PATH and provides _apply_schema()
to strictly format prediction output to match the user-defined expectedResult.
"""

import os
import json


def load_output_schema():
    """
    Load the output schema JSON file specified by the OUTPUT_SCHEMA_PATH env var.
    Returns the parsed schema object, or None if not defined or failed to load.
    """
    schema_path = os.getenv("OUTPUT_SCHEMA_PATH")
    if not schema_path or not os.path.exists(schema_path):
        return None
    try:
        with open(schema_path) as f:
            schema = json.loads(f.read())
        print(f"Loaded output schema: {type(schema).__name__}", flush=True)
        return schema
    except Exception as e:
        print(f"Warning: Failed to load output schema: {e}", flush=True)
        return None


def _coerce_type(value, example_value):
    """Cast value to match the type of the schema's example value."""
    if example_value is None or value is None:
        return value
    target_type = type(example_value)
    if isinstance(value, target_type):
        return value
    try:
        if target_type == float:
            return float(value)
        elif target_type == int:
            return int(value)
        elif target_type == str:
            return str(value)
        elif target_type == bool:
            return bool(value)
    except (ValueError, TypeError):
        pass
    return value


def _filter_dict(prediction_dict, schema_dict):
    """
    Filter a prediction dict to match the schema dict exactly.
    Only includes keys present in the schema; missing keys get None;
    values are type-coerced to match schema example types.
    """
    result = {}
    for key, example_value in schema_dict.items():
        if key in prediction_dict:
            result[key] = _coerce_type(prediction_dict[key], example_value)
        else:
            result[key] = None
    return result


def apply_schema(prediction, schema):
    """
    Strictly format prediction output to match the defined output schema.
    Returns the formatted prediction, or None to signal fallback to defaults.

    Behavior:
    - schema is None          -> returns None (caller uses default behavior)
    - schema is dict          -> unwraps single-item lists, filters keys
    - schema is list[dict]    -> wraps single dicts, filters each item's keys
    - schema shape mismatch   -> returns None (caller uses default behavior)
    """
    if schema is None:
        return None

    # Schema is a single object
    if isinstance(schema, dict):
        if isinstance(prediction, list) and len(prediction) == 1:
            item = prediction[0]
            if isinstance(item, dict):
                return _filter_dict(item, schema)
        if isinstance(prediction, dict):
            return _filter_dict(prediction, schema)

    # Schema is a list of objects
    if isinstance(schema, list) and len(schema) > 0 and isinstance(schema[0], dict):
        template = schema[0]
        if isinstance(prediction, dict):
            return [_filter_dict(prediction, template)]
        if isinstance(prediction, list):
            return [
                _filter_dict(item, template) if isinstance(item, dict) else item
                for item in prediction
            ]

    return None
