import type { Vec3 } from "../core/Tattva.ts";

export interface GltfMesh {
  positions: Float32Array;
  indices: Uint32Array;
  color: readonly [number, number, number, number];
}

/** A static glTF model. Positions already include each node's transform. */
export interface GltfModel {
  meshes: readonly GltfMesh[];
  boundsMin: Vec3;
  boundsMax: Vec3;
  meshCount: number;
}

const COMPONENT_BYTES: Record<number, number> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};

const ELEMENT_COUNTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
};

interface GltfJson {
  scene?: number;
  scenes?: Array<{ nodes?: number[] }>;
  nodes?: GltfNode[];
  meshes?: Array<{ primitives?: GltfPrimitive[] }>;
  materials?: Array<{ pbrMetallicRoughness?: { baseColorFactor?: number[] } }>;
  buffers?: Array<{ byteLength?: number }>;
  bufferViews?: Array<{ buffer?: number; byteOffset?: number; byteLength?: number; byteStride?: number }>;
  accessors?: GltfAccessor[];
}

interface GltfNode {
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}

interface GltfPrimitive {
  attributes?: { POSITION?: number };
  indices?: number;
  material?: number;
  mode?: number;
}

interface GltfAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType?: number;
  count?: number;
  type?: string;
}

/** Parse a binary `.glb`. Geometry is ready before the first frame. */
export function parseGlb(bytes: Uint8Array): GltfModel {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) {
    throw new Error("Prop3D expected a .glb file.");
  }
  const version = view.getUint32(4, true);
  if (version !== 2) throw new Error(`Prop3D expected glTF 2; received version ${version}.`);
  let offset = 12;
  let json = "";
  let bin = new Uint8Array();
  while (offset + 8 <= bytes.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const chunk = bytes.subarray(start, start + length);
    if (type === 0x4e4f534a) json = new TextDecoder().decode(chunk);
    if (type === 0x004e4942) bin = Uint8Array.from(chunk);
    offset = start + length;
  }
  if (!json) throw new Error("Prop3D found no JSON chunk in the .glb file.");
  return parseGltf(json, [bin]);
}

/**
 * Parse a `.gltf` document. `buffers` are the binary payloads in buffer order,
 * including a sibling `.bin`. Nothing is fetched.
 */
