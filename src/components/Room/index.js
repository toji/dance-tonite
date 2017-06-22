/** @jsx h */
import { h, Component } from 'preact';

import audio from '../../audio';
import viewer from '../../viewer';
import Room from '../../room';
import layout from '../../room/layout';
import feature from '../../utils/feature';
import { waitRoomColor, getRoomColor } from '../../theme/colors';
import recording from '../../recording';

import RecordOrbs from '../RecordOrbs';

const state = {};

export default class RoomComponent extends Component {
  constructor() {
    super();
    this.performOrbLeftRoom = this.performOrbLeftRoom.bind(this);
    this.performOrbEnteredRoom = this.performOrbEnteredRoom.bind(this);
    this.receiveOrb = this.receiveOrb.bind(this);
    this.tick = this.tick.bind(this);
  }

  getChildContext() {
    return this.state;
  }

  componentDidMount() {
    this.mounted = true;
    this.asyncMount(this.props);
    const { roomId } = this.props;
    this.roomColor = getRoomColor(roomId);
  }

  componentWillUnmount() {
    this.mounted = false;
    viewer.camera.position.copy(state.originalCameraPosition);
    viewer.camera.zoom = state.originalZoom;
    viewer.camera.updateProjectionMatrix();
    audio.reset();
    audio.fadeOut();
    if (this.state.room) {
      this.state.room.destroy();
    }
    viewer.camera.position.y = 0;
    viewer.camera.updateProjectionMatrix();
    viewer.events.off('tick', this.tick);
  }

  async asyncMount({ roomId, id, record }) {
    Room.reset();
    state.originalCameraPosition = viewer.camera.position.clone();
    state.originalZoom = viewer.camera.zoom;
    if (!record) {
      viewer.switchCamera('orthographic');
      viewer.camera.position.y = 2;
      viewer.camera.position.z = 1.3;
      viewer.camera.updateProjectionMatrix();
      Room.rotate180();
    }

    await audio.load({
      src: `/public/sound/room-${layout.loopIndex(roomId - 1)}.${feature.isChrome ? 'ogg' : 'mp3'}`,
      loops: 2,
      loopOffset: 0.5,
    });
    if (!this.mounted) return;
    const room = new Room({
      id,
      index: roomId - 1,
      single: true,
      recording: record ? recording : null,
    });
    if (id) {
      audio.play();
      room.load();
    }
    this.setState({ room });
    viewer.events.on('tick', this.tick);
  }

  performOrbLeftRoom() {
    if (!this.state.room) return;
    this.state.room.changeColor(waitRoomColor);

    const { onOrbLeftRoom } = this.props;
    if (onOrbLeftRoom) {
      onOrbLeftRoom();
    }
  }

  performOrbEnteredRoom() {
    const { room } = this.state;
    if (!room) return;
    if (room && this.roomColor) {
      room.changeColor(this.roomColor);
    }

    const { onOrbEnteredRoom } = this.props;
    if (onOrbEnteredRoom) {
      onOrbEnteredRoom();
    }
  }

  receiveOrb(orb) {
    this.setState({ orb });
  }

  tick() {
    this.state.room.gotoTime(audio.time, this.props.layers);
  }

  render() {
    return (
      <div>
        {this.props.orbs &&
          <RecordOrbs
            onEnteredRoom={this.performOrbEnteredRoom}
            onLeftRoom={this.performOrbLeftRoom}
            onCreatedOrb={this.receiveOrb}
            reversed={this.props.reverseOrbs}
          />
        }
        {this.props.children}
      </div>
    );
  }
}