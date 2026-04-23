declare module "three/examples/jsm/loaders/MMDLoader.js" {
  import * as THREE from "three";

  export class MMDLoader {
    constructor(manager?: THREE.LoadingManager);
    load(
      url: string,
      onLoad: (mesh: THREE.SkinnedMesh) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (event: unknown) => void
    ): void;
  }
}

declare module "three/examples/jsm/animation/MMDAnimationHelper.js" {
  import * as THREE from "three";

  export interface MMDAnimationHelperParams {
    afterglow?: number;
    physics?: boolean;
  }

  export class MMDAnimationHelper {
    constructor(params?: MMDAnimationHelperParams);
    add(object: THREE.Object3D, params?: { physics?: boolean }): void;
    update(delta: number): void;
  }
}
