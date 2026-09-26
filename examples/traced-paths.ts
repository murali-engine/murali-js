import {
  BLUE_B,
  Circle,
  GOLD_C,
  GRAY_A,
  GRAY_B,
  Label,
  Line,
  Scene,
  TEAL_C,
  Timeline,
  TracedPath,
  WHITE,
  render,
} from "murali-js";

const groundY = -1.15;
const radius = 0.55;
const rollStart = 2.2;
const rollDuration = 5.4;
const startX = -3.45;
const totalTheta = Math.PI * 4;

/** Port of Murali `examples/traced_paths.rs`. The trace is resampled from scene time. */
class TracedPaths extends Scene {
  constructor() {
    super({ viewWidth: 16 });
  }

  override construct(): void {
    const title = this.add(Label("Traced Paths").height(0.38).color(WHITE).typewriter(), { at: [0, 3, 0] });
    const subtitle = this.add(Label(
      "A traced path becomes meaningful when the underlying motion is simple enough to understand first.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.45, 0] });
    const heading = this.add(Label("Rolling point on a wheel").height(0.19).color(GRAY_B).typewriter(), { at: [0, 1.7, 0] });
    const ground = this.add(Line()
      .from([-4.85, groundY])
      .to([4.85, groundY])
      .stroke({ color: "rgba(97, 204, 245, 0.35)", width: 0.04 }));
    const wheel = this.add(Circle().radius(radius).fill("rgba(0, 0, 0, 0)").stroke({ color: TEAL_C, width: 0.05 }));
    const hub = this.add(Circle().radius(0.06).fill(GOLD_C).stroke({ color: WHITE, width: 0.02 }));
    const dot = this.add(Circle().radius(0.08).fill(BLUE_B).stroke({ color: WHITE, width: 0.02 }));
    this.add(TracedPath(tracedPoint).minDistance(0.02).maxPoints(6000).color(GOLD_C).width(0.06));
    const caption = this.add(Label(
      "The path is not separate decoration: it is the history of one chosen point as the wheel rolls forward.",
    ).height(0.16).color(GRAY_A).typewriter(), { at: [0, -2.95, 0] });

    this.updater((time, states) => {
      const pose = wheelPose(time);
      const wheelState = states.get(wheel);
      const hubState = states.get(hub);
      const dotState = states.get(dot);
      if (wheelState) {
        wheelState.x = pose.center[0];
        wheelState.y = pose.center[1];
        wheelState.rotationZ = -pose.theta * 180 / Math.PI;
      }
      if (hubState) {
        hubState.x = pose.center[0];
        hubState.y = pose.center[1];
      }
      if (dotState) {
        dotState.x = pose.point[0];
        dotState.y = pose.point[1];
      }
    });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.5).ease("linear").typewrite();
    timeline.animate(heading).at(1.15).duration(0.8).ease("linear").typewrite();
    timeline.animate(ground).at(1.45).duration(0.9).ease("outCubic").draw();
    timeline.animate(wheel).at(1.8).duration(0.55).ease("outCubic").appear();
    timeline.animate(hub).at(1.95).duration(0.45).ease("outCubic").appear();
    timeline.animate(dot).at(2.05).duration(0.45).ease("outCubic").appear();
    timeline.animate(caption).at(2.55).duration(1.2).ease("linear").typewrite();
    timeline.animateCamera(this.camera).at(2.2).duration(2.8).ease("inOutQuad").zoomTo(1.1);
    timeline.animateCamera(this.camera).at(5.2).duration(2.2).ease("inOutQuad").zoomTo(1.22);
    this.play(timeline);
  }
}

function wheelPose(time: number): { center: readonly [number, number]; point: readonly [number, number]; theta: number } {
  const elapsed = Math.min(rollDuration, Math.max(0, time - rollStart));
  const theta = (elapsed / rollDuration) * totalTheta;
  const center: readonly [number, number] = [startX + radius * theta, groundY + radius];
  return {
    center,
    theta,
    point: [center[0] - radius * Math.sin(theta), center[1] - radius * Math.cos(theta)],
  };
}

function tracedPoint(time: number): [number, number] {
  return [...wheelPose(time).point];
}

render(import.meta.url, TracedPaths);
