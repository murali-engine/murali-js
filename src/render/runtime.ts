import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  OrthographicCamera,
  PerspectiveCamera,
  Scene as ThreeScene,
  Vector3,
  WebGLRenderer,
} from "three";
import type { Camera } from "three";
import type { ReactTattva } from "../core/ReactTattva.ts";
import type { Scene } from "../core/Scene.ts";
import type { Tattva, TattvaState } from "../core/Tattva.ts";
import type { ThreeContext, ThreeTattva } from "../core/ThreeTattva.ts";
import type { CSSStyles } from "../core/css.ts";
import { splitGraphemes } from "../core/text.ts";
import type { Camera3DState } from "../core/Camera3D.ts";

interface MountedObject {
  tattva: Tattva<any>;
  wrapper: HTMLElement;
  content: HTMLElement;
  reactRoot?: Root;
  three?: ThreeContext;
  graphemes?: string[];
  paths?: Array<{ element: SVGPathElement; length: number }>;
  arrowheads?: SVGPathElement[];
}

declare global {
  interface Window {
    __venu?: {
      width: number;
      height: number;
      duration: number;
      fps: number;
      renderFrame: (time: number) => void;
    };
    __venuReady?: boolean;
    __venuSceneClass?: new () => Scene;
  }
}

function applyCSS(element: HTMLElement, styles: CSSStyles): void {
  for (const [property, value] of Object.entries(styles)) {
    if (value === null) {
      element.style.removeProperty(property);
    } else if (property.startsWith("--") || property.includes("-")) {
      element.style.setProperty(property, String(value));
    } else {
      (element.style as unknown as Record<string, string>)[property] = String(value);
    }
  }
}

function applyFrame(
  wrapper: HTMLElement,
  content: HTMLElement,
  state: TattvaState,
  pixelsPerUnit: number,
  camera?: Camera,
  frame?: { width: number; height: number },
): void {
  if (camera && frame) {
    const radians = state.rotation * Math.PI / 180;
    const unit = state.scale / pixelsPerUnit;
    const origin = projectToFrame(camera, state.x, state.y, state.z, frame);
    const xAxis = projectToFrame(
      camera,
      state.x + Math.cos(radians) * unit,
      state.y + Math.sin(radians) * unit,
      state.z,
      frame,
    );
    const yAxis = projectToFrame(
      camera,
      state.x + Math.sin(radians) * unit,
      state.y - Math.cos(radians) * unit,
      state.z,
      frame,
    );
    const a = xAxis.x - origin.x;
    const b = xAxis.y - origin.y;
    const c = yAxis.x - origin.x;
    const d = yAxis.y - origin.y;
    wrapper.style.transform = `translate(-50%, -50%) matrix(${a}, ${b}, ${c}, ${d}, ${origin.x}, ${origin.y})`;
  } else {
    wrapper.style.transform = `translate(-50%, -50%) translate(${state.x * pixelsPerUnit}px, ${-state.y * pixelsPerUnit}px) scale(${state.scale}) rotate(${-state.rotation}deg)`;
  }
  wrapper.style.opacity = String(state.opacity);
  wrapper.style.zIndex = String(state.z);
  if (typeof state.color === "string") content.style.color = state.color;
  if (typeof state.background === "string") content.style.background = state.background;
}

function projectToFrame(
  camera: Camera,
  x: number,
  y: number,
  z: number,
  frame: { width: number; height: number },
): { x: number; y: number } {
  const projected = new Vector3(x, y, z).project(camera);
  return {
    x: projected.x * frame.width / 2,
    y: -projected.y * frame.height / 2,
  };
}

function applyReveal(item: MountedObject, state: TattvaState): void {
  const progress = Math.min(1, Math.max(0, state.revealProgress ?? 1));
  if (item.tattva.revealKind === "text" && item.graphemes) {
    const visible = Math.floor(item.graphemes.length * progress);
    item.content.textContent = item.graphemes.slice(0, visible).join("");
  }
  if (item.tattva.revealKind === "path") {
    for (const { element, length } of item.paths ?? []) {
      element.setAttribute("stroke-dasharray", `${length} ${length}`);
      element.setAttribute("stroke-dashoffset", String(length * (1 - progress)));
      element.style.fillOpacity = String(progress);
    }
    const arrowProgress = Math.min(1, Math.max(0, (progress - 0.85) / 0.15));
    for (const arrowhead of item.arrowheads ?? []) {
      arrowhead.style.opacity = String(arrowProgress);
    }
  }
}

function createThreeCamera(state: Camera3DState, aspect: number) {
  if (state.cameraProjection === "orthographic") {
    const halfHeight = state.cameraViewHeight / 2;
    const halfWidth = halfHeight * aspect;
    return new OrthographicCamera(
      -halfWidth,
      halfWidth,
      halfHeight,
      -halfHeight,
      state.cameraNear,
      state.cameraFar,
    );
  }
  return new PerspectiveCamera(state.cameraFov, aspect, state.cameraNear, state.cameraFar);
}

