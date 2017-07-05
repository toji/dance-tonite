import easeBackInOut from 'eases/back-in-out';
import easeBounceOut from 'eases/bounce-out';

import * as THREE from '../lib/three';

import props from '../props';
import {
  tempVector,
  setIdentityMatrix,
  set180RotationMatrix,
  worldToScreen,
} from '../utils/three';
import windowSize from '../utils/windowSize';
import viewer from '../viewer';
import settings from '../settings';
import {
  getCostumeColor,
  getRoomColor,
  highlightColor,
  waitRoomColor,
} from '../theme/colors';

import layout from './layout';
import dummyTextureUrl from '../public/dummy.png';
import InstancedItem from '../instanced-item';
import Frames from './frames';
import { createPose } from '../utils/serializer';
import audio from '../audio';
import { elasticIn } from '../utils/easing';

let items;

const roomOffset = new THREE.Vector3(0, settings.roomHeight * 0.5, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

const debugMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0, 0, 0),
  new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load(dummyTextureUrl),
  })
);
debugMesh.frustumCulled = false;

const POSE = createPose();
const LAST_POSE = createPose();
const FIRST_POSE = createPose();
const SHADOW_EULER = new THREE.Euler(Math.PI * 0.5, 0, 0);
const SHADOW_COLOR = new THREE.Color(0xffffff);

const lerpPose = (
  [positionA, quaternionA],
  [positionB, quaternionB],
  ratio,
  quaternionRatio = ratio,
) => {
  if (ratio === 0) return;
  positionA.lerp(positionB, ratio);
  quaternionA.slerp(quaternionB, quaternionRatio);
};

export default class Room {
  constructor(params) {
    const {
      id,
      recording,
      index,
      colorIndex = params.index,
      single = false,
      wall = false,
      morph = true,
      isGiffing = false,
    } = params;
    this.morph = morph;
    this._worldPosition = new THREE.Vector3();
    this.index = params.single ? 0 : index;
    this.insideMegaGrid = layout.insideMegaGrid(this.index);
    this.single = single;
    const frames = this.frames = new Frames(id, recording);
    this.firstFrame = frames.getFrame(0);
    this.lastFrame = frames.getFrame((settings.loopDuration * 2) - 0.001);
    this.frame = frames.getFrame();
    this.costumeColor = getCostumeColor(colorIndex);
    const roomColor = this.roomColor = getRoomColor(colorIndex);
    this.position = layout.getPosition(
      index,
      new THREE.Vector3(),
      single
    );

    const position = tempVector()
      .add(this.position)
      .add(roomOffset);
    position.y -= 1;
    const type = layout.getType(index);
    if (type === 'PLANE') return;
    items.room.add([position, null], roomColor);
    if (single || wall || layout.hasWall(index)) {
      items.wall.add([position, null], roomColor);
    }
    Room.isGiffing = isGiffing;
  }

  load(callback) {
    this.frames.load(callback);
  }

  get worldPosition() {
    return this._worldPosition
      .copy(this.position)
      .applyMatrix4(InstancedItem.group.matrix);
  }

  isHighlighted(performance) {
    return Room.highlight.roomIndex === this.index
      && Room.highlight.performanceIndex === performance;
  }

  changeColorToWaiting() {
    this.changeColor(waitRoomColor);
  }

  changeColorToRecording() {
    this.changeColor(this.roomColor);
  }

  changeColor(color) {
    items.room.changeColor(this.index, color);
    items.wall.changeColor(this.index, color);
  }

  getHeadPosition(index, applyMatrix = true) {
    return this.frame.getHeadPose(index, this.position, applyMatrix)[0];
  }

  transformToHead(object, layerIndex) {
    const [position, rotation] = this.getPose(
      layerIndex,
      0,
      this.position,
      false
    );
    object.position.copy(position);
    object.quaternion.copy(rotation);
  }

  // To be used in orthographic mode:
  isVisibleOnScreen() {
    const coords = this.getScreenCoordinates();
    return coords.x > 0 && coords.x < windowSize.width;
  }

  getScreenCoordinates() {
    return worldToScreen(viewer.camera, this.worldPosition);
  }

  gotoTime(seconds, maxLayers, highlightLast = false) {
    this.currentTime = seconds;
    // In orthographic mode, scale up the meshes:
    const scale = InstancedItem.perspectiveMode ? 1 : 1.3;

    const { position, frame, costumeColor } = this;
    frame.gotoTime(seconds, maxLayers);
    const { hideHead } = this.frames;
    for (let i = 0; i < frame.count; i++) {
      const isLast = i === frame.count - 1;
      const color = ((highlightLast && isLast) || this.isHighlighted(i))
        ? highlightColor
        : costumeColor;
      if (!hideHead) {
        const pose = this.getPose(i, 0, position);
        items.head.add(pose, color, scale);

        this.setShadowPose(pose, position, i);
      }

      const rhandPose = this.getPose(i, 1, position);
      items.hand.add(rhandPose, color, scale);
      this.setShadowPose(rhandPose, position, i, 1, 0.15);

      const lhandPose = this.getPose(i, 2, position);
      items.hand.add(lhandPose, color, scale);
      this.setShadowPose(lhandPose, position, i, 2, 0.15);
    }
  }

