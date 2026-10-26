// the drawings are in components/SpriteArt.js, size is in stage units.
// hitbox is the part of the 100x100 art box that's actually drawn (same units as the
// SVG viewBox, y down). The art has empty margins, so using the whole box made sprites
// "collide" while there was still a visible gap between them.
export const COSTUMES = {
  cat: { label: "Cat", size: 76, hitbox: { left: 9, top: 8, right: 92, bottom: 90 } },
  dog: { label: "Dog", size: 76, hitbox: { left: 13, top: 19, right: 94, bottom: 90 } },
  robot: { label: "Robot", size: 70, hitbox: { left: 16, top: 2, right: 84, bottom: 92 } },
};
export const COSTUME_IDS = Object.keys(COSTUMES);