function applyThreeCamera(camera: Camera, state: Camera3DState, aspect: number): Camera {
  const needsOrthographic = state.cameraProjection === "orthographic";
  if (
    (needsOrthographic && !(camera instanceof OrthographicCamera))
    || (!needsOrthographic && !(camera instanceof PerspectiveCamera))
  ) {
    camera = createThreeCamera(state, aspect);
  }

  camera.position.set(state.cameraX, state.cameraY, state.cameraZ);
  camera.up.set(state.cameraUpX, state.cameraUpY, state.cameraUpZ);

  if (camera instanceof PerspectiveCamera) {
    camera.aspect = aspect;
    camera.fov = state.cameraFov;
    camera.zoom = state.cameraZoom;
    camera.near = state.cameraNear;
    camera.far = state.cameraFar;
    camera.updateProjectionMatrix();
  } else if (camera instanceof OrthographicCamera) {
    const halfHeight = state.cameraViewHeight / 2;
    const halfWidth = halfHeight * aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.zoom = state.cameraZoom;
    camera.near = state.cameraNear;
    camera.far = state.cameraFar;
    camera.updateProjectionMatrix();
  }
  camera.lookAt(state.cameraTargetX, state.cameraTargetY, state.cameraTargetZ);
  camera.updateMatrixWorld(true);
  return camera;
}

function mountDom(tattva: Tattva<any>, container: HTMLElement, pixelsPerUnit: number): MountedObject {
  const wrapper = document.createElement("div");
  const content = document.createElement(tattva.tag);
  wrapper.dataset.tattvaId = tattva.id;
  wrapper.className = "venu-transform";
  content.className = ["venu-content", tattva.elementClassName].filter(Boolean).join(" ");
  const html = tattva.contentHTML();
  if (html !== undefined) content.innerHTML = html;
  else if (tattva.text !== undefined) content.textContent = tattva.text;
  Object.assign(wrapper.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transformOrigin: "center",
  });
  applyCSS(content, tattva.initialStyle);
  if (tattva.children.length > 0) content.style.position = "relative";
  if (tattva.worldSize) {
    content.style.width = `${tattva.worldSize.width * pixelsPerUnit}px`;
    content.style.height = `${tattva.worldSize.height * pixelsPerUnit}px`;
  }
  if (tattva.worldStrokeWidth !== undefined) {
    content.style.borderWidth = `${tattva.worldStrokeWidth * pixelsPerUnit}px`;
  }
  if (tattva.worldFontSize !== undefined) {
    content.style.fontSize = `${tattva.worldFontSize * pixelsPerUnit}px`;
    content.style.lineHeight = "1";
  }
  wrapper.appendChild(content);
  container.appendChild(wrapper);
  return {
    tattva,
    wrapper,
    content,
    graphemes: tattva.revealKind === "text" ? splitGraphemes(tattva.text ?? "") : undefined,
    paths: tattva.revealKind === "path"
      ? [...content.querySelectorAll<SVGPathElement>("[data-venu-path]")].map((element) => ({
          element,
          length: Math.max(element.getTotalLength(), 0.001),
        }))
      : undefined,
    arrowheads: tattva.revealKind === "path"
      ? [...content.querySelectorAll<SVGPathElement>("[data-venu-arrowhead]")]
      : undefined,
  };
}

export function mountAndExpose(SceneClass: new () => Scene): void {
  const scene = new SceneClass().prepare();
  const stage = document.querySelector<HTMLElement>("#stage");
  if (!stage) throw new Error("Venu runtime requires a #stage element.");
  Object.assign(stage.style, {
    width: `${scene.width}px`,
    height: `${scene.height}px`,
    background: scene.background,
  });

  const pixelsPerUnit = scene.width / scene.viewWidth;
  const aspect = scene.width / scene.height;
  let sceneCamera: Camera = createThreeCamera(scene.camera.initialState, aspect);
  sceneCamera = applyThreeCamera(sceneCamera, scene.camera.initialState, aspect);
  const mounted: MountedObject[] = [];
  const mountTree = (tattva: Tattva<any>, container: HTMLElement): void => {
    const item = mountDom(tattva, container, pixelsPerUnit);
    mounted.push(item);
    if (tattva.kind === "react") {
      item.reactRoot = createRoot(item.content);
    } else if (tattva.kind === "three") {
      const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(scene.width, scene.height, false);
      item.content.replaceChildren(renderer.domElement);
      const threeScene = new ThreeScene();
      item.three = { scene: threeScene, camera: sceneCamera, renderer };
      (tattva as ThreeTattva).hooks.setup(item.three);
    }
    tattva.children.forEach((child) => mountTree(child, item.content));
  };
  scene.tattvas.forEach((tattva) => mountTree(tattva, stage));

  const renderFrame = (time: number) => {
    const states = scene.sampleAt(time);
    const styles = scene.sampleStylesAt(time);
    const cameraState = states.get(scene.camera) as Camera3DState;
    sceneCamera = applyThreeCamera(sceneCamera, cameraState, aspect);
    for (const item of mounted) {
      const state = states.get(item.tattva);
      if (!state) continue;
      const style = styles.get(item.tattva);
      if (style) applyCSS(item.content, style);
      const projectAsWorldPlane = !item.tattva.parent && item.tattva.kind !== "three";
      applyFrame(
        item.wrapper,
        item.content,
        state,
        pixelsPerUnit,
        projectAsWorldPlane ? sceneCamera : undefined,
        projectAsWorldPlane ? { width: scene.width, height: scene.height } : undefined,
      );
      applyReveal(item, state);
      if (item.reactRoot) {
        const component = item.tattva as ReactTattva;
        flushSync(() => item.reactRoot?.render(component.render(state)));
      }
      if (item.three) {
        const threeTattva = item.tattva as ThreeTattva;
        item.three.camera = sceneCamera;
        threeTattva.hooks.update?.(item.three, state);
        item.three.renderer.render(item.three.scene, item.three.camera);
      }
    }
  };

  window.__venu = {
    width: scene.width,
    height: scene.height,
    duration: scene.duration,
    fps: scene.fps,
    renderFrame,
  };
  renderFrame(0);
  window.__venuReady = true;
}
