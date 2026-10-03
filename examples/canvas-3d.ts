import { render } from "murali-js";
import { Canvas3DTattva, type Canvas3DContext } from "murali-js/adapters";
import { Scene, Timeline, type TattvaState } from "murali-js/core";
import { Label } from "murali-js/text";

interface BloomState extends TattvaState {
  spin: number;
  bloom: number;
}

interface BloomRuntime {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  instances: number;
  uniforms: {
    time: WebGLUniformLocation | null;
    orbit: WebGLUniformLocation | null;
    bloom: WebGLUniformLocation | null;
    aspect: WebGLUniformLocation | null;
    viewport: WebGLUniformLocation | null;
    width: WebGLUniformLocation | null;
    alpha: WebGLUniformLocation | null;
  };
}

class Canvas3DScene extends Scene {
  constructor() {
    super({ width: 1280, height: 720, fps: 30, background: "#070b08" });
  }

  override construct(): void {
    let runtime: BloomRuntime | undefined;
    const bloom = this.add(new Canvas3DTattva<BloomState>({
      setup(context) {
        runtime = createBloom(context);
      },
      draw({ canvas, gl }, state, sample) {
        if (!runtime) return;
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.useProgram(runtime.program);
        gl.bindVertexArray(runtime.vao);
        gl.uniform1f(runtime.uniforms.time, sample.time);
        gl.uniform1f(runtime.uniforms.orbit, state.spin);
        gl.uniform1f(runtime.uniforms.bloom, state.bloom);
        gl.uniform1f(runtime.uniforms.aspect, canvas.width / canvas.height);
        gl.uniform2f(runtime.uniforms.viewport, canvas.width, canvas.height);

        // A soft additive pass gives every branch a restrained phosphorescent halo.
        gl.depthMask(false);
        gl.uniform1f(runtime.uniforms.width, 8);
        gl.uniform1f(runtime.uniforms.alpha, 0.08);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, runtime.instances);

        gl.depthMask(true);
        gl.uniform1f(runtime.uniforms.width, 2.4);
        gl.uniform1f(runtime.uniforms.alpha, 0.78);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, runtime.instances);
      },
    }, {
      size: [12.5, 7],
      state: { spin: 0, bloom: 0.12 },
      css: { filter: "drop-shadow(0 30px 55px rgba(126,255,40,.18))" },
    }));

    const title = this.add(
      Label("LIVING WEBGL BLOOM")
        .height(0.38)
        .color("#ecffd7")
        .depthMode("overlay")
        .layer(10),
    );
    this.toEdge(title, "up", { margin: 0.48 });
    const subtitle = this.add(
      Label("6,132 GPU-instanced branches · procedural depth · sampled motion")
        .height(0.16)
        .color("#89a879")
        .depthMode("overlay")
        .layer(10),
    );
    subtitle.css({ letterSpacing: "0.08em" });
    this.toEdge(subtitle, "down", { margin: 0.42 });

    const motion = new Timeline();
    motion.animate(bloom).duration(7).ease("linear").to({ spin: Math.PI * 2 });
    motion.animate(bloom).at(0).duration(2.2).ease("outCubic").to({ bloom: 1 });
    this.play(motion);
  }
}

