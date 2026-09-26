import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  PerspectiveCamera,
  Scene as ThreeScene,
  WebGLRenderer,
} from "three";
import type { Mobject, MobjectState } from "../core/Mobject.ts";
import type { ReactMobject } from "../core/ReactMobject.ts";
import type { Scene } from "../core/Scene.ts";
import type { ThreeContext, ThreeMobject } from "../core/ThreeMobject.ts";

interface MountedObject {
  mobject: Mobject;
  element: HTMLElement;
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
  }
}

function applyFrame(element: HTMLElement, state: MobjectState): void {
  element.style.transform = `translate(-50%, -50%) translate(${state.x}px, ${state.y}px) scale(${state.scale}) rotate(${state.rotation}deg)`;
  element.style.opacity = String(state.opacity);
  if (typeof state.color === "string") element.style.color = state.color;
  if (typeof state.background === "string") element.style.background = state.background;
}

function mountDom(mobject: Mobject, stage: HTMLElement): MountedObject {
  const element = document.createElement(mobject.tag);
  element.dataset.mobjectId = mobject.id;
  element.className = mobject.className ?? "";
  if (mobject.html !== undefined) element.innerHTML = mobject.html;
  else if (mobject.text !== undefined) element.textContent = mobject.text;
  Object.assign(element.style, mobject.initialStyle, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transformOrigin: "center",
  });
  stage.appendChild(element);
  return { mobject, element };
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

  const mounted = scene.mobjects.map((mobject): MountedObject => {
    const item = mountDom(mobject, stage);
    if (mobject.kind === "react") {
      item.reactRoot = createRoot(item.element);
    } else if (mobject.kind === "three") {
      const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(scene.width, scene.height, false);
      item.element.replaceChildren(renderer.domElement);
      const threeScene = new ThreeScene();
      const camera = new PerspectiveCamera(45, scene.width / scene.height, 0.1, 1000);
      camera.position.z = 8;
      item.three = { scene: threeScene, camera, renderer };
      (mobject as ThreeMobject).hooks.setup(item.three);
    }
    return item;
  });

  const renderFrame = (time: number) => {
    const states = scene.sampleAt(time);
    for (const item of mounted) {
      const state = states.get(item.mobject);
      if (!state) continue;
      applyFrame(item.element, state);
      if (item.reactRoot) {
        const component = item.mobject as ReactMobject;
        flushSync(() => item.reactRoot?.render(component.render(state)));
      }
      if (item.three) {
        const threeMobject = item.mobject as ThreeMobject;
        threeMobject.hooks.update?.(item.three, state);
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
