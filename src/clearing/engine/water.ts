import {
  CircleGeometry,
  Color,
  Mesh,
  ShaderMaterial,
  SRGBColorSpace,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
import { FIRE_POS, MOON_DIR, POND, WATER_Y } from './layout';
import { GLSL_NOISE } from './noise';
import { SKY } from './sky';

export interface Pond {
  mesh: Mesh;
  update(time: number, fire: number): void;
}

/** Still water that catches the moon, the sky and a flicker of the fire. */
export function createPond(): Pond {
  const toLinear = (v: Vector3) => new Color().setRGB(v.x, v.y, v.z, SRGBColorSpace);
  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: { value: 0 },
      uFire: { value: 1 },
      uMoonDir: { value: MOON_DIR.clone() },
      uMoonColor: { value: new Color(1.0, 0.94, 0.82) },
      uSkyLow: { value: toLinear(SKY.horizon) },
      uSkyHigh: { value: toLinear(SKY.zenith) },
      uFirePos: { value: new Vector3(FIRE_POS.x, 0.8, FIRE_POS.z) },
      uCenter: { value: new Vector3(POND.x, WATER_Y, POND.z) },
      uRadius: { value: POND.r },
    },
  ]);

  const material = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: true,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform float uFire;
      uniform vec3 uMoonDir;
      uniform vec3 uMoonColor;
      uniform vec3 uSkyLow;
      uniform vec3 uSkyHigh;
      uniform vec3 uFirePos;
      uniform vec3 uCenter;
      uniform float uRadius;
      varying vec3 vWorld;
      ${GLSL_NOISE}
      float ripple(vec2 p) {
        return vnoise(p * 1.1 + vec2(uTime * 0.18, uTime * 0.11))
             + 0.5 * vnoise(p * 2.7 - vec2(uTime * 0.29, -uTime * 0.21));
      }
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        vec2 p = vWorld.xz;
        float e = 0.12;
        float h0 = ripple(p);
        float hx = ripple(p + vec2(e, 0.0));
        float hz = ripple(p + vec2(0.0, e));
        vec3 N = normalize(vec3(-(hx - h0) / e * 0.05, 1.0, -(hz - h0) / e * 0.05));
        vec3 R = reflect(-V, N);
        float fres = 0.03 + 0.97 * pow(1.0 - max(dot(V, N), 0.0), 5.0);

        vec3 sky = mix(uSkyLow, uSkyHigh, clamp(R.y * 2.5, 0.0, 1.0));
        float m = max(dot(R, uMoonDir), 0.0);
        vec3 moon = uMoonColor * (pow(m, 1400.0) * 6.0 + pow(m, 120.0) * 0.5 + pow(m, 12.0) * 0.03);
        vec3 toFire = normalize(uFirePos - vWorld);
        float f = max(dot(R, toFire), 0.0);
        vec3 fire = vec3(1.0, 0.42, 0.12) * uFire * (pow(f, 300.0) * 2.0 + pow(f, 25.0) * 0.1);

        vec3 col = vec3(0.002, 0.003, 0.006) + sky * fres + moon + fire;
        float d = length(vWorld.xz - uCenter.xz) / uRadius;
        float alpha = 1.0 - smoothstep(0.86, 1.0, d);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });

  const mesh = new Mesh(new CircleGeometry(POND.r, 64), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(POND.x, WATER_Y, POND.z);
  mesh.renderOrder = 1;
  mesh.name = 'pond';

  return {
    mesh,
    update(time, fire) {
      uniforms.uTime.value = time;
      uniforms.uFire.value = fire;
    },
  };
}
