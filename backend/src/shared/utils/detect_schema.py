import os
import sys
import glob
try:
    from torchvision import _internally_replaced_utils
except ImportError:
    pass
from dataclasses import dataclass, field
from typing import Optional, List
import json
import pickle

@dataclass
class SchemaField:
    name: str
    type: str
    dtype: str = "float32"

    shape: Optional[List] = None
    dynamic_shape: Optional[List] = None

    feature_names: Optional[List[str]] = None
    labels: Optional[List[str]] = None

    inferred: bool = False


@dataclass
class UnifiedSchema:
    framework: str = "unknown"
    task_type: str = "unknown"

    confidence: float = 0.0

    warnings: List[str] = field(default_factory=list)

    inputs: List[SchemaField] = field(default_factory=list)
    outputs: List[SchemaField] = field(default_factory=list)

    def generate_example_payload(self) -> str:
        task = self.task_type.lower()
        is_vision = False
        for x in self.inputs:
            if x.type == "image" or x.type == "tensor" or x.name == "image":
                is_vision = True
                break

        if "text_classification" in task or "sequence_classification" in task:
            payload = {"text": "This is a sample input text for the model."}
        elif "text_generation" in task or "causal_lm" in task:
            payload = {"prompt": "Once upon a time"}
        elif "diffusion" in task or "text_to_image" in task:
            payload = {"prompt": "A beautiful sunset over the mountains"}
        elif "image" in task or is_vision:
            payload = {"image": "base64_encoded_image_string"}
        else:
            payload = {}
            has_features = False
            for x in self.inputs:
                if x.feature_names:
                    has_features = True
                    for fname in x.feature_names:
                        payload[fname] = 0.0
                elif x.type == "tabular" and x.shape and len(x.shape) > 1 and isinstance(x.shape[1], int):
                    has_features = True
                    feature_count = x.shape[1]
                    for i in range(feature_count):
                        payload[f"feature_{i}"] = 0.0
            if not has_features:
                if self.inputs and self.inputs[0].shape and len(self.inputs[0].shape) > 1 and isinstance(self.inputs[0].shape[1], int):
                    feature_count = self.inputs[0].shape[1]
                    for i in range(feature_count):
                        payload[f"feature_{i}"] = 0.0
                else:
                    payload = {"features": [0.0, 0.0, 0.0]}
        
        return json.dumps(payload, indent=2)

    def generate_expected_result(self) -> str:
        task = self.task_type.lower()
        is_vision = False
        for x in self.inputs:
            if x.type == "image" or x.type == "tensor" or x.name == "image":
                is_vision = True
                break

        if "text_classification" in task or "sequence_classification" in task:
            labels = []
            for x in self.outputs:
                if x.labels:
                    labels = x.labels
                    break
            pred_label = labels[0] if labels else "POSITIVE"
            result = {
                "text": "This is a sample input text for the model.",
                "raw_score": 0.85,
                "label": pred_label,
                "confidence": 85.0,
                "positive_pct": 85.0,
                "negative_pct": 15.0,
                "intensity": "strong"
            }
        elif "classification" in task or is_vision:
            labels = []
            for x in self.outputs:
                if x.labels:
                    labels = x.labels
                    break
            if is_vision and not labels:
                result = {
                    "class_id": 0
                }
            else:
                pred_label = labels[0] if labels else "class_0"
                result = {
                    "prediction": pred_label,
                    "probability": 0.95
                }
        elif "text_generation" in task:
            result = {
                "generated_text": "This is the generated continuation of the text."
            }
        elif "diffusion" in task or "text_to_image" in task:
            result = {
                "image": "base64_encoded_png_data"
            }
        else:
            result = {
                "prediction": 0.0
            }
        return json.dumps(result, indent=2)

    def to_dict(self):

        inputs = []

        for x in self.inputs:

            # Feature names available
            if x.feature_names:

                for fname in x.feature_names:

                    inputs.append({
                        "name": fname,
                        "type": "float"
                    })

            elif x.type == "image":

                inputs.append({
                    "name": x.name,
                    "type": "image",
                    "dtype": x.dtype,
                    "shape": x.shape,
                    "dynamic_shape": x.dynamic_shape
                })
                
            # Shape available but no names
            elif x.type == "tabular":

                feature_count = x.shape[1]

                for i in range(feature_count):

                    inputs.append({
                        "name": f"feature_{i}",
                        "type": "float"
                    })

            else:

                inputs.append({
                    "name": x.name,
                    "type": x.type,
                    "dtype": x.dtype,
                    "shape": x.shape,
                    "dynamic_shape": x.dynamic_shape
                })

        return {
            "framework": self.framework,
            "task": self.task_type,
            "confidence": self.confidence,

            "inputs": inputs,

            "outputs": [
                {
                    "name": x.name,
                    "type": x.type,
                    "labels": x.labels
                }
                for x in self.outputs
            ],

            "example_payload": self.generate_example_payload(),
            "expected_result": self.generate_expected_result(),

            "warnings": self.warnings
        }

    def to_json(self):
        return json.dumps(
            self.to_dict(),
            indent=2
        )

