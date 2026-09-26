import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  Euler,
  Matrix4,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
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
  const shape = element.querySelector("[data-venu-shape]");
  for (const [property, value] of Object.entries(styles)) {
    if (property === "background" && shape) {
      if (typeof value === "string") shape.setAttribute("fill", value);
      continue;
    }
    if (value === null) {
      element.style.removeProperty(property);
    } else if (property.startsWith("--") || property.includes("-")) {
      element.style.setProperty(property, String(value));
    } else {
      (element.style as unknown as Record<string, string>)[property] = String(value);
    }
  }
}

function applyOverlayFrame(
  wrapper: HTMLElement,
  content: HTMLElement,
  state: TattvaState,
  pixelsPerUnit: number,
): void {
  wrapper.style.left = "50%";
  wrapper.style.top = "50%";
  wrapper.style.visibility = "visible";
  const pulse = indicateScale(state.indicate ?? 0);
  wrapper.style.transform = `translate(-50%, -50%) translate3d(${state.x * pixelsPerUnit}px, ${-state.y * pixelsPerUnit}px, ${state.z * pixelsPerUnit}px) rotateX(${state.rotationX}deg) rotateY(${-state.rotationY}deg) rotateZ(${-state.rotationZ}deg) scale3d(${state.scaleX * pulse}, ${state.scaleY * pulse}, ${state.scaleZ * pulse})`;
  wrapper.style.opacity = String(state.opacity);
  applyPaint(content, state);
}

function applyWorldFrame(
  wrapper: HTMLElement,
  content: HTMLElement,
  state: TattvaState,
  pixelsPerUnit: number,
  camera: Camera,
): void {
  const position = new Vector3(
    state.x * pixelsPerUnit,
    state.y * pixelsPerUnit,
    state.z * pixelsPerUnit,
  );
  const rotation = new Quaternion().setFromEuler(new Euler(
    state.rotationX * Math.PI / 180,
    state.rotationY * Math.PI / 180,
    state.rotationZ * Math.PI / 180,
    "XYZ",
  ));
  const objectMatrix = new Matrix4().compose(
    position,
    rotation,
    new Vector3(state.scaleX, state.scaleY, state.scaleZ).multiplyScalar(indicateScale(state.indicate ?? 0)),
  );
  const projected = new Vector3(state.x, state.y, state.z).project(camera);
  const visible = Number.isFinite(projected.z) && projected.z >= -1 && projected.z <= 1;
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  wrapper.style.visibility = visible ? "visible" : "hidden";
  wrapper.style.transform = objectCSSMatrix(objectMatrix);
  wrapper.style.opacity = String(state.opacity);
  applyPaint(content, state);
}

function applyWorldCamera(
  element: HTMLElement,
  camera: Camera,
  width: number,
  height: number,
): void {
  const fov = camera.projectionMatrix.elements[5] * height / 2;
  let cameraTransform: string;
  let perspective = "";
  if (camera instanceof OrthographicCamera) {
    const tx = -(camera.right + camera.left) / 2;
    const ty = (camera.top + camera.bottom) / 2;
    cameraTransform = `scale(${fov}) translate(${clean(tx)}px, ${clean(ty)}px)${cameraCSSMatrix(camera.matrixWorldInverse)}`;
  } else {
    perspective = `perspective(${fov}px) `;
    cameraTransform = `translateZ(${fov}px)${cameraCSSMatrix(camera.matrixWorldInverse)}`;
  }
  element.style.transform = `${perspective}${cameraTransform} translate(${width / 2}px, ${height / 2}px)`;
}

function cameraCSSMatrix(matrix: Matrix4): string {
  const elements = matrix.elements;
  return `matrix3d(${[
    elements[0], -elements[1], elements[2], elements[3],
    elements[4], -elements[5], elements[6], elements[7],
    elements[8], -elements[9], elements[10], elements[11],
    elements[12], -elements[13], elements[14], elements[15],
  ].map(clean).join(",")})`;
}

function objectCSSMatrix(matrix: Matrix4): string {
  const elements = matrix.elements;
  return `translate(-50%, -50%) matrix3d(${[
    elements[0], elements[1], elements[2], elements[3],
    -elements[4], -elements[5], -elements[6], -elements[7],
    elements[8], elements[9], elements[10], elements[11],
    elements[12], elements[13], elements[14], elements[15],
  ].map(clean).join(",")})`;
}

function applyPaint(content: HTMLElement, state: TattvaState): void {
  if (typeof state.color === "string") {
    content.style.color = state.indicate ? indicateColor(state.color, state.indicate) : state.color;
  }
  if (typeof state.background !== "string") return;
  const shape = content.querySelector("[data-venu-shape]");
  if (shape) shape.setAttribute("fill", state.background);
  else content.style.background = state.background;
}

function indicateScale(progress: number): number {
  return 1 + 0.12 * indicateIntensity(progress);
}

function indicateIntensity(progress: number): number {
  const pulse = 1 - Math.abs(2 * Math.min(1, Math.max(0, progress)) - 1);
  return pulse * pulse * (3 - 2 * pulse);
}