function createBloom({ gl }: Canvas3DContext): BloomRuntime {
  const program = linkProgram(gl, vertexShader, fragmentShader);
  const vao = gl.createVertexArray();
  if (!vao) throw new Error("Could not create the bloom vertex array.");
  gl.bindVertexArray(vao);

  // Two triangles. X selects a segment endpoint and Y selects a ribbon edge.
  const corners = new Float32Array([
    0, -1, 1, -1, 1, 1,
    0, -1, 1, 1, 0, 1,
  ]);
  const cornerBuffer = requiredBuffer(gl);
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
  const cornerLocation = gl.getAttribLocation(program, "corner");
  gl.enableVertexAttribArray(cornerLocation);
  gl.vertexAttribPointer(cornerLocation, 2, gl.FLOAT, false, 0, 0);

  const branches = buildBranches();
  const branchBuffer = requiredBuffer(gl);
  gl.bindBuffer(gl.ARRAY_BUFFER, branchBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, branches, gl.STATIC_DRAW);
  const stride = 8 * Float32Array.BYTES_PER_ELEMENT;
  instanceAttribute(gl, program, "start", 3, stride, 0);
  instanceAttribute(gl, program, "end", 3, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
  instanceAttribute(gl, program, "generation", 1, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
  instanceAttribute(gl, program, "seed", 1, stride, 7 * Float32Array.BYTES_PER_ELEMENT);

  return {
    program,
    vao,
    instances: branches.length / 8,
    uniforms: {
      time: gl.getUniformLocation(program, "time"),
      orbit: gl.getUniformLocation(program, "orbit"),
      bloom: gl.getUniformLocation(program, "bloom"),
      aspect: gl.getUniformLocation(program, "aspect"),
      viewport: gl.getUniformLocation(program, "viewport"),
      width: gl.getUniformLocation(program, "ribbonWidth"),
      alpha: gl.getUniformLocation(program, "alpha"),
    },
  };
}

function buildBranches(): Float32Array {
  const data: number[] = [];
  const arms = 12;
  const depth = 9;
  for (let arm = 0; arm < arms; arm += 1) {
    const angle = arm / arms * Math.PI * 2;
    grow([0, 0, 0], angle, Math.sin(angle * 3) * 0.16, 0.78, depth, arm * 97 + 1, data);
  }
  return new Float32Array(data);
}

function grow(
  start: readonly [number, number, number],
  angle: number,
  lift: number,
  length: number,
  depth: number,
  seed: number,
  data: number[],
): void {
  if (depth <= 0) return;
  const generation = 1 - depth / 9;
  const end = [
    start[0] + Math.cos(angle) * length,
    start[1] + Math.sin(angle) * length,
    start[2] + lift * length,
  ] as const;
  data.push(...start, ...end, generation, hash(seed));

  const noise = hash(seed * 17 + depth * 31) - 0.5;
  const spread = 0.27 + generation * 0.13;
  const curl = 0.13 + noise * 0.055;
  const nextLength = length * (0.69 + hash(seed + 4) * 0.055);
  grow(end, angle + curl + spread, lift * 0.62 + noise * 0.28, nextLength, depth - 1, seed * 2 + 1, data);
  grow(end, angle + curl - spread, lift * 0.62 - noise * 0.28, nextLength, depth - 1, seed * 2 + 2, data);
}

function hash(value: number): number {
  const raw = Math.sin(value * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function instanceAttribute(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
  size: number,
  stride: number,
  offset: number,
): void {
  const location = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
  gl.vertexAttribDivisor(location, 1);
}

function requiredBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Could not create a WebGL buffer.");
  return buffer;
}

function linkProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create a WebGL program.");
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Could not create a WebGL shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "Could not compile a WebGL shader.");
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Could not link the WebGL program.");
  }
  return program;
}

const vertexShader = `#version 300 es
  precision highp float;
  in vec2 corner;
  in vec3 start;
  in vec3 end;
  in float generation;
  in float seed;
  uniform float time;
  uniform float orbit;
  uniform float bloom;
  uniform float aspect;
  uniform vec2 viewport;
  uniform float ribbonWidth;
  out float level;
  out float edge;
  out float shimmer;

  vec3 animate(vec3 point) {
    float radius = length(point.xy);
    float twist = orbit * 0.34 + sin(time * 0.85 + radius * 1.7) * 0.16;
    mat2 rotation = mat2(cos(twist), sin(twist), -sin(twist), cos(twist));
    point.xy = rotation * point.xy;
    point.z += sin(time * 1.15 + radius * 2.5 + seed * 5.0) * 0.10 * generation;
    return point * bloom;
  }

  vec4 project(vec3 point) {
    vec3 camera = vec3(sin(orbit * 0.22) * 6.3, 2.25 + sin(orbit * 0.31) * 0.45, cos(orbit * 0.22) * 6.3);
    vec3 forward = normalize(-camera);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 relative = point - camera;
    vec3 view = vec3(dot(relative, right), dot(relative, up), -dot(relative, forward));
    float near = 0.1;
    float far = 20.0;
    float focal = 1.0 / tan(radians(42.0) * 0.5);
    return vec4(
      view.x * focal / aspect,
      view.y * focal,
      ((far + near) / (near - far)) * view.z + (2.0 * far * near) / (near - far),
      -view.z
    );
  }

  void main() {
    vec4 a = project(animate(start));
    vec4 b = project(animate(end));
    vec4 clip = mix(a, b, corner.x);
    vec2 direction = normalize(b.xy / b.w - a.xy / a.w + vec2(0.00001));
    vec2 perpendicular = vec2(-direction.y, direction.x);
    float taper = mix(1.0, 0.20, generation);
    clip.xy += perpendicular * corner.y * ribbonWidth * taper / viewport * 2.0 * clip.w;
    gl_Position = clip;
    level = generation;
    edge = corner.y;
    shimmer = 0.72 + 0.28 * sin(time * 2.2 - generation * 9.0 + seed * 8.0);
  }
`;

const fragmentShader = `#version 300 es
  precision highp float;
  in float level;
  in float edge;
  in float shimmer;
  uniform float alpha;
  out vec4 outputColor;
  void main() {
    vec3 core = vec3(0.46, 1.0, 0.015);
    vec3 tip = vec3(0.88, 1.0, 0.68);
    vec3 color = mix(core, tip, smoothstep(0.18, 1.0, level)) * shimmer;
    float softness = 1.0 - smoothstep(0.58, 1.0, abs(edge));
    outputColor = vec4(color, alpha * softness);
  }
`;

render(import.meta.url, Canvas3DScene);
