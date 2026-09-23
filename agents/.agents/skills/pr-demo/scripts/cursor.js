// Demo cursor. A screencast contains no OS pointer, and driving a page with
// element.click() produces no pointer events at all, so a recording shows state
// changing with nothing to say what caused it. This draws a pointer, moves it to
// whatever is about to be clicked or hovered, and flashes a ring on click.
//
// Install AFTER `record start` (it opens a fresh page) and re-inject after any
// full page load. Client-side route changes keep it.
(() => {
  if (window.__demoCursor) return 'already installed';

  const MOVE_MS = 260;

  const dot = document.createElement('div');
  dot.style.cssText =
    'position:fixed;z-index:2147483646;left:0;top:0;width:22px;height:22px;' +
    'margin:-3px 0 0 -3px;pointer-events:none;opacity:0;' +
    'transition:transform ' + MOVE_MS + 'ms cubic-bezier(.22,.61,.36,1),opacity 150ms;' +
    // Arrow pointer, white-stroked so it reads on both light panels and dark charts.
    "background:no-repeat center/contain url(\"data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">' +
        '<path d="M5 2l14 11h-7l3.5 7-3 1.4L9 14.6 5 18z" fill="%23111827" stroke="%23fff" stroke-width="1.6" stroke-linejoin="round"/>' +
      '</svg>',
    ) + "\")";
  document.body.appendChild(dot);

  let at = { x: -60, y: -60 };
  const moveTo = (x, y) => {
    at = { x, y };
    dot.style.opacity = '1';
    dot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  };

  const centre = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // Expanding ring at the click point, so a click is visible even when the thing
  // it changes is somewhere else on the page.
  //
  // Stepped by a timer rather than a CSS transition, on purpose. The obvious
  // version — append the node, then set the end state inside requestAnimationFrame
  // — does not animate here: without a forced reflow between the two the browser
  // coalesces them, the ring jumps straight to its end state (scaled out and
  // almost transparent) and no frame of the recording ever shows it. A DOM probe
  // still reports the element, at full size, which makes it look like it worked.
  // Stepping the geometry from JS has no such failure mode, and 90ms steps line
  // up with the 10fps capture.
  const RING_STEPS = 10;
  const RING_MS = 90;
  const ring = (x, y) => {
    const r = document.createElement('div');
    const size = (n) => {
      const s = 26 + n * 7;
      r.style.width = s + 'px';
      r.style.height = s + 'px';
      r.style.margin = -s / 2 + 'px 0 0 ' + -s / 2 + 'px';
    };
    r.style.cssText =
      'position:fixed;z-index:2147483645;left:' + x + 'px;top:' + y + 'px;' +
      'border-radius:50%;pointer-events:none;border:3px solid #4f46e5;' +
      'background:#6366f166;box-shadow:0 0 0 2px #ffffffcc';
    size(0);
    document.body.appendChild(r);
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      size(n);
      // Held near-opaque for most of the run, then dropped. Fading early just
      // hands the encoder a low-contrast shape to throw away.
      if (n > RING_STEPS - 3) r.style.opacity = String(1 - (n - (RING_STEPS - 3)) / 3);
      if (n >= RING_STEPS) { clearInterval(t); r.remove(); }
    }, RING_MS);
  };

  // The pointer itself dips on click. Cheap, and it reads even if the ring lands
  // over a dark chart where the indigo is less obvious.
  const press = () => {
    dot.style.transition = 'none';
    dot.style.transform = 'translate(' + at.x + 'px,' + at.y + 'px) scale(.72)';
    setTimeout(() => {
      dot.style.transition = 'transform ' + MOVE_MS + 'ms cubic-bezier(.22,.61,.36,1),opacity 150ms';
      dot.style.transform = 'translate(' + at.x + 'px,' + at.y + 'px)';
    }, 140);
  };

  // Move first, land the ring when the pointer arrives, so the two read as one gesture.
  const point = (el, withRing) => {
    const c = el && el.nodeType === 1 ? centre(el) : null;
    if (!c) return;
    const far = Math.hypot(c.x - at.x, c.y - at.y) > 4;
    moveTo(c.x, c.y);
    if (withRing) setTimeout(() => { ring(c.x, c.y); press(); }, far ? MOVE_MS : 0);
  };

  // Synthetic clicks: element.click() dispatches an event but moves no pointer.
  const nativeClick = HTMLElement.prototype.click;
  HTMLElement.prototype.click = function () {
    try { point(this, true); } catch { /* visual only */ }
    return nativeClick.apply(this, arguments);
  };

  // Real CDP input (agent-browser click / hover) arrives as trusted events.
  addEventListener('pointerdown', (e) => { if (e.isTrusted) point(e.target, true); }, true);
  addEventListener('mouseover', (e) => { if (e.isTrusted) point(e.target, false); }, true);

  window.__demoCursor = true;
  return 'cursor installed';
})()
