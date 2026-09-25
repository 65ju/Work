import { memo } from "react";

/**
 * „Byte“ – kleiner Roboter mit Röhrenmonitor-Kopf. Alle Gesichter, Posen und
 * Accessoires sind vorhanden und werden per CSS (data-pose / data-face) geschaltet,
 * damit Zustandswechsel keinen React-Re-Render brauchen.
 */
export const ByteSvg = memo(function ByteSvg() {
  return (
    <svg className="byte-svg" viewBox="0 0 100 124" aria-hidden>
      <defs>
        <clipPath id="byte-head-clip">
          <rect x="16" y="20" width="68" height="52" rx="17" />
        </clipPath>
        <clipPath id="byte-body-clip">
          <rect x="28" y="72" width="44" height="32" rx="13" />
        </clipPath>
      </defs>

      {/* Beine */}
      <g className="b-leg b-leg-l">
        <rect x="36" y="98" width="9" height="16" rx="4.5" className="c-limb" />
        <rect x="29" y="110" width="19" height="10" rx="5" className="c-foot" />
        <rect x="31" y="111" width="7" height="3" rx="1.5" className="c-hi" />
      </g>
      <g className="b-leg b-leg-r">
        <rect x="55" y="98" width="9" height="16" rx="4.5" className="c-limb" />
        <rect x="52" y="110" width="19" height="10" rx="5" className="c-foot" />
        <rect x="54" y="111" width="7" height="3" rx="1.5" className="c-hi" />
      </g>

      <g className="b-torso">
        {/* Hinterer Arm */}
        <g className="b-arm b-arm-l">
          <rect x="20" y="76" width="9" height="21" rx="4.5" className="c-limb c-limb-back" />
          <circle cx="24.5" cy="98" r="5.5" className="c-hand c-limb-back" />
        </g>

        {/* Körper */}
        <rect x="28" y="72" width="44" height="32" rx="13" className="c-body" />
        <g clipPath="url(#byte-body-clip)">
          <rect x="62" y="70" width="14" height="40" className="c-body-shade" />
          <rect x="24" y="98" width="52" height="10" className="c-body-shade" />
        </g>
        <rect x="32" y="75" width="10" height="4" rx="2" className="c-hi" />
        <rect x="39" y="80" width="22" height="13" rx="4" className="c-chest" />
        <circle cx="50" cy="86.5" r="3.2" className="c-heart" />
        <rect x="28" y="72" width="44" height="32" rx="13" className="c-outline" />

        {/* Laptop (Fokus) */}
        <g className="acc acc-laptop">
          <path d="M30 88 L70 88 L74 106 L26 106 Z" className="c-laptop-screen" />
          <rect x="22" y="104" width="56" height="7" rx="3" className="c-laptop-base" />
          <circle cx="50" cy="96" r="2.4" className="c-laptop-logo" />
        </g>

        {/* Hals & Kopf */}
        <rect x="44" y="66" width="12" height="9" rx="3" className="c-neck" />
        <g className="b-head">
          <g className="b-antenna">
            <line x1="50" y1="22" x2="50" y2="8" className="c-antenna" />
            <circle cx="50" cy="7" r="6" className="c-antenna-ball" />
            <circle cx="48" cy="5" r="1.8" className="c-hi-solid" />
          </g>
          <circle cx="15" cy="46" r="6" className="c-ear" />
          <circle cx="85" cy="46" r="6" className="c-ear" />

          <rect x="16" y="20" width="68" height="52" rx="17" className="c-head" />
          <g clipPath="url(#byte-head-clip)">
            <rect x="72" y="16" width="16" height="60" className="c-head-shade" />
            <rect x="12" y="64" width="80" height="12" className="c-head-shade" />
          </g>
          <rect x="22" y="23" width="18" height="5" rx="2.5" className="c-hi" />

          <rect x="24" y="28" width="52" height="36" rx="11" className="c-screen" />
          <path d="M29 33 L38 33 L31 41 Z" className="c-screen-glare" />

          <g className="b-face">
            {/* Wangen */}
            <rect x="28" y="52" width="7" height="4" rx="2" className="c-cheek" />
            <rect x="65" y="52" width="7" height="4" rx="2" className="c-cheek" />

            <g className="face face-normal">
              <g className="eyes-blink">
                <rect x="34" y="36" width="9" height="13" rx="3.5" className="c-eye" />
                <rect x="57" y="36" width="9" height="13" rx="3.5" className="c-eye" />
                <rect x="36" y="38" width="3" height="3" className="c-eye-hi" />
                <rect x="59" y="38" width="3" height="3" className="c-eye-hi" />
              </g>
              <path d="M43 55 Q50 60 57 55" className="c-mouth" />
            </g>

            <g className="face face-happy">
              <path d="M33 46 Q38.5 37 44 46" className="c-eye-line" />
              <path d="M56 46 Q61.5 37 67 46" className="c-eye-line" />
              <path d="M42 53 Q50 62 58 53 Z" className="c-mouth-open" />
            </g>

            <g className="face face-sleepy">
              <path d="M33 44 Q38.5 47 44 44" className="c-eye-line" />
              <path d="M56 44 Q61.5 47 67 44" className="c-eye-line" />
              <circle cx="50" cy="56" r="2.6" className="c-mouth-open" />
            </g>

            <g className="face face-error">
              <path d="M34 37 L43 46 M43 37 L34 46" className="c-eye-line c-eye-err" />
              <path d="M57 37 L66 46 M66 37 L57 46" className="c-eye-line c-eye-err" />
              <path d="M41 57 Q44.5 53 48 57 T 55 57 T 60 57" className="c-mouth c-mouth-err" />
            </g>

            <g className="face face-surprised">
              <circle cx="38.5" cy="42" r="6" className="c-eye" />
              <circle cx="61.5" cy="42" r="6" className="c-eye" />
              <rect x="36" y="39" width="3" height="3" className="c-eye-hi" />
              <rect x="59" y="39" width="3" height="3" className="c-eye-hi" />
              <ellipse cx="50" cy="56" rx="4" ry="4.6" className="c-mouth-open" />
            </g>

            <g className="face face-think">
              <rect x="37" y="34" width="8" height="10" rx="3" className="c-eye" />
              <rect x="60" y="34" width="8" height="10" rx="3" className="c-eye" />
              <path d="M44 56 L56 54" className="c-mouth" />
            </g>

            <g className="face face-dizzy">
              <path d="M38.5 42 m-5 0 a5 5 0 1 0 10 0 a3.2 3.2 0 1 0 -6.4 0 a1.4 1.4 0 1 0 2.8 0" className="c-eye-line" />
              <path d="M61.5 42 m-5 0 a5 5 0 1 0 10 0 a3.2 3.2 0 1 0 -6.4 0 a1.4 1.4 0 1 0 2.8 0" className="c-eye-line" />
              <path d="M42 57 Q46 54 50 57 T 58 57" className="c-mouth" />
            </g>
          </g>
          <rect x="16" y="20" width="68" height="52" rx="17" className="c-outline" />

          {/* Kopfhörer (Fokus) */}
          <g className="acc acc-headphones">
            <path d="M13 46 C 13 6, 87 6, 87 46" className="c-hp-band" />
            <rect x="6" y="36" width="13" height="22" rx="6" className="c-hp-cup" />
            <rect x="81" y="36" width="13" height="22" rx="6" className="c-hp-cup" />
          </g>
        </g>

        {/* Vorderer Arm mit Accessoires */}
        <g className="b-arm b-arm-r">
          <rect x="71" y="76" width="9" height="21" rx="4.5" className="c-limb" />
          <g className="acc acc-mug">
            <rect x="69" y="96" width="15" height="15" rx="3" className="c-mug" />
            <path d="M84 99 q6 0 6 5 q0 5 -6 5" className="c-mug-handle" />
            <rect x="71" y="97" width="11" height="3" rx="1.5" className="c-coffee" />
          </g>
          <g className="acc acc-warn">
            <line x1="75.5" y1="98" x2="75.5" y2="111" className="c-antenna" />
            {/* Lokal kopfüber gezeichnet – der erhobene Arm dreht das Schild aufrecht. */}
            <path d="M60 110 L91 110 L75.5 136 Z" className="c-warn" />
            <path d="M75.5 119 L75.5 127 M75.5 114 L75.5 114.5" className="c-warn-mark" />
          </g>
          <circle cx="75.5" cy="98" r="5.5" className="c-hand" />
        </g>
      </g>
    </svg>
  );
});
