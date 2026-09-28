import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
import { CLEARING_RADIUS, ColliderGrid, heightAt, openingMask } from './layout';
import { fbm, mulberry32, smoothstep, valueNoise } from './noise';

export function createGround(): Mesh {
  const size = 280;
  const segments = 200;
  const geo = new PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const ash = new Color('#2e2622');
  const dirt = new Color('#3b3226');
  const grassA = new Color('#2b3c25');
  const grassB = new Color('#3a4b2c');
  const needles = new Color('#26241b');
  const needlesB = new Color('#2f2c20');
  const meadow = new Color('#324329');
  const tmp = new Color();
  const tmp2 = new Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));

    const r = Math.hypot(x, z);
    const open = openingMask(x, z);
    const patch = fbm(x * 0.18, z * 0.18, 3, 3);
    const speck = valueNoise(x * 1.7, z * 1.7, 5);

    tmp.copy(grassA).lerp(grassB, patch);
    const forestW = smoothstep(CLEARING_RADIUS - 1.5, CLEARING_RADIUS + 3.5, r) * (1 - open);
    tmp2.copy(needles).lerp(needlesB, speck);
    tmp.lerp(tmp2, forestW);
    const meadowW = open * smoothstep(CLEARING_RADIUS - 2, CLEARING_RADIUS + 4, r);
    tmp.lerp(meadow, meadowW * 0.7);

    const dirtW = 1 - smoothstep(1.6, 3.0 + patch * 0.8, r);
    tmp.lerp(dirt, dirtW);
    const ashW = 1 - smoothstep(0.6, 1.35, r);
    tmp.lerp(ash, ashW);

    const shade = 0.82 + speck * 0.3;
    colors[i * 3] = tmp.r * shade;
    colors[i * 3 + 1] = tmp.g * shade;
    colors[i * 3 + 2] = tmp.b * shade;
  }

  geo.setAttribute('color', new BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new Mesh(geo, new MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'ground';
  return mesh;
}

function bladeGeometry(): BufferGeometry {
  const rows = [0, 0.3, 0.58, 0.82];
  const verts: number[] = [];
  for (const t of rows) {
    const w = 0.5 * Math.pow(1 - t, 0.85);
    const bend = t * t * 0.28;
    verts.push(-w, t, bend, w, t, bend);
  }
  verts.push(0, 1, 0.34);
  const index: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (rows.length - 1) * 2;
  index.push(last, last + 1, last + 2);

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
  geo.setIndex(index);
  return geo;
}

export interface GrassUniforms {
  uTime: { value: number };
  uFire: { value: number };
}

export function createGrass(
  colliders: ColliderGrid,
  maxCount: number,
  ambient: Color,
  moon: Color,
): { mesh: InstancedMesh; uniforms: GrassUniforms } {
  const rng = mulberry32(90210);
  const geo = bladeGeometry();

  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: { value: 0 },
      uFire: { value: 1 },
      uAmbient: { value: ambient },
      uMoon: { value: moon },
      uFireColor: { value: new Color(1.0, 0.5, 0.2) },
    },
  ]);

  const material = new ShaderMaterial({
    uniforms,
    side: DoubleSide,
    fog: true,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      uniform float uTime;
      attribute float aVar;
      varying float vH;
      varying float vVar;
      varying vec3 vWorld;
      void main() {
        vH = position.y;
        vVar = aVar;
        vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float gust = sin(uTime * 0.35 + world.x * 0.05) * 0.5 + 0.5;
        float w = sin(uTime * 1.4 + world.x * 0.33 + world.z * 0.21) * 0.6
                + sin(uTime * 2.9 + world.x * 0.9 - world.z * 0.4) * 0.18;
        float bend = vH * vH * (0.06 + 0.1 * gust);
        world.x += w * bend;
        world.z += w * bend * 0.5;
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uFire;
      uniform vec3 uAmbient;
      uniform vec3 uMoon;
      uniform vec3 uFireColor;
      varying float vH;
      varying float vVar;
      varying vec3 vWorld;
      void main() {
        vec3 root = vec3(0.012, 0.022, 0.009);
        vec3 tip = vec3(0.05, 0.085, 0.028);
        vec3 albedo = mix(root, tip, vH) * (0.7 + 0.6 * vVar);
        float d = length(vWorld - vec3(0.0, 0.9, 0.0));
        vec3 fire = uFireColor * uFire / (1.0 + d * d * 0.55);
        vec3 light = uAmbient + uMoon * (0.35 + 0.65 * vH) + fire;
        gl_FragColor = vec4(albedo * light, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });

  const mesh = new InstancedMesh(geo, material, maxCount);
  const variation = new Float32Array(maxCount);
  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const p = new Vector3();
  const s = new Vector3();

  let placed = 0;
  let attempts = 0;
  while (placed < maxCount && attempts < maxCount * 12) {
    attempts++;
    const r = Math.sqrt(rng()) * 32;
    const a = rng() * Math.PI * 2;
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r;
    if (r < 1.9) continue;
    const open = openingMask(x, z);
    const inClearing = 1 - smoothstep(CLEARING_RADIUS - 1, CLEARING_RADIUS + 4, r);
    const meadow = open * (1 - smoothstep(22, 32, r));
    const nearFire = smoothstep(1.9, 3.2, r);
    const clump = 0.55 + 0.45 * fbm(x * 0.22, z * 0.22, 2, 11);
    const p0 = Math.max(inClearing, meadow * 0.9, 0.12) * nearFire * clump;
    if (rng() > p0) continue;
    if (colliders.blocked(x, z, 0.05)) continue;

    const tall = 0.26 + rng() * 0.34 + meadow * 0.3 * rng();
    const wide = 0.055 + rng() * 0.04;
    e.set((rng() - 0.5) * 0.35, rng() * Math.PI * 2, (rng() - 0.5) * 0.25);
    q.setFromEuler(e);
    p.set(x, heightAt(x, z) - 0.02, z);
    s.set(wide, tall, wide);
    m.compose(p, q, s);
    mesh.setMatrixAt(placed, m);
    variation[placed] = rng();
    placed++;
  }

  geo.setAttribute('aVar', new InstancedBufferAttribute(variation, 1));
  mesh.count = placed;
  mesh.userData.placed = placed;
  mesh.frustumCulled = false;
  mesh.name = 'grass';

  return { mesh, uniforms: uniforms as unknown as GrassUniforms };
}