  getPose(performanceIndex, limbIndex, offset, applyMatrix = false) {
    const { frame } = this;
    frame.getPose(performanceIndex, limbIndex, offset, applyMatrix, POSE);

    // Morph the beginning of the first performance with the end of the last:
    if (this.morph && performanceIndex === 0) {
      this.lastFrame.getPose(frame.count - 1, limbIndex, offset, applyMatrix, LAST_POSE);
      const overlapRatio = (Math.min(0.2, frame.loopRatio)) / 0.2;
      const rotationRatio = (Math.min(0.05, frame.loopRatio)) / 0.05;
      lerpPose(
        POSE,
        LAST_POSE,
        easeBackInOut(1 - overlapRatio),
        easeBackInOut(1 - rotationRatio)
      );
    }

    if (this.insideMegaGrid && !this.single) {
      this.risePerformance(performanceIndex, limbIndex, offset, applyMatrix);
      this.dropPerformance(performanceIndex);
    }
    return POSE;
  }

  setShadowPose(copyPose, position, index, sub = 0, customScale = 1) {
    const headDist = copyPose[0].y;

    const shadowPose = this.getPose(index, sub, position);
    shadowPose[0].y = 0.1;
    shadowPose[1].setFromEuler(SHADOW_EULER);

    const shadowPower = 1.5 / (headDist ** 2);
    const shadowSize = Math.min(Math.max(shadowPower * customScale, 0.8), 1.0);
    const shadowDarkness = Math.min(Math.max(shadowPower, 0.0), 0.4);
    SHADOW_COLOR.setRGB(shadowDarkness, shadowDarkness, shadowDarkness);
    items.shadow.add(copyPose, SHADOW_COLOR, shadowSize);
  }

  dropPerformance(performanceIndex) {
    if (audio.time < settings.dropTime) return;
    const ratio = Math.max(0,
      Math.min(1,
        audio.time - settings.dropTime - (this.index + performanceIndex) * -0.005
      )
    );
    if (ratio === 0) return;
    const [position] = POSE;
    position.y *= 1 - easeBounceOut(ratio);
  }

  risePerformance(performanceIndex, limbIndex, offset, applyMatrix) {
    const ratio = Math.max(0,
      Math.min(5,
        audio.time - this.riseTime - this.index * -0.005
      )
    ) * 0.2;
    if (ratio === 0) {
      this.firstFrame.getPose(performanceIndex, limbIndex, offset, applyMatrix, POSE);
      const [position, quaternion] = POSE;
      position.y *= ratio;
      quaternion.setFromAxisAngle(X_AXIS, Math.PI / 2);
    } else {
      this.firstFrame.getPose(performanceIndex, limbIndex, offset, applyMatrix, FIRST_POSE);
      const [position, quaternion] = FIRST_POSE;
      position.y *= ratio;
      quaternion.setFromAxisAngle(X_AXIS, Math.PI / 2);
      lerpPose(POSE, FIRST_POSE,
        ratio === 1
          ? 1 - ratio
          : elasticIn(1 - ratio)
      );
    }
  }

  destroy() {
    for (const i in items) {
      items[i].empty();
    }
    if (this.frames) this.frames.cancel();
  }
}

Room.clear = () => {
  if (!items) return;
  items.hand.empty();
  items.head.empty();
  items.shadow.empty();
};

Room.reset = () => {
  InstancedItem.reset();
  Room.setHighlight();
  setIdentityMatrix(InstancedItem.group);

  if (!items) {
    items = {
      wall: new InstancedItem(
        layout.roomCount,
        props.perspectiveWall,
        props.orthographicWall
      ),
      room: new InstancedItem(
        layout.roomCount,
        props.perspectiveRoom,
        props.orthographicRoom
      ),
      head: new InstancedItem(
        layout.roomCount * 10,
        props.head,
      ),
      hand: new InstancedItem(
        layout.roomCount * 10 * 2,
        props.hand,
      ),
      shadow: new InstancedItem(
        layout.roomCount * 30,
        props.shadow,
      ),
    };
  }
  // if (!Room.isGiffing) viewer.scene.add(roomsGroup);

  // Move an extra invisible object3d with a texture to the end of scene's children
  // array in order to solve a texture glitch as described in:
  // https://github.com/puckey/you-move-me/issues/129
  if (!Room.isGiffing) viewer.scene.add(debugMesh);
};

Room.rotate180 = () => {
  set180RotationMatrix(InstancedItem.group);
};

Room.highlight = {};

Room.setHighlight = (highlight) => {
  if (highlight) {
    const [room, performance] = highlight;
    Room.highlight.roomIndex = room;
    Room.highlight.performanceIndex = performance;
  } else {
    Room.highlight.roomIndex = null;
    Room.highlight.performanceIndex = null;
  }
};

Room.getGroup = () => InstancedItem.group;
