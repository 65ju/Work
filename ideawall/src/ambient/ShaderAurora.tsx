import { useEffect, useRef } from "react";

/*
 * Aurora als GLSL-Fragment-Shader. Rendert in ~30 % Auflösung mit max. 30 fps
 * und wird per CSS weich hochskaliert – sieht flüssig aus und bleibt günstig.
 */

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uGlow;
uniform vec2 uMouse;
uniform float uLight;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.3, 7.1); a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float t = uTime * 0.035;
  vec2 q = vec2(fbm(p * 1.3 + vec2(t, -t)), fbm(p * 1.3 + vec2(3.1 - t, 1.7 + t)));
  vec2 r = vec2(fbm(p * 1.7 + q * 1.7 + vec2(1.7, 9.2) + t * 1.4), fbm(p * 1.7 + q * 1.7 + vec2(8.3, 2.8) - t));
  float f = fbm(p * 1.1 + r * 1.5);

  vec3 col = mix(uC1, uC2, smoothstep(0.2, 0.8, f));
  col = mix(col, uC3, smoothstep(0.35, 1.0, length(q) * 0.9));

  // Vorhänge: nach oben ausgeprägter, nach unten ausklingend
  float curtain = smoothstep(0.25, 0.95, f + r.y * 0.35) * smoothstep(-0.25, 0.85, uv.y + r.x * 0.3);
  float intensity = pow(clamp(f, 0.0, 1.0), 1.8) * 1.5 * curtain;

  // Tageszeit-Schein von unten
  float glow = smoothstep(1.05, 0.0, distance(vec2(uv.x * 1.4, uv.y), vec2(0.7, -0.2)));

  // Lichtkegel unter dem Zeiger
  float m = smoothstep(0.42, 0.0, distance(p, vec2(uMouse.x * asp, uMouse.y)));

  vec3 c = col * intensity + uGlow * glow * 0.32 + col * m * 0.22;
  c *= mix(1.0, 0.55, uLight);
  gl_FragColor = vec4(c, 1.0);
}`;

function hex(h: string): [number, number, number] {
  const m = h.replace("#", "");
  const n = parseInt(m.length === 3 ? m.replace(/./g, (c) => c + c) : m.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

interface Props {
  colors: [string, string, string];
  glow: string;
  light: boolean;
  onFail: () => void;
}

export function ShaderAurora({ colors, glow, light, onFail }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const target = useRef({ colors, glow, light });
  target.current = { colors, glow, light };

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      onFail();
      return;
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      onFail();
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uC = [u("uC1"), u("uC2"), u("uC3")];
    const uGlow = u("uGlow");
    const uMouse = u("uMouse");
    const uLight = u("uLight");

    const SCALE = 0.3;
    const resize = () => {
      canvas.width = Math.max(64, Math.round(window.innerWidth * SCALE));
      canvas.height = Math.max(64, Math.round(window.innerHeight * SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // Farben weich überblenden (Theme- und Phasenwechsel)
    const cur = { c: target.current.colors.map(hex), g: hex(target.current.glow), l: target.current.light ? 1 : 0 };
    const mouse = { x: 0.5, y: 0.6, tx: 0.5, ty: 0.6 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let last = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 33) return;
      last = now;
      const tc = target.current.colors.map(hex);
      const tg = hex(target.current.glow);
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) cur.c[i][k] += (tc[i][k] - cur.c[i][k]) * 0.04;
      for (let k = 0; k < 3; k++) cur.g[k] += (tg[k] - cur.g[k]) * 0.03;
      cur.l += ((target.current.light ? 1 : 0) - cur.l) * 0.05;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      uC.forEach((l, i) => gl.uniform3f(l, cur.c[i][0], cur.c[i][1], cur.c[i][2]));
      gl.uniform3f(uGlow, cur.g[0], cur.g[1], cur.g[2]);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uLight, cur.l);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className="shader-aurora" />;
}
