/**
 * Enumeration representing the ML framework or engine used to run the model.
 */
export enum Framework {
  /**
   * Scikit-Learn python framework.
   */
  SKLEARN = 'SKLEARN',
  /**
   * PyTorch deep learning framework.
   */
  PYTORCH = 'PYTORCH',
  /**
   * TensorFlow deep learning framework.
   */
  TENSORFLOW = 'TENSORFLOW',
  /**
   * Open Neural Network Exchange runtime engine.
   */
  ONNX = 'ONNX',
  /**
   * Llama.cpp C++ inference execution engine.
   */
  LLAMA_CPP = 'LLAMA_CPP',
  /**
   * vLLM high-throughput LLM serving engine.
   */
  VLLM = 'VLLM',
  /**
   * Custom user-defined serving wrapper logic.
   */
  CUSTOM = 'CUSTOM',
}
