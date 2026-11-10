/* Ícones desenhados para o Terrália (SVG, sem dependências) */
window.ICONES = (() => {
  const C = '#5a3519', W = 3.2;
  const svg = (d) => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round">${d}</svg>`;
  return {
    moeda: svg(`<circle cx="32" cy="32" r="27" fill="#f7c534" stroke="#a8670a" stroke-width="${W}"/>
      <circle cx="32" cy="32" r="19" fill="#ffd95a" stroke="#e09b16" stroke-width="3"/>
      <path d="M32 18c-7 7-7 19 0 28 7-9 7-21 0-28z" fill="#e9a21c" stroke="#b8730c" stroke-width="2.4"/>
      <path d="M32 22v22" stroke="#b8730c" stroke-width="2"/>
      <ellipse cx="22" cy="20" rx="5" ry="3" fill="#fff6c8" opacity=".8" transform="rotate(-35 22 20)"/>`),
    regador: svg(`<path d="M44 33l13-12 4 4-14 15" fill="#5bb3ea" stroke="#1f5f8f" stroke-width="${W}"/>
      <ellipse cx="59" cy="23" rx="3.5" ry="5" fill="#9fd6f5" stroke="#1f5f8f" stroke-width="2.4" transform="rotate(-45 59 23)"/>
      <path d="M18 28c0-12 24-12 24 0" fill="none" stroke="#1f5f8f" stroke-width="4.5"/>
      <path d="M12 28h32a3 3 0 0 1 3 3v20a7 7 0 0 1-7 7H18a7 7 0 0 1-7-7V31a3 3 0 0 1 1-3z" fill="#5bb3ea" stroke="#1f5f8f" stroke-width="${W}"/>
      <rect x="15" y="35" width="26" height="5" rx="2.5" fill="#9fd6f5"/>
      <path d="M10 14c-2 3-2 5 0 6 2-1 2-3 0-6zM18 8c-2 3-2 5 0 6 2-1 2-3 0-6z" fill="#7cc8f2" stroke="#1f5f8f" stroke-width="1.6"/>`),
    saco: svg(`<path d="M21 24c-7 8-11 18-9 26 2 8 10 10 20 10s18-2 20-10c2-8-2-18-9-26z" fill="#e2b06c" stroke="${C}" stroke-width="${W}"/>
      <path d="M23 24h18l-3-10H26z" fill="#cf9853" stroke="${C}" stroke-width="${W}"/>
      <path d="M21 24h22" stroke="#c0392b" stroke-width="4.5"/>
      <ellipse cx="32" cy="44" rx="13" ry="11" fill="#f6dcae"/>`),
    cesta: svg(`<path d="M17 30c0-17 30-17 30 0" fill="none" stroke="${C}" stroke-width="5"/>
      <circle cx="24" cy="27" r="7" fill="#e83b2c" stroke="#8e1f15" stroke-width="2.4"/>
      <circle cx="37" cy="25" r="7.5" fill="#7fd35a" stroke="#3a7d22" stroke-width="2.4"/>
      <path d="M45 22l6-6" stroke="#3a7d22" stroke-width="3"/><circle cx="45" cy="29" r="6" fill="#f58a20" stroke="#9a4d0c" stroke-width="2.4"/>
      <path d="M8 31h48l-6 25H14z" fill="#d79a52" stroke="${C}" stroke-width="${W}"/>
      <path d="M12 39h40M13.5 47h37M22 31l-2 25M32 31v25M42 31l2 25" stroke="#a96d32" stroke-width="2.2"/>`),
    loja: svg(`<rect x="12" y="30" width="40" height="26" rx="2" fill="#f2d3a1" stroke="${C}" stroke-width="${W}"/>
      <rect x="10" y="42" width="44" height="8" rx="2" fill="#b77a45" stroke="${C}" stroke-width="${W}"/>
      <path d="M14 30v-8M50 30v-8" stroke="${C}" stroke-width="3.5"/>
      <path d="M8 22h48l-4 9H12z" fill="#fff" stroke="${C}" stroke-width="${W}"/>
      <path d="M17 22l-1 9M26 22v9M38 22v9M47 22l1 9" stroke="#e2453a" stroke-width="6"/>
      <path d="M8 22h48l-4 9H12z" fill="none" stroke="${C}" stroke-width="${W}"/>
      <circle cx="23" cy="39" r="3.5" fill="#e83b2c"/><circle cx="32" cy="38.5" r="3.5" fill="#f5c63a"/><circle cx="41" cy="39" r="3.5" fill="#7fd35a"/>
      <path d="M10 18c8-10 36-10 44 0" fill="none" stroke="${C}" stroke-width="3"/>`),
    celeiro: svg(`<path d="M8 32L32 12l24 20v24H8z" fill="#d9483b" stroke="#6b2018" stroke-width="${W}"/>
      <path d="M4 34L32 10l28 24" fill="none" stroke="#7a3b2e" stroke-width="5"/>
      <rect x="22" y="36" width="20" height="20" fill="#f6ead3" stroke="#6b2018" stroke-width="${W}"/>
      <path d="M22 36l20 20M42 36L22 56" stroke="#c0392b" stroke-width="3"/>
      <rect x="27" y="22" width="10" height="8" fill="#f6ead3" stroke="#6b2018" stroke-width="2.4"/>`),
    martelo: svg(`<path d="M27 25l26 26-5 5-26-26z" fill="#c98b52" stroke="${C}" stroke-width="${W}"/>
      <path d="M10 18l12-12 6 6-4 4 8 8-6 6-8-8-4 4z" fill="#aeb6bf" stroke="#4a525b" stroke-width="${W}"/>
      <path d="M40 10a10 10 0 0 0 13 13l-4 4-9-9z" fill="#aeb6bf" stroke="#4a525b" stroke-width="2.8"/>
      <path d="M36 28l-20 20a4 4 0 0 0 6 6l20-20" fill="#8d96a0" stroke="#4a525b" stroke-width="2.8"/>`),
    pata: svg(`<ellipse cx="32" cy="42" rx="13" ry="11" fill="#c98b52" stroke="${C}" stroke-width="${W}"/>
      <ellipse cx="15" cy="30" rx="5.5" ry="7" fill="#c98b52" stroke="${C}" stroke-width="${W}"/>
      <ellipse cx="25" cy="19" rx="5.5" ry="7.5" fill="#c98b52" stroke="${C}" stroke-width="${W}"/>
      <ellipse cx="39" cy="19" rx="5.5" ry="7.5" fill="#c98b52" stroke="${C}" stroke-width="${W}"/>
      <ellipse cx="49" cy="30" rx="5.5" ry="7" fill="#c98b52" stroke="${C}" stroke-width="${W}"/>
      <ellipse cx="32" cy="44" rx="7" ry="5" fill="#f2c7a0"/>`),
    engrenagem: svg(`<rect x="27" y="4" width="10" height="14" rx="2.5" fill="#c3cad1" stroke="#4a525b" stroke-width="3" transform="rotate(0 32 32)"/><rect x="27" y="4" width="10" height="14" rx="2.5" fill="#c3cad1" stroke="#4a525b" stroke-width="3" transform="rotate(45 32 32)"/><rect x="27" y="4" width="10" height="14" rx="2.5" fill="#c3cad1" stroke="#4a525b" stroke-width="3" transform="rotate(90 32 32)"/><rect x="27" y="4" width="10" height="14" rx="2.5" fill="#c3cad1" stroke="#4a525b" stroke-width="3" transform="rotate(135 32 32)"/><rect x="27" y="4" width="10" height="14" rx="2.5" fill="#c3cad1" stroke="#4a525b" stroke-width="3" transform="rotate(180 32 32)"/><rect x="27" y="4" width="10" height="14" rx="2.5" fill="#c3cad1" stroke="#4a525b" stroke-width="3" transform="rotate(225 32 32)"/><rect x="27" y="4" width="10" height="14" rx="2.5" fill="#c3cad1" stroke="#4a525b" stroke-width="3" transform="rotate(270 32 32)"/><rect x="27" y="4" width="10" height="14" rx="2.5" fill="#c3cad1" stroke="#4a525b" stroke-width="3" transform="rotate(315 32 32)"/>
      <circle cx="32" cy="32" r="18" fill="#c3cad1" stroke="#4a525b" stroke-width="${W}"/>
      <circle cx="32" cy="32" r="7" fill="#7a5233" stroke="#4a525b" stroke-width="${W}"/>`),
    alvo: svg(`<circle cx="32" cy="32" r="21" fill="#fff8ea" stroke="${C}" stroke-width="${W}"/>
      <circle cx="32" cy="32" r="12" fill="#ffd25a" stroke="${C}" stroke-width="${W}"/>
      <circle cx="32" cy="32" r="4.5" fill="#e2453a" stroke="${C}" stroke-width="2.4"/>
      <path d="M32 4v9M32 51v9M4 32h9M51 32h9" stroke="${C}" stroke-width="4"/>`),
    osso: svg(`<g transform="rotate(-35 32 32)"><rect x="14" y="26" width="36" height="12" rx="5" fill="#fff6e4" stroke="${C}" stroke-width="${W}"/>
      <circle cx="13" cy="25" r="7" fill="#fff6e4" stroke="${C}" stroke-width="${W}"/><circle cx="13" cy="39" r="7" fill="#fff6e4" stroke="${C}" stroke-width="${W}"/>
      <circle cx="51" cy="25" r="7" fill="#fff6e4" stroke="${C}" stroke-width="${W}"/><circle cx="51" cy="39" r="7" fill="#fff6e4" stroke="${C}" stroke-width="${W}"/>
      <rect x="14" y="27.6" width="36" height="8.8" fill="#fff6e4"/></g>`),
    lapis: svg(`<path d="M44 8l12 12-30 30-15 3 3-15z" fill="#ffc93c" stroke="${C}" stroke-width="${W}"/>
      <path d="M44 8l12 12-6 6-12-12z" fill="#f2735b" stroke="${C}" stroke-width="${W}"/>
      <path d="M14 38l12 12-15 3z" fill="#f6dcae" stroke="${C}" stroke-width="${W}"/><path d="M11 49l-1 5 5-1z" fill="${C}"/>`),
    caixa: svg(`<path d="M8 22l24-12 24 12v30L32 62 8 52z" fill="#c98b52" stroke="${C}" stroke-width="${W}"/>
      <path d="M8 22l24 12 24-12M32 34v28" fill="none" stroke="${C}" stroke-width="${W}"/>
      <path d="M20 16l24 12v10l-6-3v-7L14 19z" fill="#e8c38a" stroke="${C}" stroke-width="2.6"/>
      <path d="M13 32l13 6M13 41l13 6" stroke="#9a6238" stroke-width="2.6"/>`),
    estrela: svg(`<path d="M32 5l8 17 19 2-14 13 4 19-17-10-17 10 4-19L5 24l19-2z" fill="#ffc93c" stroke="#b26a00" stroke-width="${W}"/>`),
  };
})();