function indicateColor(color: string, progress: number): string {
  const intensity = indicateIntensity(progress) * 0.28;
  const match = /^#([\da-f]{6})$/i.exec(color.trim());
  if (!match || intensity === 0) return color;
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(match[1].slice(offset, offset + 2), 16);
    return Math.round(value + (255 - value) * intensity).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

function clean(value: number): number {
  return Math.abs(value) < 1e-10 ? 0 : value;
}

function applyReveal(item: MountedObject, state: TattvaState): void {
  const progress = Math.min(1, Math.max(0, state.revealProgress ?? 1));
  if (item.tattva.revealKind === "text" && item.graphemes) {
    const visible = Math.floor(item.graphemes.length * progress);
    item.content.textContent = item.graphemes.slice(0, visible).join("");
    item.content.style.textAlign = item.tattva.textReveal === "typewriter" ? "left" : "center";
  }
  if (item.tattva.revealKind === "path") {
    for (const { element, length } of item.paths ?? []) {
      const authoredDash = element.getAttribute("data-venu-dash");
      const clip = element.ownerSVGElement?.querySelector("[data-venu-reveal-clip]");
      if (authoredDash && clip) {
        element.setAttribute("stroke-dasharray", authoredDash);
        element.setAttribute("stroke-dashoffset", "0");
        const viewWidth = element.ownerSVGElement?.viewBox.baseVal.width ?? length;
        clip.setAttribute("width", String(viewWidth * progress));
      } else {
        element.setAttribute("stroke-dasharray", `${length} ${length}`);
        element.setAttribute("stroke-dashoffset", String(length * (1 - progress)));
      }
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

function scaledCameraState(state: Camera3DState, pixelsPerUnit: number): Camera3DState {
  return {
    ...state,
    cameraX: state.cameraX * pixelsPerUnit,
    cameraY: state.cameraY * pixelsPerUnit,
    cameraZ: state.cameraZ * pixelsPerUnit,
    cameraTargetX: state.cameraTargetX * pixelsPerUnit,
    cameraTargetY: state.cameraTargetY * pixelsPerUnit,
    cameraTargetZ: state.cameraTargetZ * pixelsPerUnit,
    cameraNear: state.cameraNear * pixelsPerUnit,
    cameraFar: state.cameraFar * pixelsPerUnit,
    cameraViewHeight: state.cameraViewHeight * pixelsPerUnit,
  };
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
    transformStyle: "preserve-3d",
  });
  content.style.transformStyle = "preserve-3d";
  applyCSS(content, tattva.initialStyle);
  if (tattva.children.length > 0) content.style.position = "relative";
  if (tattva.worldSize) {
    content.style.width = `${tattva.worldSize.width * pixelsPerUnit}px`;
    content.style.height = `${tattva.worldSize.height * pixelsPerUnit}px`;
  }
  if (tattva.worldStrokeWidth !== undefined && !tattva.paintsOwnStroke) {
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
  let cssCamera: Camera = createThreeCamera(
    scaledCameraState(scene.camera.initialState, pixelsPerUnit),
    aspect,
  );
  cssCamera = applyThreeCamera(
    cssCamera,
    scaledCameraState(scene.camera.initialState, pixelsPerUnit),
    aspect,
  );
  const worldLayer = document.createElement("div");
  worldLayer.dataset.venuLayer = "world";
  Object.assign(worldLayer.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${scene.width}px`,
    height: `${scene.height}px`,
    transformStyle: "preserve-3d",
    pointerEvents: "none",
  });
  const overlayLayer = document.createElement("div");
  overlayLayer.dataset.venuLayer = "overlay";
  Object.assign(overlayLayer.style, {
    position: "absolute",
    inset: "0",
    zIndex: "2147480000",
    pointerEvents: "none",
  });
  stage.append(worldLayer, overlayLayer);
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
  scene.tattvas.forEach((tattva) => {
    const container = tattva.kind === "three"
      ? stage
      : tattva.depthModeValue === "overlay"
        ? overlayLayer
        : worldLayer;
    mountTree(tattva, container);
  });
  stage.appendChild(overlayLayer);

  const renderFrame = (time: number) => {
    const states = scene.sampleAt(time);
    const styles = scene.sampleStylesAt(time);
    const cameraState = states.get(scene.camera) as Camera3DState;
    sceneCamera = applyThreeCamera(sceneCamera, cameraState, aspect);
    cssCamera = applyThreeCamera(cssCamera, scaledCameraState(cameraState, pixelsPerUnit), aspect);
    applyWorldCamera(worldLayer, cssCamera, scene.width, scene.height);
    for (const item of mounted) {
      const state = states.get(item.tattva);
      if (!state) continue;
      const style = styles.get(item.tattva);
      if (style) applyCSS(item.content, style);
      const projectAsWorldPlane = !item.tattva.parent
        && item.tattva.kind !== "three"
        && item.tattva.depthModeValue === "world";
      if (projectAsWorldPlane) {
        applyWorldFrame(item.wrapper, item.content, state, pixelsPerUnit, sceneCamera);
      } else {
        applyOverlayFrame(item.wrapper, item.content, state, pixelsPerUnit);
      }
      item.wrapper.style.zIndex = String(item.tattva.renderLayer);
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
