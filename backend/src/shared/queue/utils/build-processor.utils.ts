import * as fs from 'fs';
import * as path from 'path';
import { Framework } from '../../../modules/models/enums/framework.enum';
import { ModelType } from '../../../modules/models/enums/model-type.enum';
import { TaskType } from '../../../modules/models/enums/task-type.enum';

export function isZipFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    return buffer.readUInt32LE(0) === 0x04034b50;
  } catch {
    return false;
  }
}

export function moveDirOrFile(src: string, dest: string): void {
  try {
    fs.renameSync(src, dest);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code !== 'EXDEV') {
      throw err;
    }
    const isDir = fs.statSync(src).isDirectory();
    if (isDir) {
      fs.cpSync(src, dest, { recursive: true });
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    }
  }
}

export function findFileRecursive(
  dir: string,
  filename: string,
): string | null {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const res = findFileRecursive(fullPath, filename);
      if (res) return res;
    } else if (file.toLowerCase() === filename.toLowerCase()) {
      return fullPath;
    }
  }
  return null;
}

export function detectModelMetadata(params: {
  originalFileName: string;
  buildDir: string;
  currentFramework: Framework;
  currentType: ModelType;
  currentTaskType: TaskType;
}): {
  detectedFramework: Framework;
  detectedType: ModelType;
  detectedTaskType: TaskType;
} {
  let detectedFramework = params.currentFramework;
  let detectedType = params.currentType;
  let detectedTaskType = params.currentTaskType;

  const originalFileName = params.originalFileName.toLowerCase();

  if (originalFileName.endsWith('.pt') || originalFileName.endsWith('.pth')) {
    detectedFramework = Framework.PYTORCH;
  } else if (
    originalFileName.endsWith('.h5') ||
    originalFileName.endsWith('.keras') ||
    originalFileName.endsWith('.pb')
  ) {
    detectedFramework = Framework.TENSORFLOW;
  } else if (originalFileName.endsWith('.onnx')) {
    detectedFramework = Framework.ONNX;
  } else if (
    originalFileName.endsWith('.pkl') ||
    originalFileName.endsWith('.joblib')
  ) {
    detectedFramework = Framework.SKLEARN;
  } else if (originalFileName.endsWith('.gguf')) {
    detectedFramework = Framework.LLAMA_CPP;
    detectedType = ModelType.LLM_GGUF;
  }

  if (detectedType !== ModelType.LLM_GGUF) {
    if (
      originalFileName.includes('diffusion') ||
      originalFileName.includes('stable-diffusion') ||
      originalFileName.includes('sdxl')
    ) {
      detectedType = ModelType.DIFFUSION;
    } else if (
      /mobilenet|resnet|vgg|efficientnet|vit|yolo|inception|convnext|densenet/i.test(
        originalFileName,
      )
    ) {
      detectedType = ModelType.VISION;
    } else if (
      /bert|gpt|llama|roberta|t5|distilbert|sentiment|text|nlp|translation/i.test(
        originalFileName,
      )
    ) {
      detectedType = ModelType.NLP;
    }
  }

  const unzippedDir = path.join(params.buildDir, 'unzipped_model');
  if (fs.existsSync(unzippedDir) && fs.statSync(unzippedDir).isDirectory()) {
    const modelIndexJson = findFileRecursive(unzippedDir, 'model_index.json');
    if (modelIndexJson) {
      detectedType = ModelType.DIFFUSION;
      detectedFramework = Framework.PYTORCH;
    }

    const configJsonPath = findFileRecursive(unzippedDir, 'config.json');
    if (configJsonPath && detectedType !== ModelType.DIFFUSION) {
      try {
        const configData = JSON.parse(fs.readFileSync(configJsonPath, 'utf8'));
        const archs = (configData.architectures || [])
          .map((a: string) => a.toLowerCase())
          .join(' ');
        const modelTypeField = (configData.model_type || '').toLowerCase();

        if (
          /vit|resnet|mobilenet|convnext|yolo|swin|deit|clip/i.test(
            archs + ' ' + modelTypeField,
          )
        ) {
          detectedType = ModelType.VISION;
          detectedFramework = Framework.PYTORCH;
        } else if (
          /bert|gpt|llama|t5|bart|roberta|distilbert|bloom|opt|mpt|falcon/i.test(
            archs + ' ' + modelTypeField,
          )
        ) {
          detectedType = ModelType.NLP;
          detectedFramework = Framework.PYTORCH;
        }
      } catch {}
    }

    if (
      findFileRecursive(unzippedDir, 'pytorch_model.bin') ||
      findFileRecursive(unzippedDir, 'model.safetensors')
    ) {
      detectedFramework = Framework.PYTORCH;
    } else if (
      findFileRecursive(unzippedDir, 'tf_model.h5') ||
      findFileRecursive(unzippedDir, 'saved_model.pb')
    ) {
      detectedFramework = Framework.TENSORFLOW;
    } else if (findFileRecursive(unzippedDir, 'model.onnx')) {
      detectedFramework = Framework.ONNX;
    }
  }

  const checkCodeHeuristics = (filePath: string) => {
    if (!fs.existsSync(filePath)) return;
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      if (/import\s+torch\b|from\s+torch\b/i.test(content)) {
        detectedFramework = Framework.PYTORCH;
      } else if (
        /import\s+tensorflow\b|from\s+tensorflow\b|import\s+keras\b|from\s+keras\b/i.test(
          content,
        )
      ) {
        detectedFramework = Framework.TENSORFLOW;
      } else if (/import\s+onnxruntime\b|import\s+onnx\b/i.test(content)) {
        detectedFramework = Framework.ONNX;
      } else if (/import\s+sklearn\b|from\s+sklearn\b/i.test(content)) {
        detectedFramework = Framework.SKLEARN;
      }

      if (
        detectedType !== ModelType.DIFFUSION &&
        detectedType !== ModelType.LLM_GGUF
      ) {
        if (/diffusers\b/i.test(content)) {
          detectedType = ModelType.DIFFUSION;
        } else if (
          /cv2\b|PIL\b|Image\b|torchvision|skimage|matplotlib/i.test(content)
        ) {
          detectedType = ModelType.VISION;
        } else if (
          /transformers\b|nltk\b|spacy\b|tokenizers\b|sentencepiece\b|gensim\b/i.test(
            content,
          )
        ) {
          detectedType = ModelType.NLP;
        }
      }
    } catch {}
  };

  checkCodeHeuristics(path.join(params.buildDir, 'preprocess.py'));
  checkCodeHeuristics(path.join(params.buildDir, 'postprocess.py'));

  if (
    detectedFramework !== params.currentFramework ||
    detectedType !== params.currentType
  ) {
    if (detectedType === ModelType.DIFFUSION) {
      detectedTaskType = TaskType.GENERATION;
    } else if (detectedType === ModelType.LLM_GGUF) {
      detectedTaskType = TaskType.CHAT;
    } else if (
      detectedType === ModelType.VISION &&
      (detectedTaskType as string) === 'OTHER'
    ) {
      detectedTaskType = TaskType.CLASSIFICATION;
    } else if (
      detectedType === ModelType.NLP &&
      (detectedTaskType as string) === 'OTHER'
    ) {
      detectedTaskType = TaskType.CLASSIFICATION;
    }
  }

  return {
    detectedFramework,
    detectedType,
    detectedTaskType,
  };
}
