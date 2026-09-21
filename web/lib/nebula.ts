import * as THREE from 'three'

/**
 * 성운 배경.
 *
 * 텍스처 이미지가 아니라 셰이더로 생성한다. 용량 부담이 없고 해상도에 무관하며,
 * 시간을 넣어 아주 느리게 흐르게 할 수 있다.
 *
 * 안쪽을 향한 큰 구를 씌우는 방식이라 카메라가 어디를 보든 배경이 된다.
 * 깊이 버퍼에 쓰지 않으므로 노드가 항상 앞에 그려진다.
 */
const VERT = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  varying vec3 vPos;
  uniform float uTime;
  uniform vec3 uColorA;   // 짙은 남보라
  uniform vec3 uColorB;   // 청록
  uniform float uIntensity;

  // 3D 해시 기반 value noise
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  // fractal Brownian motion — 옥타브를 겹쳐 구름 결을 만든다
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vPos);
    float t = uTime * 0.008;                 // 아주 느리게 (기획 §7 절제 원칙)
    float n = fbm(dir * 2.2 + vec3(t, t * 0.6, -t * 0.4));
    float m = fbm(dir * 4.5 - vec3(t * 0.7, -t, t * 0.3));

    float density = smoothstep(0.42, 0.78, n * 0.75 + m * 0.35);
    vec3 col = mix(uColorA, uColorB, smoothstep(0.3, 0.9, m));

    // 성운은 항상 노드보다 어둡다 — 배경이 주인공이 되면 안 된다
    gl_FragColor = vec4(col * density * uIntensity, 1.0);
  }
`

export function createNebula(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#1a1b3d') },
      uColorB: { value: new THREE.Color('#123b4a') },
      uIntensity: { value: 0.62 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  })

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 24), material)
  mesh.renderOrder = -100
  mesh.frustumCulled = false
  return mesh
}

/**
 * 별먼지. 카메라가 움직일 때 시차로 깊이감을 만든다.
 * 성운과 마찬가지로 노드보다 어둡게 둔다.
 */
export function createStarfield(count = 2400): THREE.Points {
  const pos = new Float32Array(count * 3)
  const alpha = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // 껍질 안쪽에 고르게 뿌린다
    const r = 900 + Math.random() * 2400
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = r * Math.cos(phi)
    alpha[i] = 0.25 + Math.random() * 0.55
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geom.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))

  const material = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 1.6;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        if (dot(d, d) > 0.25) discard;
        gl_FragColor = vec4(0.72, 0.78, 0.9, vAlpha * 0.55);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const points = new THREE.Points(geom, material)
  points.renderOrder = -90
  points.frustumCulled = false
  return points
}
