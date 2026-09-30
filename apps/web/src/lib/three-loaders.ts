import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

let sharedDracoLoader: DRACOLoader | null = null;
let sharedGltfLoader: GLTFLoader | null = null;

export function getDracoDecoder(): DRACOLoader {
  if (!sharedDracoLoader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    sharedDracoLoader = draco;
  }
  return sharedDracoLoader;
}

export function getGltfDracoLoader(): GLTFLoader {
  if (!sharedGltfLoader) {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(getDracoDecoder());
    sharedGltfLoader = loader;
  }
  return sharedGltfLoader;
}

export function disposeThreeLoaders() {
  sharedDracoLoader?.dispose();
  sharedDracoLoader = null;
  sharedGltfLoader = null;
}