export function parseGltf(source: string, buffers: readonly Uint8Array[]): GltfModel {
  const document = JSON.parse(source) as GltfJson;
  const scene = document.scenes?.[document.scene ?? 0];
  if (!scene?.nodes?.length) throw new Error("Prop3D found no renderable scene.");
  const meshes: GltfMesh[] = [];
  let boundsMin: Vec3 | null = null;
  let boundsMax: Vec3 | null = null;
  const include = (point: Vec3) => {
    boundsMin = boundsMin
      ? [Math.min(boundsMin[0], point[0]), Math.min(boundsMin[1], point[1]), Math.min(boundsMin[2], point[2])]
      : point;
    boundsMax = boundsMax
      ? [Math.max(boundsMax[0], point[0]), Math.max(boundsMax[1], point[1]), Math.max(boundsMax[2], point[2])]
      : point;
  };
  const visit = (nodeIndex: number, parent: number[]) => {
    const node = document.nodes?.[nodeIndex];
    if (!node) return;
    const world = multiplyMatrix(parent, nodeMatrix(node));
    if (node.mesh !== undefined) {
      for (const primitive of document.meshes?.[node.mesh]?.primitives ?? []) {
        const mesh = readPrimitive(document, buffers, primitive, world);
        if (!mesh) continue;
        for (let index = 0; index < mesh.positions.length; index += 3) {
          include([mesh.positions[index] ?? 0, mesh.positions[index + 1] ?? 0, mesh.positions[index + 2] ?? 0]);
        }
        meshes.push(mesh);
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  for (const node of scene.nodes) visit(node, identityMatrix());
  if (meshes.length === 0 || !boundsMin || !boundsMax) throw new Error("Prop3D found no renderable meshes.");
  return { meshes, boundsMin, boundsMax, meshCount: meshes.length };
}

export function modelCenter(model: GltfModel): Vec3 {
  return [
    (model.boundsMin[0] + model.boundsMax[0]) / 2,
    (model.boundsMin[1] + model.boundsMax[1]) / 2,
    (model.boundsMin[2] + model.boundsMax[2]) / 2,
  ];
}

export function modelDimensions(model: GltfModel): Vec3 {
  return [
    model.boundsMax[0] - model.boundsMin[0],
    model.boundsMax[1] - model.boundsMin[1],
    model.boundsMax[2] - model.boundsMin[2],
  ];
}

function readPrimitive(
  document: GltfJson,
  buffers: readonly Uint8Array[],
  primitive: GltfPrimitive,
  transform: number[],
): GltfMesh | null {
  if (primitive.mode !== undefined && primitive.mode !== 4) {
    throw new Error(`Prop3D only draws triangle meshes; received mode ${primitive.mode}.`);
  }
  const positionAccessor = primitive.attributes?.POSITION;
  if (positionAccessor === undefined) return null;
  const raw = readFloats(document, buffers, positionAccessor, 3);
  const positions = new Float32Array(raw.length);
  for (let index = 0; index < raw.length; index += 3) {
    const point = transformPoint(transform, raw[index] ?? 0, raw[index + 1] ?? 0, raw[index + 2] ?? 0);
    positions[index] = point[0];
    positions[index + 1] = point[1];
    positions[index + 2] = point[2];
  }
  const indices = primitive.indices === undefined
    ? Uint32Array.from({ length: positions.length / 3 }, (_, index) => index)
    : readIndices(document, buffers, primitive.indices);
  const factor = document.materials?.[primitive.material ?? -1]?.pbrMetallicRoughness?.baseColorFactor;
  const color = [
    factor?.[0] ?? 1,
    factor?.[1] ?? 1,
    factor?.[2] ?? 1,
    factor?.[3] ?? 1,
  ] as const;
  return { positions, indices, color };
}

function readFloats(document: GltfJson, buffers: readonly Uint8Array[], accessorIndex: number, components: number): Float32Array {
  const accessor = accessorAt(document, accessorIndex);
  if (accessor.componentType !== 5126 || accessor.type !== "VEC3") {
    throw new Error("Prop3D expected float VEC3 positions.");
  }
  const { view, offset, stride, count } = accessorView(document, buffers, accessor);
  const values = new Float32Array(count * components);
  for (let index = 0; index < count; index += 1) {
    for (let component = 0; component < components; component += 1) {
      values[index * components + component] = view.getFloat32(offset + index * stride + component * 4, true);
    }
  }
  return values;
}

function readIndices(document: GltfJson, buffers: readonly Uint8Array[], accessorIndex: number): Uint32Array {
  const accessor = accessorAt(document, accessorIndex);
  if (accessor.type !== "SCALAR") throw new Error("Prop3D expected scalar mesh indices.");
  const { view, offset, stride, count } = accessorView(document, buffers, accessor);
  const values = new Uint32Array(count);
  for (let index = 0; index < count; index += 1) {
    const cursor = offset + index * stride;
    if (accessor.componentType === 5121) values[index] = view.getUint8(cursor);
    else if (accessor.componentType === 5123) values[index] = view.getUint16(cursor, true);
    else if (accessor.componentType === 5125) values[index] = view.getUint32(cursor, true);
    else throw new Error(`Prop3D cannot read index component type ${accessor.componentType}.`);
  }
  return values;
}

function accessorAt(document: GltfJson, index: number): GltfAccessor {
  const accessor = document.accessors?.[index];
  if (!accessor) throw new Error(`Prop3D is missing accessor ${index}.`);
  return accessor;
}

function accessorView(document: GltfJson, buffers: readonly Uint8Array[], accessor: GltfAccessor) {
  const bufferView = document.bufferViews?.[accessor.bufferView ?? -1];
  if (!bufferView) throw new Error("Prop3D is missing a buffer view.");
  const bytes = buffers[bufferView.buffer ?? 0];
  if (!bytes) throw new Error(`Prop3D is missing buffer ${bufferView.buffer ?? 0}.`);
  const componentBytes = COMPONENT_BYTES[accessor.componentType ?? 0];
  const components = ELEMENT_COUNTS[accessor.type ?? ""] ?? 0;
  if (!componentBytes || !components) throw new Error("Prop3D found an unsupported accessor layout.");
  const stride = bufferView.byteStride ?? componentBytes * components;
  const offset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const count = accessor.count ?? 0;
  return {
    view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    offset,
    stride,
    count,
  };
}

function nodeMatrix(node: GltfNode): number[] {
  if (node.matrix && node.matrix.length === 16) return node.matrix;
  const translation = node.translation ?? [0, 0, 0];
  const rotation = node.rotation ?? [0, 0, 0, 1];
  const scale = node.scale ?? [1, 1, 1];
  const [x, y, z, w] = [rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0, rotation[3] ?? 1];
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  const sx = scale[0] ?? 1;
  const sy = scale[1] ?? 1;
  const sz = scale[2] ?? 1;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    translation[0] ?? 0, translation[1] ?? 0, translation[2] ?? 0, 1,
  ];
}

function identityMatrix(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiplyMatrix(left: number[], right: number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] = (left[row] ?? 0) * (right[column * 4] ?? 0)
        + (left[4 + row] ?? 0) * (right[column * 4 + 1] ?? 0)
        + (left[8 + row] ?? 0) * (right[column * 4 + 2] ?? 0)
        + (left[12 + row] ?? 0) * (right[column * 4 + 3] ?? 0);
    }
  }
  return out;
}

function transformPoint(matrix: number[], x: number, y: number, z: number): Vec3 {
  return [
    (matrix[0] ?? 0) * x + (matrix[4] ?? 0) * y + (matrix[8] ?? 0) * z + (matrix[12] ?? 0),
    (matrix[1] ?? 0) * x + (matrix[5] ?? 0) * y + (matrix[9] ?? 0) * z + (matrix[13] ?? 0),
    (matrix[2] ?? 0) * x + (matrix[6] ?? 0) * y + (matrix[10] ?? 0) * z + (matrix[14] ?? 0),
  ];
}
