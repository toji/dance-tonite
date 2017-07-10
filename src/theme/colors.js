import { Color } from '../lib/three';
import layout from '../room/layout';

const green = new Color(0x55b848);
const red = new Color(0xef4f36);
const orange = new Color(0xd19c20);
const purple = new Color(0xcc44b9);
const blue = new Color(0x40a598);
const pink = new Color(0xc95fbf);
const white = new Color(0xffffff);
const yellow = new Color(0xffff00);
const gray = new Color(0x646262);

const pairs = ([
  [green, red],
  [orange, purple],
  [blue, red],
  [pink, orange],
  [red, blue],
  [green, purple],
  [orange, blue],
  [pink, green],
  [blue, orange],
  [green, red],
  [pink, blue],
  [red, orange],
]);

const pairCount = pairs.length;

const pairByRoomIndex = (roomIndex) => {
  const [x, y, z] = layout.getRoom(roomIndex);
  return pairs[(x + Math.ceil(Math.abs(y)) + z) % pairCount];
};

export const getRoomColor = roomIndex => pairByRoomIndex(roomIndex)[0];
export const getRoomColorByIndex = index => pairs[index % pairs.length][0];
export const getCostumeColor = roomIndex => pairByRoomIndex(roomIndex)[1];

export const recordCostumeColor = white;
export const waitRoomColor = gray;
export const orbColor = yellow;
export const highlightColor = white;
export const textColor = yellow;
export const controllerButtonColor = yellow;