class ClassDetector(pickle.Unpickler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.detected_module = None
    def find_class(self, module, name):
        if self.detected_module is None: self.detected_module = module
        return type(name, (), {})

def detect_model_type(path: str):
    ext = os.path.splitext(path)[1].lower()
    if ext == '.onnx': return "onnx"
    if ext in ('.h5', '.hdf5', '.pb'): return "tensorflow"
    if ext in ('.pt', '.pth'): return "pytorch"
    if ext in ('.pkl', '.joblib'):
        try:
            with open(path, 'rb') as f:
                d = ClassDetector(f)
                try: d.load()
                except: pass
                mod = str(d.detected_module).lower()
                if 'sklearn' in mod: return "sklearn"
        except: pass
        return "sklearn"  # Default fallback for unknown pickles
        
    if os.path.isdir(path):

        files = os.listdir(path)

        if "model_index.json" in files:
            return "diffusers"

        if "config.json" in files:
            return "huggingface"

        if "saved_model.pb" in files:
            return "tensorflow"

        if "model_info.json" in files:

            with open(
                os.path.join(path, "model_info.json"),
                "r"
            ) as f:

                info = json.load(f)

            return info.get(
                "framework",
                "unknown"
            )


class SklearnIntrospector:

    def detect_nlp_task(self, model):
        try:

            if hasattr(model, "steps"):

                for _, step in model.steps:

                    cls = type(step).__name__.lower()

                    if "tfidf" in cls:
                        return True

                    if "countvectorizer" in cls:
                        return True

                    if "vectorizer" in cls:
                        return True

        except:
            pass

        return False

    def infer_input_type(self, model, filename):

        result = {
            "type": "tabular",
            "confidence": 0.5
        }

        n_features = getattr(model, "n_features_in_", None)

        image_score = 0

        if n_features:
            import math

            side = int(math.sqrt(n_features))

            if side * side == n_features:
                image_score += 25

        fname = filename.lower()

        image_keywords = [
            "image",
            "vision",
            "cnn",
            "mnist",
            "digit",
            "face",
            "photo",
            "object"
        ]

        if any(k in fname for k in image_keywords):
            image_score += 50

        feature_names = getattr(
            model,
            "feature_names_in_",
            None
        )

        if feature_names is not None:

            pixel_count = sum(
                "pixel" in str(f).lower()
                for f in feature_names
            )

            if pixel_count > 0:
                image_score += 50

        if image_score >= 60:

            side = int(math.sqrt(n_features))

            return {
                "type": "image",
                "shape": [1, side, side],
                "confidence": image_score / 100
            }

        return result

    def _find_feature_names(self, model):
        if hasattr(model, 'feature_names_in_'): return model.feature_names_in_.tolist()
        if hasattr(model, 'feature_names'): return list(model.feature_names)
        if hasattr(model, 'get_booster'):
            try: return model.get_booster().feature_names
            except: pass
        if hasattr(model, 'steps') and len(model.steps) > 0:
            first_step = model.steps[0][1]
            if hasattr(first_step, 'feature_names_in_'): return first_step.feature_names_in_.tolist()
            if hasattr(first_step, 'get_feature_names_out'):
                try: return first_step.get_feature_names_out().tolist()
                except: pass
        return None

    def _infer_type_from_name(self, filename):
        lower_name = filename.lower()
        if any(x in lower_name for x in ["digit", "image", "vision", "face", "cnn", "photo"]):
            return "image"
        if any(x in lower_name for x in ["sentiment", "text", "spam", "nlp", "language"]):
            return "text"
        return "tabular"

    def introspect(self, path: str, model_type_hint: str = "", original_filename: str = "") -> UnifiedSchema:
        import joblib
        schema = UnifiedSchema(framework="sklearn")
        # Use the original filename for heuristics if provided, otherwise fall back to the temp path basename
        filename = original_filename if original_filename else os.path.basename(path)
        
        # HEURISTIC: Guess type based on filename context
        inferred_type = self._infer_type_from_name(filename)
        
        try:
            model = joblib.load(path)
        except Exception as e:
            schema.warnings.append(f"Could not fully load model due to missing custom code: {str(e)[:100]}")
            # If the user explicitly chose NLP or filename suggests NLP, produce a text schema even on load failure
            if model_type_hint.upper() == "NLP" or inferred_type == "text":
                schema.task_type = "text_classification"
                schema.confidence = 0.7
                schema.inputs.append(SchemaField(name="text", type="string", dtype="string"))
                schema.outputs.append(SchemaField(name="prediction", type="string"))
                return schema
            schema.inputs.append(SchemaField(name="features", type=inferred_type, dtype="float64", shape=[None, 5]))
            schema.outputs.append(SchemaField(name="prediction", type="continuous"))
            return schema
            
        actual = model.steps[-1][1] if hasattr(model, 'steps') else model
        schema.task_type = "classification" if hasattr(actual, 'classes_') else "regression"

        is_nlp = self.detect_nlp_task(model)

        # Also treat as NLP if the user explicitly selected NLP model type or filename strongly suggests it
        if not is_nlp and (model_type_hint.upper() == "NLP" or inferred_type == "text"):
            is_nlp = True

        if is_nlp:

            schema.task_type = "text_classification"
            schema.confidence = 1.0

            schema.inputs.append(
                SchemaField(
                    name="text",
                    type="string",
                    dtype="string"
                )
            )

            labels = (
                actual.classes_.tolist()
                if hasattr(actual, "classes_")
                else []
            )

            schema.outputs.append(
                SchemaField(
                    name="label",
                    type="integer",
                    labels=labels
                )
            )

            schema.outputs.append(
                SchemaField(
                    name="confidence",
                    type="float"
                )
            )

            return schema
            
        # Feature Extraction
        input_info = self.infer_input_type(
            model,
            filename
        )

        if input_info["type"] == "image":

            schema.task_type = "image_classification"
            schema.confidence = input_info["confidence"]

            schema.inputs.append(
                SchemaField(
                    name="image",
                    type="image",
                    dtype="float32",
                    shape=input_info["shape"]
                )
            )

        else:

            inp = SchemaField(
                name="features",
                type="tabular",
                dtype="float64"
            )

            f_names = self._find_feature_names(model)

            if f_names:
                inp.feature_names = f_names
                inp.shape = [None, len(f_names)]

            elif hasattr(model, "n_features_in_"):
                inp.shape = [None, model.n_features_in_]

            schema.inputs.append(inp)
        
        # Output Generation
        if schema.task_type == "image_classification":

            labels = (
                actual.classes_.tolist()
                if hasattr(actual, "classes_")
                else None
            )

            schema.outputs.append(
                SchemaField(
                    name="class_name",
                    type="string",
                    labels=labels
                )
            )

            schema.outputs.append(
                SchemaField(
                    name="confidence",
                    type="float"
                )
            )

        elif schema.task_type == "classification":

            labels = (
                actual.classes_.tolist()
                if hasattr(actual, "classes_")
                else []
            )

            schema.outputs.append(
                SchemaField(
                    name="prediction",
                    type="class_label",
                    labels=labels
                )
            )

            schema.outputs.append(
                SchemaField(
                    name="probability",
                    type="float"
                )
            )

        else:

            schema.outputs.append(
                SchemaField(
                    name="prediction",
                    type="float"
                )
            )
            
        return schema

class PyTorchIntrospector:

    def introspect(self, path):

        schema = UnifiedSchema(
            framework="pytorch"
        )

        try:

            import torch

            checkpoint = torch.load(
                path,
                map_location="cpu"
            )

            schema.confidence = 0.5

            schema.task_type = "image_classification"

            schema.inputs.append(
                SchemaField(
                    name="image",
                    type="tensor",
                    dtype="float32",

                    shape=None,

                    dynamic_shape=[
                        "N",
                        3,
                        "H",
                        "W"
                    ],

                    inferred=True
                )
            )

            schema.outputs.append(
                SchemaField(
                    name="class_name",
                    type="string"
                )
            )

            schema.outputs.append(
                SchemaField(
                    name="confidence",
                    type="float"
                )
            )

            return schema

        except Exception as e:

            schema.warnings.append(str(e))

            schema.inputs.append(
                SchemaField(
                    name="image",
                    type="tensor",

                    dynamic_shape=[
                        "N",
                        3,
                        "H",
                        "W"
                    ],

                    inferred=True
                )
            )

            return schema

class HuggingFaceIntrospector:

    def introspect(self, path):

        with open(
            os.path.join(path, "config.json")
        ) as f:

            config = json.load(f)

        arch = config.get(
            "architectures",
            ["Unknown"]
        )[0]

        schema = UnifiedSchema(
            framework="huggingface",
            confidence=1.0
        )

        if arch.endswith(
            "ForSequenceClassification"
        ):

            schema.task_type = (
                "text_classification"
            )

            schema.inputs.append(
                SchemaField(
                    name="text",
                    type="string"
                )
            )

            schema.outputs.append(
                SchemaField(
                    name="label",
                    type="string"
                )
            )

            schema.outputs.append(
                SchemaField(
                    name="score",
                    type="float"
                )
            )

        elif arch.endswith(
            "ForCausalLM"
        ):

            schema.task_type = (
                "text_generation"
            )

            schema.inputs.append(
                SchemaField(
                    name="prompt",
                    type="string"
                )
            )

            schema.outputs.append(
                SchemaField(
                    name="generated_text",
                    type="string"
                )
            )

        return schema


class TensorFlowIntrospector:

    def introspect(self, path):

        schema = UnifiedSchema(
            framework="tensorflow"
        )

        try:

            import tensorflow as tf

            model = tf.keras.models.load_model(
                path,
                compile=False
            )

            input_shape = list(
                model.input_shape
            )

            input_shape = [
                "N" if x is None else x
                for x in input_shape
            ]

            schema.task_type = "image_classification"

            schema.confidence = 1.0

            schema.inputs.append(
                SchemaField(
                    name="image",
                    type="tensor",
                    dtype="float32",

                    shape=input_shape
                )
            )

        except Exception:

            schema.confidence = 0.5

            schema.inputs.append(
                SchemaField(
                    name="image",
                    type="tensor",

                    dynamic_shape=[
                        "N",
                        "H",
                        "W",
                        3
                    ],

                    inferred=True
                )
            )

        schema.outputs.append(
            SchemaField(
                name="class_name",
                type="string"
            )
        )

        schema.outputs.append(
            SchemaField(
                name="confidence",
                type="float"
            )
        )

        return schema

class OnnxIntrospector:

    def introspect(self, path):

        import onnx

        schema = UnifiedSchema(
            framework="onnx",
            confidence=1.0
        )

        model = onnx.load(path)

        inp = model.graph.input[0]

        dims = []

        for d in inp.type.tensor_type.shape.dim:

            if d.dim_value:
                dims.append(
                    d.dim_value
                )
            else:
                dims.append(
                    "N"
                )

        schema.inputs.append(
            SchemaField(
                name=inp.name,
                type="tensor",
                dtype="float32",
                shape=dims
            )
        )

        schema.outputs.append(
            SchemaField(
                name="prediction",
                type="tensor"
            )
        )

        return schema

class DiffusersIntrospector:

    def introspect(self, path):

        schema = UnifiedSchema(
            framework="diffusers",
            confidence=1.0
        )

        try:

            with open(
                os.path.join(path, "model_index.json"),
                "r"
            ) as f:

                model_info = json.load(f)

            pipeline_class = model_info.get(
                "_class_name",
                ""
            )

            # ------------------------
            # TEXT → IMAGE
            # ------------------------

            if "StableDiffusion" in pipeline_class \
               or "Flux" in pipeline_class:

                schema.task_type = "text_to_image"

                schema.inputs.append(
                    SchemaField(
                        name="prompt",
                        type="string",
                        dtype="string"
                    )
                )

                schema.inputs.append(
                    SchemaField(
                        name="negative_prompt",
                        type="string",
                        dtype="string"
                    )
                )

                schema.outputs.append(
                    SchemaField(
                        name="image",
                        type="image/png"
                    )
                )

            # ------------------------
            # IMAGE → IMAGE
            # ------------------------

            elif "Img2Img" in pipeline_class:

                schema.task_type = "image_to_image"

                schema.inputs.append(
                    SchemaField(
                        name="image",
                        type="image",
                        dtype="uint8",

                        dynamic_shape=[
                            "N",
                            "H",
                            "W",
                            3
                        ],

                        inferred=True
                    )
                )

                schema.inputs.append(
                    SchemaField(
                        name="prompt",
                        type="string",
                        dtype="string"
                    )
                )

                schema.outputs.append(
                    SchemaField(
                        name="generated_image",
                        type="image/png"
                    )
                )

            else:

                schema.task_type = "diffusion"

                schema.inputs.append(
                    SchemaField(
                        name="prompt",
                        type="string"
                    )
                )

                schema.outputs.append(
                    SchemaField(
                        name="image",
                        type="image/png"
                    )
                )

            return schema

        except Exception as e:

            schema.warnings.append(str(e))

            schema.task_type = "text_to_image"

            schema.inputs.append(
                SchemaField(
                    name="prompt",
                    type="string"
                )
            )

            schema.outputs.append(
                SchemaField(
                    name="image",
                    type="image/png"
                )
            )

            return schema        


def scan_directory_for_models(models_dir: str) -> List[str]:
    model_files = []
    # Files
    extensions = [ "*.pkl", "*.joblib", "*.pt", "*.pth", "*.onnx", "*.h5", "*.hdf5" ]
    for ext in extensions:
        model_files.extend(glob.glob(os.path.join(models_dir, ext)))

    # Model folders (HF, Diffusers, TensorFlow SavedModel)
    if os.path.exists(models_dir):
        for item in os.listdir(models_dir):
            full_path = os.path.join(models_dir, item)
            if os.path.isdir(full_path):
                files = os.listdir(full_path)
                if ( "config.json" in files or "model_index.json" in files or "saved_model.pb" in files or "model_info.json" in files ):
                    model_files.append(full_path)
    return model_files


def generate_schema(path: str, model_type_hint: str = "", original_filename: str = ""):
    framework = detect_model_type(path)
    if framework == "sklearn" or path.endswith('.pkl'): return SklearnIntrospector().introspect(path, model_type_hint, original_filename)
    elif framework == "pytorch": return PyTorchIntrospector().introspect(path)
    elif framework == "huggingface": return HuggingFaceIntrospector().introspect(path)
    elif framework == "tensorflow": return TensorFlowIntrospector().introspect(path)
    elif framework == "onnx": return OnnxIntrospector().introspect(path)
    elif framework == "diffusers": return DiffusersIntrospector().introspect(path)
    return None


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Auto-detect model schema")
    parser.add_argument("model_path", help="Path to the model file or directory")
    parser.add_argument("--model-type", dest="model_type", default="", help="Model type hint (e.g. NLP, TABULAR, VISION, DIFFUSION)")
    parser.add_argument("--filename", dest="filename", default="", help="Original filename of the uploaded model")
    args = parser.parse_args()

    model_path = args.model_path
    model_type_hint = args.model_type
    original_filename = args.filename
    temp_dir = None
    
    try:
        # Check if the path ends with .zip
        if model_path.lower().endswith('.zip') and os.path.exists(model_path):
            import zipfile
            import tempfile
            # Create a temp directory inside the same folder
            temp_dir = tempfile.mkdtemp(dir=os.path.dirname(model_path))
            with zipfile.ZipFile(model_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # Resolve nested directories (e.g. if the zip contains a single folder)
            items = [item for item in os.listdir(temp_dir) if not item.startswith('.') and item != '__MACOSX']
            if len(items) == 1 and os.path.isdir(os.path.join(temp_dir, items[0])):
                model_path = os.path.join(temp_dir, items[0])
            else:
                model_path = temp_dir

        # Check if the path is a directory and not a model directory itself
        is_model_dir = False
        if os.path.isdir(model_path):
            files = os.listdir(model_path)
            if ( "config.json" in files or "model_index.json" in files or "saved_model.pb" in files or "model_info.json" in files ):
                is_model_dir = True

        if os.path.isdir(model_path) and not is_model_dir:
            # It's a general directory, scan for models
            paths = scan_directory_for_models(model_path)
            results = []
            for mp in paths:
                try:
                    schema = generate_schema(mp, model_type_hint, original_filename)
                    if schema:
                        results.append({
                            "path": mp,
                            "name": os.path.basename(mp),
                            "schema": schema.to_dict()
                        })
                except Exception as e:
                    results.append({
                        "path": mp,
                        "name": os.path.basename(mp),
                        "error": str(e)
                    })
            print(json.dumps({"directory": model_path, "models": results}, indent=2))
        else:
            # Single model file/directory
            schema = generate_schema(model_path, model_type_hint, original_filename)
            if schema:
                print(schema.to_json())
            else:
                print(json.dumps({"error": "Failed to generate schema"}))
                
    except Exception as e:
        print(json.dumps({"error": str(e)}))
    finally:
        # Clean up the temporary extracted directory if it exists
        if temp_dir and os.path.exists(temp_dir):
            import shutil
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
