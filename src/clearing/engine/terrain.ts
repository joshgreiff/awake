import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { CLEARING_RADIUS, ColliderGrid, POND, heightAt, openingMask } from './layout';
import { fbm, mulberry32, smoothstep, valueNoise } from './noise';

export function createGround(): Mesh {
  const size = 280;
  const segments = 256;
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
  const mud = new Color('#1d1f16');
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

    const pd = Math.hypot(x - POND.x, z - POND.z);
    tmp.lerp(mud, 1 - smoothstep(POND.r * 0.9, POND.r * 1.35, pd));

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
  mesh.receiveShadow = true;
  return mesh;
}

function bladeGeometry(): BufferGeometry {
  const rows = [0, 0.3, 0.58, 0.82];
  const verts: number[] = [];
  const colors: number[] = [];
  const root = new Color('#223318');
  const tip = new Color('#4f6b34');
  const c = new Color();
  for (const t of rows) {
    const w = 0.5 * Math.pow(1 - t, 0.85);
    const bend = t * t * 0.28;
    verts.push(-w, t, bend, w, t, bend);
    c.copy(root).lerp(tip, t);
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  verts.push(0, 1, 0.34);
  colors.push(tip.r, tip.g, tip.b);
  const index: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (rows.length - 1) * 2;
  index.push(last, last + 1, last + 2);

  const count = verts.length / 3;
  const normals = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) normals[i * 3 + 1] = 1;

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
  geo.setAttribute('normal', new BufferAttribute(normals, 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geo.setIndex(index);
  return geo;
}

export interface GrassUniforms {
  uTime: { value: number };
  /** Fire position in view space, updated per frame. */
  uFireView: { value: Vector3 };
}

/**
 * Instanced grass on a standard Lambert material (so it takes fire light and shadows),
 * with wind injected into the vertex shader.
 */
export function createGrass(
  colliders: ColliderGrid,
  maxCount: number,
): { mesh: InstancedMesh; uniforms: GrassUniforms } {
  const rng = mulberry32(90210);
  const geo = bladeGeometry();
  const uniforms: GrassUniforms = { uTime: { value: 0 }, uFireView: { value: new Vector3() } };

  const material = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uFireView = uniforms.uFireView;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition = modelMatrix * mvPosition;
        float gust = sin( uTime * 0.35 + mvPosition.x * 0.05 ) * 0.5 + 0.5;
        float sway = sin( uTime * 1.4 + mvPosition.x * 0.33 + mvPosition.z * 0.21 ) * 0.6
                   + sin( uTime * 2.9 + mvPosition.x * 0.9 - mvPosition.z * 0.4 ) * 0.18;
        float bend = position.y * position.y * ( 0.06 + 0.1 * gust );
        mvPosition.x += sway * bend;
        mvPosition.z += sway * bend * 0.5;
        mvPosition = viewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `,
      );
    // Blades lean their normal toward the fire so it lights them from any side,
    // plus a constant moonlit fill so they never go fully black.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uFireView;')
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        vec3 upView = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
        vec3 toFire = uFireView + vViewPosition;
        toFire -= upView * dot( toFire, upView );
        normal = normalize( upView * 2.4 + normalize( toFire + 1e-4 ) );`,
      )
      .replace(
        '#include <aomap_fragment>',
        '#include <aomap_fragment>\n  reflectedLight.indirectDiffuse += vec3( 0.07, 0.09, 0.15 ) * diffuseColor.rgb;',
      );
  };
  material.customProgramCacheKey = () => 'clearing-grass';

  const mesh = new InstancedMesh(geo, material, maxCount);
  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const p = new Vector3();
  const s = new Vector3();
  const c = new Color();

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

    const pd = Math.hypot(x - POND.x, z - POND.z);
    const reedy = 1 - smoothstep(POND.r * 0.95, POND.r * 1.6, pd);
    const tall = 0.26 + rng() * 0.34 + meadow * 0.3 * rng() + reedy * (0.5 + rng() * 0.6);
    const wide = 0.055 + rng() * 0.04 - reedy * 0.02;
    e.set((rng() - 0.5) * 0.35, rng() * Math.PI * 2, (rng() - 0.5) * 0.25);
    q.setFromEuler(e);
    p.set(x, heightAt(x, z) - 0.02, z);
    s.set(wide, tall, wide);
    m.compose(p, q, s);
    mesh.setMatrixAt(placed, m);
    const v = 0.7 + rng() * 0.6;
    c.setRGB(v, v * (0.95 + rng() * 0.1), v * (0.85 + rng() * 0.2));
    mesh.setColorAt(placed, c);
    placed++;
  }

  mesh.count = placed;
  mesh.userData.placed = placed;
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.name = 'grass';

  return { mesh, uniforms };
}
