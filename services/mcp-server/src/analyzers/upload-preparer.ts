import path from 'node:path';

export interface ScanFile {
  path: string;
  size: number;
  content?: string;
}

export interface UploadPreparationResult {
  isValid: boolean;
  modelName: string;
  suggestedName: string;
  suggestedDescription: string;
  suggestedTags: string[];
  suggestedParameters: {
    framework: string;
    type: string;
    taskType: string;
  };
  detectedFiles: {
    modelFile?: string;
    scalerFile?: string;
    preprocessFile?: string;
    postprocessFile?: string;
    configFiles: string[];
  };
  warnings: string[];
  missingElements: string[];
  errors: string[];
}

/**
 * Capitalizes and cleans file/folder names into a suggested model name.
 */
function cleanName(raw: string): string {
  const base = path.basename(raw, path.extname(raw));
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Best-effort static verification of preprocess/postprocess scripts.
 * Looks for entry points and common patterns without executing the code.
 */
function verifyPythonScript(
  fileName: string,
  content: string | undefined,
  expectedFunction: string,
  warnings: string[],
): { hasExpected: boolean } {
  if (content === undefined) {
    warnings.push(
      `Content for script '${fileName}' was not provided to the analysis tool. ` +
        `Unable to verify entry points statically.`,
    );
    return { hasExpected: false };
  }
  const regex = new RegExp(`def\\s+${expectedFunction}\\s*\\(`);
  const hasExpected = regex.test(content);
  if (!hasExpected) {
    warnings.push(
      `The script '${fileName}' does not appear to define 'def ${expectedFunction}(...)'. ` +
        `The platform's server runner expects this entry point function.`,
    );
  }
  return { hasExpected };
}

/**
 * Scan a list of files and metadata supplied by the client, execute schema/metadata checks,
 * and generate suggested names, tags, and deployment parameters.
 *
 * @param files - Array of files with path and size, plus optional script content.
 * @param modelTypeHint - Optional hint for model type classification.
 * @returns Scanned model layout, metadata suggestions, and warnings.
 */
export function prepareModelUpload(
  files: ScanFile[],
  modelTypeHint?: string,
): UploadPreparationResult {
  const result: UploadPreparationResult = {
    isValid: true,
    modelName: 'Unknown Model',
    suggestedName: '',
    suggestedDescription: '',
    suggestedTags: [],
    suggestedParameters: {
      framework: 'CUSTOM',
      type: 'TABULAR',
      taskType: 'OTHER',
    },
    detectedFiles: {
      configFiles: [],
    },
    warnings: [],
    missingElements: [],
    errors: [],
  };

  if (!files || files.length === 0) {
    result.isValid = false;
    result.errors.push('No files supplied in the files list.');
    return result;
  }

  // 1. Identify files
  let mainModelFile: ScanFile | undefined;
  const configFiles: string[] = [];

  for (const file of files) {
    // Normalize path to get simple filename
    const baseName = path.basename(file.path);
    const lowerName = baseName.toLowerCase();

    // Size limit check (15GB)
    const limit15GB = 15 * 1024 * 1024 * 1024;
    if (file.size > limit15GB) {
      result.warnings.push(
        `File '${baseName}' is very large (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB) ` +
          `and may exceed the platform's 15GB upload limit.`,
      );
    }

    if (lowerName === 'preprocess.py') {
      result.detectedFiles.preprocessFile = baseName;
    } else if (lowerName === 'postprocess.py') {
      result.detectedFiles.postprocessFile = baseName;
    } else if (
      lowerName === 'scaler.pkl' ||
      lowerName === 'scaler.joblib' ||
      lowerName.includes('scaler')
    ) {
      result.detectedFiles.scalerFile = baseName;
    } else if (
      lowerName === 'config.json' ||
      lowerName === 'model_index.json' ||
      lowerName === 'saved_model.pb' ||
      lowerName === 'model_info.json'
    ) {
      configFiles.push(baseName);
    } else if (
      lowerName.endsWith('.pkl') ||
      lowerName.endsWith('.joblib') ||
      lowerName.endsWith('.pt') ||
      lowerName.endsWith('.pth') ||
      lowerName.endsWith('.onnx') ||
      lowerName.endsWith('.h5') ||
      lowerName.endsWith('.hdf5') ||
      lowerName.endsWith('.gguf') ||
      lowerName.endsWith('.safetensors') ||
      lowerName === 'pytorch_model.bin'
    ) {
      // Prioritize weights file
      if (!mainModelFile || (!mainModelFile.path.endsWith('.safetensors') && lowerName.endsWith('.safetensors'))) {
        mainModelFile = file;
      }
    }
  }

  result.detectedFiles.configFiles = configFiles;
  if (mainModelFile) {
    const baseName = path.basename(mainModelFile.path);
    result.detectedFiles.modelFile = baseName;
    result.modelName = baseName;
  }

  // 2. Framework & Task detection
  let detectedFramework = 'CUSTOM';
  let detectedType = 'TABULAR';
  let detectedTask = 'OTHER';

  const ext = mainModelFile ? path.extname(mainModelFile.path).toLowerCase() : '';
  const hasConfig = configFiles.includes('config.json');
  const hasModelIndex = configFiles.includes('model_index.json');
  const hasSavedModel = configFiles.includes('saved_model.pb');

  if (hasModelIndex) {
    detectedFramework = 'DIFFUSERS';
    detectedType = 'DIFFUSION';
    detectedTask = 'TEXT_TO_IMAGE';
  } else if (hasConfig) {
    detectedFramework = 'HUGGINGFACE';
    detectedType = 'NLP';
    detectedTask = 'TEXT_GENERATION';
  } else if (ext === '.gguf' || modelTypeHint?.toUpperCase() === 'LLM_GGUF') {
    detectedFramework = 'GGUF';
    detectedType = 'NLP';
    detectedTask = 'TEXT_GENERATION';
  } else if (ext === '.onnx') {
    detectedFramework = 'ONNX';
  } else if (ext === '.pt' || ext === '.pth' || (mainModelFile && path.basename(mainModelFile.path) === 'pytorch_model.bin')) {
    detectedFramework = 'PYTORCH';
  } else if (hasSavedModel || ext === '.h5' || ext === '.hdf5') {
    detectedFramework = 'TENSORFLOW';
  } else if (ext === '.pkl' || ext === '.joblib') {
    detectedFramework = 'SKLEARN';
  }

  // Apply modelTypeHint overrides if specified
  if (modelTypeHint) {
    const hint = modelTypeHint.toUpperCase();
    if (hint === 'NLP') {
      detectedType = 'NLP';
      detectedTask = 'GENERATION';
    } else if (hint === 'VISION') {
      detectedType = 'VISION';
      detectedTask = 'CLASSIFICATION';
    } else if (hint === 'TABULAR') {
      detectedType = 'TABULAR';
      detectedTask = 'CLASSIFICATION';
    } else if (hint === 'DIFFUSION') {
      detectedType = 'DIFFUSION';
      detectedTask = 'TEXT_TO_IMAGE';
    } else if (hint === 'LLM_GGUF') {
      detectedType = 'NLP';
      detectedTask = 'GENERATION';
      detectedFramework = 'GGUF';
    }
  } else {
    // Basic heuristics for type detection if no hint
    const weightsName = mainModelFile ? path.basename(mainModelFile.path).toLowerCase() : '';
    const dirName = (mainModelFile ? path.dirname(mainModelFile.path) : '').toLowerCase();
    const context = `${weightsName} ${dirName}`;

    // 1. Detect Model Type
    if (
      context.includes('bert') ||
      context.includes('gpt') ||
      context.includes('llama') ||
      context.includes('sentiment') ||
      context.includes('text') ||
      context.includes('nlp') ||
      context.includes('translation') ||
      detectedFramework === 'HUGGINGFACE' ||
      detectedFramework === 'GGUF'
    ) {
      detectedType = 'NLP';
    } else if (
      context.includes('mnist') ||
      context.includes('cnn') ||
      context.includes('image') ||
      context.includes('vision') ||
      context.includes('resnet') ||
      context.includes('yolo') ||
      context.includes('photo') ||
      context.includes('mobilenet') ||
      context.includes('densenet') ||
      context.includes('vgg') ||
      context.includes('efficientnet') ||
      detectedFramework === 'DIFFUSERS'
    ) {
      detectedType = 'VISION';
    } else {
      detectedType = 'TABULAR';
    }

    // 2. Detect Task Type
    if (detectedType === 'DIFFUSION' || context.includes('diffusion') || context.includes('text-to-image') || context.includes('txt2img')) {
      detectedTask = 'TEXT_TO_IMAGE';
    } else if (context.includes('yolo') || context.includes('object-detect') || context.includes('detection')) {
      detectedTask = 'OBJECT_DETECTION';
    } else if (context.includes('segment') || context.includes('segmentation')) {
      detectedTask = 'SEGMENTATION';
    } else if (context.includes('embed') || context.includes('embedding')) {
      detectedTask = 'EMBEDDING';
    } else if (context.includes('chat') || context.includes('dialogue') || context.includes('conversation')) {
      detectedTask = 'CHAT';
    } else if (context.includes('generate') || context.includes('generation') || context.includes('gpt') || context.includes('llama') || detectedFramework === 'GGUF' || (detectedFramework === 'HUGGINGFACE' && context.includes('causallm'))) {
      detectedTask = 'GENERATION';
    } else if (
      context.includes('classifier') ||
      context.includes('classification') ||
      context.includes('clf') ||
      context.includes('sentiment') ||
      context.includes('mnist') ||
      context.includes('churn') ||
      context.includes('logistic') ||
      context.includes('svc') ||
      context.includes('xgbclassifier')
    ) {
      detectedTask = 'CLASSIFICATION';
    } else if (
      context.includes('regressor') ||
      context.includes('regression') ||
      context.includes('reg') ||
      context.includes('predict') ||
      context.includes('linear') ||
      context.includes('svr') ||
      context.includes('xgbregressor')
    ) {
      detectedTask = 'REGRESSION';
    } else {
      // Fallback defaults based on type
      if (detectedType === 'VISION') {
        detectedTask = 'CLASSIFICATION';
      } else if (detectedType === 'NLP') {
        detectedTask = 'GENERATION';
      } else {
        detectedTask = 'CLASSIFICATION';
      }
    }
  }

  // 3. Static checks and warnings (what could go wrong with detect_schema/load)
  if (!mainModelFile && configFiles.length === 0) {
    result.isValid = false;
    result.errors.push('No model weights file (e.g. .pkl, .pt, .onnx, .gguf) or model directory structures found.');
  }

  // Framework-specific warning checks
  const isMultiFile = files.length > 1;

  // Framework-specific warning checks
  if (detectedFramework === 'PYTORCH') {
    const isAutoSupportedVision = detectedType === 'VISION' && mainModelFile && (() => {
      const bn = path.basename(mainModelFile.path).toLowerCase();
      const autoSupported = ['mobilenet_v3', 'mobilenet_v2', 'resnet18', 'resnet34', 'resnet50', 'resnet101'];
      return autoSupported.some(arch => bn.includes(arch));
    })();

    if (!isAutoSupportedVision) {
      if (isMultiFile) {
        const preprocessName = result.detectedFiles.preprocessFile;
        if (!preprocessName) {
          result.warnings.push(
            'PyTorch weights (.pt/.pth) are frequently saved as a state_dict (OrderDict containing weights only) rather than a complete model. ' +
              'If this model is a state_dict, automatic schema detection and serving WILL FAIL during packaging. ' +
              'Recommendation: Add a preprocess.py file defining a load_model(model_path) function that returns the instantiated PyTorch model.',
          );
        } else {
          const prepFileObj = files.find((f) => path.basename(f.path).toLowerCase() === 'preprocess.py');
          const prepVerify = verifyPythonScript('preprocess.py', prepFileObj?.content, 'load_model', result.warnings);
          if (!prepVerify.hasExpected) {
            result.warnings.push(
              `A preprocess.py file is present, but it is missing load_model(model_path). ` +
                `If your PyTorch checkpoint is a state_dict, you MUST define load_model to instantiate your model structure.`,
            );
          }
        }
      } else {
        result.warnings.push(
          'You are preparing a single PyTorch weights file. If this file contains a state_dict, ' +
            'uploading it without a preprocess.py file containing a load_model function will fail to deploy. ' +
            'It is recommended to organize your model and preprocess.py in a directory before uploading.',
        );
      }
    }
  }

  if (detectedFramework === 'SKLEARN') {
    result.warnings.push(
      'Scikit-learn models (.pkl/.joblib) containing custom estimators, transformers, or pipeline steps ' +
        'require those custom objects to be defined or imported. If these custom classes are not defined ' +
        'in a custom preprocess.py script, deserialization/schema detection will raise ModuleNotFoundError or AttributeError.',
    );
  }

  if (detectedFramework === 'HUGGINGFACE') {
    const hasWeights =
      files.some((f) => {
        const bn = path.basename(f.path).toLowerCase();
        return bn === 'pytorch_model.bin' || bn === 'model.safetensors' || bn.endsWith('.bin') || bn.endsWith('.safetensors');
      });
    if (!hasWeights) {
      result.warnings.push(
        'Hugging Face model directory layout detected (config.json found), but no model weight files ' +
          '(pytorch_model.bin, model.safetensors, etc.) were found in the folder.',
      );
    }
  }

  // Preprocess/Postprocess functions checks
  if (isMultiFile) {
    if (result.detectedFiles.preprocessFile) {
      const fileObj = files.find((f) => path.basename(f.path).toLowerCase() === 'preprocess.py');
      verifyPythonScript('preprocess.py', fileObj?.content, 'preprocess', result.warnings);
    }
    if (result.detectedFiles.postprocessFile) {
      const fileObj = files.find((f) => path.basename(f.path).toLowerCase() === 'postprocess.py');
      verifyPythonScript('postprocess.py', fileObj?.content, 'postprocess', result.warnings);
    }
  }

  // 4. Suggestions
  const targetName = mainModelFile ? path.basename(mainModelFile.path) : (files[0] ? path.basename(files[0].path) : 'model');
  result.suggestedName = cleanName(targetName);
  result.suggestedDescription = `A ${detectedFramework} ${detectedType.toLowerCase()} model for ${detectedTask.toLowerCase()} tasks.`;

  const tags = [detectedFramework.toLowerCase(), detectedType.toLowerCase(), detectedTask.toLowerCase().replace(/_/g, '-')];
  if (ext) {
    tags.push(ext.slice(1));
  }
  result.suggestedTags = Array.from(new Set(tags));

  result.suggestedParameters = {
    framework: detectedFramework,
    type: detectedType,
    taskType: detectedTask,
  };

  return result;
}
