import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  PerspectiveCamera,
  Scene as ThreeScene,
  WebGLRenderer,
} from "three";
import type { ReactTattva } from "../core/ReactTattva.ts";
import type { Scene } from "../core/Scene.ts";
import type { Tattva, TattvaState } from "../core/Tattva.ts";
import type { ThreeContext, ThreeTattva } from "../core/ThreeTattva.ts";
import type { CSSStyles } from "../core/css.ts";

interface MountedObject {
  tattva: Tattva;
  wrapper: HTMLElement;
  content: HTMLElement;
  reactRoot?: Root;
  three?: ThreeContext;
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
): void {
  wrapper.style.transform = `translate(-50%, -50%) translate(${state.x * pixelsPerUnit}px, ${-state.y * pixelsPerUnit}px) scale(${state.scale}) rotate(${-state.rotation}deg)`;
  wrapper.style.opacity = String(state.opacity);
  wrapper.style.zIndex = String(state.z);
  if (typeof state.color === "string") content.style.color = state.color;
  if (typeof state.background === "string") content.style.background = state.background;
}

function mountDom(tattva: Tattva, stage: HTMLElement, pixelsPerUnit: number): MountedObject {
  const wrapper = document.createElement("div");
  const content = document.createElement(tattva.tag);
  wrapper.dataset.tattvaId = tattva.id;
  wrapper.className = "venu-transform";
  content.className = ["venu-content", tattva.elementClassName].filter(Boolean).join(" ");
  if (tattva.html !== undefined) content.innerHTML = tattva.html;
  else if (tattva.text !== undefined) content.textContent = tattva.text;
  Object.assign(wrapper.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transformOrigin: "center",
  });
  applyCSS(content, tattva.initialStyle);
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
  stage.appendChild(wrapper);
  return { tattva, wrapper, content };
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
  const mounted = scene.tattvas.map((tattva): MountedObject => {
    const item = mountDom(tattva, stage, pixelsPerUnit);
    if (tattva.kind === "react") {
      item.reactRoot = createRoot(item.content);
    } else if (tattva.kind === "three") {
      const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(scene.width, scene.height, false);
      item.content.replaceChildren(renderer.domElement);
      const threeScene = new ThreeScene();
      const camera = new PerspectiveCamera(45, scene.width / scene.height, 0.1, 1000);
      camera.position.z = 8;
      item.three = { scene: threeScene, camera, renderer };
      (tattva as ThreeTattva).hooks.setup(item.three);
    }
    return item;
  });

  const renderFrame = (time: number) => {
    const states = scene.sampleAt(time);
    const styles = scene.sampleStylesAt(time);
    for (const item of mounted) {
      const state = states.get(item.tattva);
      if (!state) continue;
      const style = styles.get(item.tattva);
      if (style) applyCSS(item.content, style);
      applyFrame(item.wrapper, item.content, state, pixelsPerUnit);
      if (item.reactRoot) {
        const component = item.tattva as ReactTattva;
        flushSync(() => item.reactRoot?.render(component.render(state)));
      }
      if (item.three) {
        const threeTattva = item.tattva as ThreeTattva;
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
