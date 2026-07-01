"""
schema_utils.py
---------------
Shared output schema enforcement utilities for all serve templates.
Loads the output schema from OUTPUT_SCHEMA_PATH and provides _apply_schema()
to strictly format prediction output to match the user-defined expectedResult.
"""

import os


def load_output_schema():
    """
    No-op: The schema (exampleResult / expectedResult) is informational-only.
    """
    return None


def apply_schema(prediction, schema):
    """
    No-op: The schema (exampleResult / expectedResult) is informational-only.
    """
    return None