export const EDGE_WAIT = 200;
export const GESTURE_GAP = 160;
export const TRANSITION_DURATION = 1000;

// At a document edge, wait 200ms and require a fresh gesture. Trackpad
// momentum therefore cannot carry the reader into an unread page.
export class PageNavigation {
  constructor(count, index = 0) {
    this.count = count;
    this.index = index;
    this.lockUntil = 0;
    this.lastInput = -Infinity;
    this.edge = null;
    this.shortForwardArmed = false;
  }

  resetEdge() { this.edge = null; this.shortForwardArmed = false; }

  observe(top, max, now) {
    if (max > 2) this.shortForwardArmed = false;
    const direction = max <= 2 ? 0 : top <= 2 ? -1 : top >= max - 2 ? 1 : null;
    if (direction === null) this.edge = null;
    else if (!this.edge || this.edge.direction !== direction) this.edge = { direction, since: now };
  }

  move(index, now) {
    if (now < this.lockUntil || index < 0 || index >= this.count || index === this.index) return false;
    this.index = index;
    this.lockUntil = now + TRANSITION_DURATION;
    this.resetEdge();
    return true;
  }

  vertical(direction, { top, max, now, fresh = null, confirmShortForward = true }) {
    const newGesture = fresh ?? now - this.lastInput > GESTURE_GAP;
    this.lastInput = now;
    if (now < this.lockUntil) return 'wait';
    const atEdge = direction > 0 ? top >= max - 2 : top <= 2;
    if (!atEdge) { this.resetEdge(); return 'scroll'; }
    if (direction < 0 || max > 2) this.shortForwardArmed = false;
    // Separate gestures count; multiple events from one wheel/trackpad motion do not.
    if (max <= 2) {
      if (!newGesture) return 'wait';
      if (direction > 0 && confirmShortForward && !this.shortForwardArmed) {
        this.shortForwardArmed = true;
        return 'wait';
      }
      return this.move(this.index + direction, now) ? 'page' : 'wait';
    }
    if (!this.edge || this.edge.direction !== direction) this.edge = { direction, since: now };
    if (now - this.edge.since < EDGE_WAIT || !newGesture) return 'wait';
    return this.move(this.index + direction, now) ? 'page' : 'wait';
  }
}
