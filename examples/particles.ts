import {
  BLUE_B,
  Circle,
  GOLD_C,
  GRAY_A,
  GRAY_B,
  Label,
  PURPLE_B,
  ParticleBelt,
  Scene,
  TEAL_C,
  Timeline,
  WHITE,
  render,
} from "venu";

const evolveStart = 2.6;
const evolveDuration = 5.6;
const evolveSpeed = 1.05;

/** Port of Murali `examples/particles.rs`. Belt phase is a function of scene time. */
class Particles extends Scene {
  constructor() {
    super({ viewWidth: 16 });
  }

  override construct(): void {
    const title = this.add(Label("Particles").height(0.38).color(WHITE).typewriter(), { at: [0, 3, 0] });
    const subtitle = this.add(Label(
      "A particle system reads best when the motion is simple enough for the eye to follow.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.45, 0] });
    const heading = this.add(Label("Orbital Belt").height(0.19).color(GRAY_B).typewriter(), { at: [0, 1.7, 0] });
    const core = this.add(Circle()
      .radius(0.26)
      .fill("rgba(255, 214, 102, 0.95)")
      .stroke({ color: "rgba(255, 242, 184, 0.65)", width: 0.03 }), { at: [0, -0.15, 0] });
    const belt = this.add(ParticleBelt(2.25)
      .bandWidth(0.68)
      .particleCount(220)
      .sizeRange(0.016, 0.055)
      .palette([TEAL_C, BLUE_B, PURPLE_B, GOLD_C])
      .orbitSpeed(1)
      .clockwiseRatio(0.35)
      .breathing(0.1, 1.3)
      .jitter(0.13, 2.7)
      .seed(7)
      .phaseAt(beltPhase), { at: [0, -0.15, 0] });
    const caption = this.add(Label(
      "One evolving belt is enough to teach density, drift, and cinematic texture without turning into visual noise.",
    ).height(0.16).color(GRAY_A).typewriter(), { at: [0, -2.95, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.5).ease("linear").typewrite();
    timeline.animate(heading).at(1.15).duration(0.8).ease("linear").typewrite();
    timeline.animate(core).at(1.85).duration(0.55).ease("outCubic").appear();
    timeline.animate(belt).at(2).duration(0.65).ease("outCubic").appear();
    timeline.animate(caption).at(2.45).duration(1.2).ease("linear").typewrite();
    timeline.animateCamera(this.camera).at(2.2).duration(3).ease("inOutQuad").zoomTo(1.12);
    timeline.animateCamera(this.camera).at(5.4).duration(2.4).ease("inOutQuad").zoomTo(1.28);
    this.play(timeline);
    if (this.duration < evolveStart + evolveDuration) this.wait(evolveStart + evolveDuration - this.duration);
  }
}

function beltPhase(time: number): number {
  const elapsed = Math.min(evolveDuration, Math.max(0, time - evolveStart));
  return evolveSpeed * elapsed;
}

render(import.meta.url, Particles);
