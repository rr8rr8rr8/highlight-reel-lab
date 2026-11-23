// Shared helpers for the lab prototypes. Load with <script src="lib.js"></script> — exposes window.Reel.
// Pages must be served from http://localhost:8522/lab/ (YouTube refuses file:// embeds).
(function () {
  const apiReady = new Promise(resolve => {
    window.onYouTubeIframeAPIReady = resolve;
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });

  const FLAGS = { England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', Ireland: '🇮🇪', Spain: '🇪🇸', Italy: '🇮🇹', Germany: '🇩🇪',
    France: '🇫🇷', Portugal: '🇵🇹', Netherlands: '🇳🇱', Belgium: '🇧🇪', Turkey: '🇹🇷', Greece: '🇬🇷', Austria: '🇦🇹', Poland: '🇵🇱',
    Croatia: '🇭🇷', Serbia: '🇷🇸', Romania: '🇷🇴', Ukraine: '🇺🇦', Czechia: '🇨🇿', Hungary: '🇭🇺', Israel: '🇮🇱', Europe: '🇪🇺',
    USA: '🇺🇸', Canada: '🇨🇦', Mexico: '🇲🇽', CONCACAF: '🌎', Jamaica: '🇯🇲', Trinidad: '🇹🇹', 'Costa Rica': '🇨🇷', Honduras: '🇭🇳',
    'El Salvador': '🇸🇻', Panama: '🇵🇦', Brazil: '🇧🇷', Argentina: '🇦🇷', Uruguay: '🇺🇾', Chile: '🇨🇱', Colombia: '🇨🇴', Peru: '🇵🇪',
    Ecuador: '🇪🇨', Paraguay: '🇵🇾', Venezuela: '🇻🇪', CONMEBOL: '🌎', Japan: '🇯🇵', Korea: '🇰🇷', Australia: '🇦🇺', AFC: '🌏',
    India: '🇮🇳', Indonesia: '🇮🇩', Thailand: '🇹🇭', Vietnam: '🇻🇳', Malaysia: '🇲🇾', Philippines: '🇵🇭', Uzbekistan: '🇺🇿',
    'Saudi Arabia': '🇸🇦', UAE: '🇦🇪', Qatar: '🇶🇦', Egypt: '🇪🇬', 'South Africa': '🇿🇦', Nigeria: '🇳🇬', Ghana: '🇬🇭', Kenya: '🇰🇪',
    Tanzania: '🇹🇿', Senegal: '🇸🇳', CAF: '🌍', World: '🌐', Clubs: '🛡️' };
  // Rough [lat, lon] per catalog country, for map-style prototypes
  const GEO = { England: [52.5, -1.5], Scotland: [56.5, -4], Wales: [52.3, -3.7], Ireland: [53.3, -8], Spain: [40, -4], Italy: [42.5, 12.5],
    Germany: [51, 10], France: [46.5, 2.5], Portugal: [39.5, -8], Netherlands: [52.2, 5.3], Belgium: [50.6, 4.6], Turkey: [39, 35],
    Greece: [39, 22], Austria: [47.5, 14], Poland: [52, 19], Croatia: [45.2, 15.5], Serbia: [44, 21], Romania: [46, 25],
    Ukraine: [49, 32], Czechia: [49.8, 15.5], Hungary: [47, 19.5], Israel: [31.5, 35], USA: [39, -98], Canada: [56, -106],
    Mexico: [23, -102], Jamaica: [18.1, -77.3], Trinidad: [10.5, -61.3], 'Costa Rica': [10, -84], Honduras: [15, -86.5],
    'El Salvador': [13.7, -89], Panama: [8.5, -80], Brazil: [-10, -52], Argentina: [-35, -64], Uruguay: [-33, -56], Chile: [-33, -71],
    Colombia: [4, -73], Peru: [-10, -76], Ecuador: [-1.5, -78.5], Paraguay: [-23, -58], Venezuela: [7, -66], Japan: [36, 138],
    Korea: [36.5, 128], Australia: [-25, 134], India: [21, 78], Indonesia: [-2, 118], Thailand: [15, 101], Vietnam: [16, 107.5],
    Malaysia: [4, 102], Philippines: [13, 122], Uzbekistan: [41, 64], 'Saudi Arabia': [24, 45], UAE: [24, 54], Qatar: [25.3, 51.2],
    Egypt: [27, 30], 'South Africa': [-29, 24], Nigeria: [9, 8], Ghana: [8, -1.2], Kenya: [0.5, 38], Tanzania: [-6, 35], Senegal: [14.5, -14.5] };

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function ago(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm';
    if (s < 86400) return Math.round(s / 3600) + 'h';
    return Math.round(s / 86400) + 'd';
  }

  let cache = null;
  // -> Promise<items>. Item: { id, title, channel, channelId, country, group, published (ISO), views, action (bool),
  //    ctx: { league, teams:[{id,name,league,country}], players:[{id,name,club}], score:{home,away,h,a}|null } }
  // Newest first. actionOnly keeps only Shorts whose title reads as match action (~480 of ~2200).
  async function load({ actionOnly = true } = {}) {
    if (!cache) cache = fetch('feed.json').then(r => r.json()).then(d => d.items);
    const items = await cache;
    return actionOnly ? items.filter(v => v.action) : items.slice();
  }

  // Mounts a YouTube player filling `el` (el needs a size and position:relative). Returns Promise<YT.Player>.
  // Autoplay only works muted until the user has clicked something on the page; call p.unMute() after a click.
  // opts: { muted=true, autoplay=true, controls=false, loop=false, onEnd(), onError(), onPlaying() }
  // A transparent shield div sits over the iframe so clicks/scrolls reach your page; pass shield:false to disable.
  async function player(el, videoId, opts = {}) {
    await apiReady;
    const o = Object.assign({ muted: true, autoplay: true, controls: false, loop: false, shield: true }, opts);
    el.innerHTML = '<div style="position:absolute;inset:0"><div></div></div>' +
      (o.shield ? '<div data-shield style="position:absolute;inset:0;z-index:1"></div>' : '');
    return new Promise(resolve => {
      const p = new YT.Player(el.firstChild.firstChild, {
        videoId, width: '100%', height: '100%', host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 0, controls: o.controls ? 1 : 0, mute: o.muted ? 1 : 0, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
        events: {
          onReady: () => { if (o.muted) p.mute(); if (o.autoplay) p.playVideo(); resolve(p); },
          onStateChange: e => {
            if (e.data === YT.PlayerState.PLAYING && o.onPlaying) o.onPlaying(p);
            if (e.data === YT.PlayerState.ENDED) { if (o.loop) { p.seekTo(0); p.playVideo(); } else if (o.onEnd) o.onEnd(p); }
          },
          // Fires when the uploader blocks embedding or the video is region-locked: skip to something else
          onError: () => { if (o.onError) o.onError(p); },
        },
      });
      const f = el.querySelector('iframe');
      if (f) { f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0'; }
    });
  }

  const thumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;       // 4:3 with bars, always exists
  const tall = id => `https://i.ytimg.com/vi/${id}/oar2.jpg`;             // 9:16, exists for most Shorts
  const flag = country => FLAGS[country] || '⚽';

  window.Reel = { load, player, thumb, tall, flag, esc, ago, FLAGS, GEO, apiReady };
})();
